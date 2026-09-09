package com.traininglab.companion

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val client by lazy { HealthConnectClient.getOrCreate(this) }
    private var pendingToken: String? = null
    private var pendingSupabaseUrl: String? = null
    private var syncing = false
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val backendUrl = "https://nnpvklaxhomarxszlclt.supabase.co"

    private fun trusted(uri: Uri): Boolean = uri.scheme == "https" && uri.host == "bobruso.github.io" &&
        (uri.port == -1 || uri.port == 443) && uri.path?.startsWith("/Training-lab/") == true

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileChooserCallback ?: return@registerForActivityResult
        val uris = if (result.resultCode == Activity.RESULT_OK) {
            val parsed = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
                ?: result.data?.data?.let { arrayOf(it) }
            parsed?.forEach { uri ->
                runCatching {
                    contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }
            parsed
        } else null
        callback.onReceiveValue(uris)
        fileChooserCallback = null
    }

    private val permissions = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    )

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) {
        lifecycleScope.launch {
            val granted = client.permissionController.getGrantedPermissions()
            if (granted.containsAll(permissions)) doSync()
            else {
                pendingToken = null
                syncing = false
                sendError("Faltan permisos de Health Connect.")
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = true

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (trusted(request.url)) return false
                    if (request.isForMainFrame && request.url.scheme == "https") {
                        runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    }
                    return true
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback ?: return false

                    // FIT files often have no reliable MIME type on Android. Force the
                    // Storage Access Framework / Documents picker instead of Gallery.
                    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                    }
                    return try {
                        fileChooserLauncher.launch(Intent.createChooser(intent, "Selecciona un archivo .FIT"))
                        true
                    } catch (_: Exception) {
                        fileChooserCallback?.onReceiveValue(null)
                        fileChooserCallback = null
                        false
                    }
                }
            }

            addJavascriptInterface(WebBridge(), "TrainingLabAndroid")
        }
        setContentView(webView)
        loadInitialUrl(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        loadInitialUrl(intent)
    }

    private fun loadInitialUrl(intent: Intent?) {
        val uri = intent?.data
        if (uri?.scheme == "traininglab" && uri.host == "auth") {
            val suffix = buildString {
                if (!uri.encodedQuery.isNullOrBlank()) append("?").append(uri.encodedQuery)
                if (!uri.encodedFragment.isNullOrBlank()) append("#").append(uri.encodedFragment)
            }
            webView.loadUrl(getString(R.string.training_lab_url) + suffix)
        } else {
            webView.loadUrl(getString(R.string.training_lab_url))
        }
    }

    inner class WebBridge {
        @JavascriptInterface
        fun syncHealthConnect(accessToken: String, supabaseUrl: String) {
            lifecycleScope.launch {
                if (!trusted(Uri.parse(webView.url ?: "")) || supabaseUrl != backendUrl) {
                    sendError("Origen de sincronización no permitido.")
                    return@launch
                }
                if (syncing) return@launch
                syncing = true
                pendingToken = accessToken
                pendingSupabaseUrl = backendUrl
                val status = HealthConnectClient.getSdkStatus(this@MainActivity)
                if (status != HealthConnectClient.SDK_AVAILABLE) {
                    pendingToken = null
                    syncing = false
                    sendError("Health Connect no está disponible en este dispositivo.")
                    return@launch
                }
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(permissions)) {
                    runOnUiThread { requestPermissions.launch(permissions) }
                } else doSync()
            }
        }
    }

    private suspend fun doSync() {
        try {
            val now = Instant.now()
            val sleepStart = now.minus(Duration.ofDays(14))
            val workoutStart = now.minus(Duration.ofDays(30))

            val sleepRecords = client.readRecords(
                ReadRecordsRequest(
                    SleepSessionRecord::class,
                    TimeRangeFilter.between(sleepStart, now)
                )
            ).records

            val hrvRecords = client.readRecords(
                ReadRecordsRequest(
                    HeartRateVariabilityRmssdRecord::class,
                    TimeRangeFilter.between(sleepStart, now)
                )
            ).records

            val restingRecords = client.readRecords(
                ReadRecordsRequest(
                    RestingHeartRateRecord::class,
                    TimeRangeFilter.between(sleepStart, now)
                )
            ).records

            val sleepJson = JSONArray()
            val groupedSleep = sleepRecords.groupBy {
                it.endTime.atZone(ZoneId.systemDefault()).toLocalDate()
            }
            for ((day, sessionsForDay) in groupedSleep) {
                val main = sessionsForDay.maxByOrNull { Duration.between(it.startTime, it.endTime) } ?: continue
                fun minutesOf(type: Int) = main.stages.filter { it.stage == type }
                    .sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }

                val deep = minutesOf(SleepSessionRecord.STAGE_TYPE_DEEP)
                val rem = minutesOf(SleepSessionRecord.STAGE_TYPE_REM)
                val light = minutesOf(SleepSessionRecord.STAGE_TYPE_LIGHT)
                val generic = minutesOf(SleepSessionRecord.STAGE_TYPE_SLEEPING)
                val stagedSleep = deep + rem + light + generic
                val totalSleep = if (stagedSleep > 0) stagedSleep else Duration.between(main.startTime, main.endTime).toMinutes()

                val hrv = hrvRecords.filter { it.time >= main.startTime && it.time <= main.endTime }
                    .map { it.heartRateVariabilityMillis }
                    .takeIf { it.isNotEmpty() }?.average()

                val resting = restingRecords.filter {
                    it.time >= main.startTime.minus(Duration.ofHours(3)) &&
                        it.time <= main.endTime.plus(Duration.ofHours(3))
                }.map { it.beatsPerMinute }.takeIf { it.isNotEmpty() }?.average()

                val naps = JSONArray()
                sessionsForDay.filter { it.metadata.id != main.metadata.id }.forEach { nap ->
                    naps.put(
                        JSONObject()
                            .put("start", nap.startTime.toString())
                            .put("end", nap.endTime.toString())
                            .put("duration_min", Duration.between(nap.startTime, nap.endTime).toMinutes())
                            .put("source_app", nap.metadata.dataOrigin.packageName)
                    )
                }

                val o = JSONObject()
                    .put("external_id", main.metadata.id)
                    .put("source_app", main.metadata.dataOrigin.packageName)
                    .put("sleep_date", day.toString())
                    .put("sleep_start", main.startTime.toString())
                    .put("sleep_end", main.endTime.toString())
                    .put("total_sleep_min", totalSleep)
                    .put("deep_sleep_min", deep)
                    .put("rem_sleep_min", rem)
                    .put("light_sleep_min", light)
                    .put("naps", naps)
                if (hrv != null) o.put("avg_hrv", hrv)
                if (resting != null) o.put("resting_hr", resting.toInt())
                sleepJson.put(o)
            }

            val sessions = client.readRecords(
                ReadRecordsRequest(
                    ExerciseSessionRecord::class,
                    TimeRangeFilter.between(workoutStart, now)
                )
            ).records

            val activitiesJson = JSONArray()
            for (s in sessions) {
                val hr = client.readRecords(
                    ReadRecordsRequest(
                        HeartRateRecord::class,
                        TimeRangeFilter.between(s.startTime, s.endTime)
                    )
                ).records.flatMap { it.samples }.map { it.beatsPerMinute }

                val distances = client.readRecords(
                    ReadRecordsRequest(
                        DistanceRecord::class,
                        TimeRangeFilter.between(s.startTime, s.endTime)
                    )
                ).records.sumOf { it.distance.inKilometers }

                val calories = client.readRecords(
                    ReadRecordsRequest(
                        TotalCaloriesBurnedRecord::class,
                        TimeRangeFilter.between(s.startTime, s.endTime)
                    )
                ).records.sumOf { it.energy.inKilocalories }

                val type = when (s.exerciseType) {
                    ExerciseSessionRecord.EXERCISE_TYPE_SOCCER -> "football"
                    ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
                    ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "run"
                    ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                    ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "gym"
                    else -> "other"
                }

                val o = JSONObject()
                    .put("external_id", s.metadata.id)
                    .put("source_app", s.metadata.dataOrigin.packageName)
                    .put("activity_date", s.startTime.atZone(ZoneId.systemDefault()).toLocalDate().toString())
                    .put("started_at", s.startTime.toString())
                    .put("activity_type", type)
                    .put("title", s.title ?: "Health Connect")
                    .put("duration_min", Duration.between(s.startTime, s.endTime).seconds / 60.0)
                    .put("distance_km", distances)
                    .put("calories", calories.toInt())
                if (hr.isNotEmpty()) {
                    o.put("avg_hr", hr.average().toInt())
                    o.put("max_hr", hr.max())
                }
                activitiesJson.put(o)
            }

            val payload = JSONObject().put("sleep", sleepJson).put("activities", activitiesJson)
            val result = withContext(Dispatchers.IO) { postToSupabase(payload.toString()) }
            sendSuccess(result)
        } catch (_: Exception) {
            sendError("No se ha completado la sincronización. Comprueba permisos y conexión.")
        } finally {
            pendingToken = null
            pendingSupabaseUrl = null
            syncing = false
        }
    }

    private fun postToSupabase(json: String): String {
        val base = backendUrl
        val token = pendingToken ?: error("Falta sesión")
        val url = URL("$base/functions/v1/health-connect-ingest")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 15000
            readTimeout = 30000
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Content-Type", "application/json")
        }
        conn.outputStream.use { it.write(json.toByteArray()) }
        val body = (if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().use { it.readText() }
        if (conn.responseCode !in 200..299) error(body)
        return body
    }

    private fun sendSuccess(result: String) = runOnUiThread {
        webView.evaluateJavascript("window.healthConnectSyncFinished(${JSONObject.quote(result)})", null)
    }

    private fun sendError(message: String) = runOnUiThread {
        webView.evaluateJavascript("window.healthConnectSyncError(${JSONObject.quote(message)})", null)
    }
}
