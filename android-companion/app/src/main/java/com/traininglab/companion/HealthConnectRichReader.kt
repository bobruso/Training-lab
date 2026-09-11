package com.traininglab.companion

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.CyclingPedalingCadenceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.ExerciseRoute
import androidx.health.connect.client.records.ExerciseRouteResult
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.PowerRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.StepsCadenceRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.TreeMap

class HealthConnectRichReader(private val client: HealthConnectClient) {
    companion object {
        fun optionalPermissions(): Set<String> = setOf(
            HealthPermission.getReadPermission(SpeedRecord::class),
            HealthPermission.getReadPermission(ElevationGainedRecord::class),
            HealthPermission.getReadPermission(StepsCadenceRecord::class),
            HealthPermission.getReadPermission(CyclingPedalingCadenceRecord::class),
            HealthPermission.getReadPermission(PowerRecord::class),
        )
    }

    private data class Point(
        val tMs: Long,
        var lat: Double? = null,
        var lon: Double? = null,
        var altitudeM: Double? = null,
        var speedKmh: Double? = null,
        var hr: Double? = null,
        var cadenceSpm: Double? = null,
        var cyclingCadenceRpm: Double? = null,
        var powerW: Double? = null,
    )

    private fun key(time: Instant): Long = time.toEpochMilli() / 1000L
    private fun point(points: TreeMap<Long, Point>, time: Instant): Point {
        val second = key(time)
        return points.getOrPut(second) { Point(second * 1000L) }
    }
    private fun sameOrigin(packageName: String, recordPackageName: String): Boolean =
        packageName.isNotBlank() && packageName == recordPackageName

    private fun downsample(values: List<JSONObject>, limit: Int): JSONArray {
        if (values.size <= limit) return JSONArray(values)
        val step = values.size.toDouble() / limit.toDouble()
        val out = JSONArray()
        var cursor = 0.0
        while (out.length() < limit && cursor < values.size) {
            out.put(values[cursor.toInt().coerceIn(0, values.lastIndex)])
            cursor += step
        }
        return out
    }

    private fun addRoute(route: ExerciseRoute, points: TreeMap<Long, Point>, routePoints: MutableList<JSONObject>) {
        route.route.sortedBy { it.time }.forEach { loc ->
            val p = point(points, loc.time)
            p.lat = loc.latitude
            p.lon = loc.longitude
            p.altitudeM = loc.altitude?.inMeters
            routePoints += JSONObject()
                .put("t", loc.time.toEpochMilli())
                .put("lat", loc.latitude)
                .put("lon", loc.longitude)
                .also { if (loc.altitude != null) it.put("altitude_m", loc.altitude!!.inMeters) }
                .also { if (loc.horizontalAccuracy != null) it.put("horizontal_accuracy_m", loc.horizontalAccuracy!!.inMeters) }
                .also { if (loc.verticalAccuracy != null) it.put("vertical_accuracy_m", loc.verticalAccuracy!!.inMeters) }
        }
    }

    suspend fun read(session: ExerciseSessionRecord, routeOverride: ExerciseRoute? = null): JSONObject {
        val origin = session.metadata.dataOrigin.packageName
        val range = TimeRangeFilter.between(session.startTime, session.endTime)
        val points = TreeMap<Long, Point>()
        val capabilities = JSONObject()

        val hrSamples = runCatching {
            client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records
                .filter { sameOrigin(origin, it.metadata.dataOrigin.packageName) }
                .flatMap { it.samples }
        }.getOrDefault(emptyList())
        hrSamples.forEach { point(points, it.time).hr = it.beatsPerMinute.toDouble() }
        capabilities.put("heart_rate", hrSamples.isNotEmpty()).put("hr_samples", hrSamples.size)

        val speedSamples = runCatching {
            client.readRecords(ReadRecordsRequest(SpeedRecord::class, range)).records
                .filter { sameOrigin(origin, it.metadata.dataOrigin.packageName) }
                .flatMap { it.samples }
        }.getOrDefault(emptyList())
        speedSamples.forEach { point(points, it.time).speedKmh = it.speed.inKilometersPerHour }
        capabilities.put("speed", speedSamples.isNotEmpty()).put("speed_samples", speedSamples.size)

        val stepCadenceSamples = runCatching {
            client.readRecords(ReadRecordsRequest(StepsCadenceRecord::class, range)).records
                .filter { sameOrigin(origin, it.metadata.dataOrigin.packageName) }
                .flatMap { it.samples }
        }.getOrDefault(emptyList())
        stepCadenceSamples.forEach { point(points, it.time).cadenceSpm = it.rate }
        capabilities.put("step_cadence", stepCadenceSamples.isNotEmpty()).put("step_cadence_samples", stepCadenceSamples.size)

        val cyclingCadenceSamples = runCatching {
            client.readRecords(ReadRecordsRequest(CyclingPedalingCadenceRecord::class, range)).records
                .filter { sameOrigin(origin, it.metadata.dataOrigin.packageName) }
                .flatMap { it.samples }
        }.getOrDefault(emptyList())
        cyclingCadenceSamples.forEach { point(points, it.time).cyclingCadenceRpm = it.revolutionsPerMinute }
        capabilities.put("cycling_cadence", cyclingCadenceSamples.isNotEmpty()).put("cycling_cadence_samples", cyclingCadenceSamples.size)

        val powerSamples = runCatching {
            client.readRecords(ReadRecordsRequest(PowerRecord::class, range)).records
                .filter { sameOrigin(origin, it.metadata.dataOrigin.packageName) }
                .flatMap { it.samples }
        }.getOrDefault(emptyList())
        powerSamples.forEach { point(points, it.time).powerW = it.power.inWatts }
        capabilities.put("power", powerSamples.isNotEmpty()).put("power_samples", powerSamples.size)

        val elevationRecords = runCatching {
            client.readRecords(ReadRecordsRequest(ElevationGainedRecord::class, range)).records
                .filter { sameOrigin(origin, it.metadata.dataOrigin.packageName) }
        }.getOrDefault(emptyList())
        val elevationGainM = elevationRecords.sumOf { it.elevation.inMeters }
        capabilities.put("elevation", elevationRecords.isNotEmpty())

        val routePoints = mutableListOf<JSONObject>()
        val routeStatus = if (routeOverride != null) {
            addRoute(routeOverride, points, routePoints)
            "data"
        } else when (val routeResult = session.exerciseRouteResult) {
            is ExerciseRouteResult.Data -> {
                addRoute(routeResult.exerciseRoute, points, routePoints)
                "data"
            }
            is ExerciseRouteResult.ConsentRequired -> "consent_required"
            is ExerciseRouteResult.NoData -> "no_data"
            else -> "unknown"
        }
        capabilities.put("route", routeStatus).put("gps_samples", routePoints.size)
        capabilities.put("laps", session.laps.isNotEmpty()).put("lap_count", session.laps.size)
        capabilities.put("segments", session.segments.isNotEmpty()).put("segment_count", session.segments.size)

        val analysisPoints = points.values.map { p ->
            JSONObject().put("t", p.tMs)
                .also { if (p.lat != null) it.put("lat", p.lat) }
                .also { if (p.lon != null) it.put("lon", p.lon) }
                .also { if (p.altitudeM != null) it.put("altitude_m", p.altitudeM) }
                .also { if (p.speedKmh != null) it.put("speed", p.speedKmh) }
                .also { if (p.hr != null) it.put("hr", p.hr) }
                .also { if (p.cadenceSpm != null) it.put("cadence_spm", p.cadenceSpm) }
                .also { if (p.cyclingCadenceRpm != null) it.put("cycling_cadence_rpm", p.cyclingCadenceRpm) }
                .also { if (p.powerW != null) it.put("power_w", p.powerW) }
        }

        val laps = JSONArray().apply {
            session.laps.forEach { lap ->
                put(JSONObject().put("start", lap.startTime.toString()).put("end", lap.endTime.toString())
                    .also { if (lap.length != null) it.put("length_m", lap.length!!.inMeters) })
            }
        }
        val segments = JSONArray().apply {
            session.segments.forEach { segment ->
                put(JSONObject().put("start", segment.startTime.toString()).put("end", segment.endTime.toString())
                    .put("type", segment.segmentType).put("repetitions", segment.repetitions))
            }
        }

        val maxSpeed = speedSamples.maxOfOrNull { it.speed.inKilometersPerHour }
        val avgSpeed = speedSamples.map { it.speed.inKilometersPerHour }.takeIf { it.isNotEmpty() }?.average()
        val avgStepCadence = stepCadenceSamples.map { it.rate }.takeIf { it.isNotEmpty() }?.average()
        val avgCyclingCadence = cyclingCadenceSamples.map { it.revolutionsPerMinute }.takeIf { it.isNotEmpty() }?.average()
        val avgPower = powerSamples.map { it.power.inWatts }.takeIf { it.isNotEmpty() }?.average()
        val maxPower = powerSamples.maxOfOrNull { it.power.inWatts }

        val completeness = when {
            routePoints.size >= 20 && speedSamples.size >= 20 && hrSamples.size >= 20 -> "full"
            routePoints.size >= 20 && hrSamples.size >= 20 -> "good"
            speedSamples.size >= 20 || hrSamples.size >= 20 -> "partial"
            else -> "basic"
        }

        return JSONObject()
            .put("route_status", routeStatus)
            .put("route_points", downsample(routePoints, 5000))
            .put("analysis_points", downsample(analysisPoints, 5000))
            .put("health_connect_capabilities", capabilities)
            .put("data_completeness", completeness)
            .put("laps", laps)
            .put("segments", segments)
            .put("elevation_gain_m", elevationGainM)
            .also { if (maxSpeed != null) it.put("max_speed_kmh", maxSpeed) }
            .also { if (avgSpeed != null) it.put("avg_speed_kmh", avgSpeed) }
            .also { if (avgStepCadence != null) it.put("avg_step_cadence_spm", avgStepCadence) }
            .also { if (avgCyclingCadence != null) it.put("avg_cycling_cadence_rpm", avgCyclingCadence) }
            .also { if (avgPower != null) it.put("avg_power_w", avgPower) }
            .also { if (maxPower != null) it.put("max_power_w", maxPower) }
    }
}
