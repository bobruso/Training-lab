package com.traininglab.companion

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.contracts.ExerciseRouteRequestContract
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseRoute
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
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val client by lazy { HealthConnectClient.getOrCreate(this) }
    private val richReader by lazy { HealthConnectRichReader(client) }
    private var pendingToken: String? = null
    private var pendingSupabaseUrl: String? = null
    private var syncing = false
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCameraUri: Uri? = null
    private var pendingSharedFit: String? = null
    private var pendingRouteSessionId: String? = null
    private val authorizedRoutes = mutableMapOf<String, ExerciseRoute>()
    private val backendUrl = "https://nnpvklaxhomarxszlclt.supabase.co"

    private val basePermissions = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    )
    private val requestedPermissions by lazy { basePermissions + HealthConnectRichReader.optionalPermissions() }

    private fun trusted(uri: Uri): Boolean = uri.scheme == "https" && uri.host == "bobruso.github.io" &&
        (uri.port == -1 || uri.port == 443) && uri.path?.startsWith("/Training-lab/") == true

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = fileChooserCallback ?: return@registerForActivityResult
        val uris = if (result.resultCode == Activity.RESULT_OK) {
            val parsed = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
                ?: result.data?.data?.let { arrayOf(it) }
                ?: pendingCameraUri?.let { arrayOf(it) }
            parsed?.forEach { uri ->
                if (uri != pendingCameraUri) runCatching {
                    contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }
            parsed
        } else null
        callback.onReceiveValue(uris)
        fileChooserCallback = null
        pendingCameraUri = null
    }

    private val requestPermissions = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        lifecycleScope.launch {
            if (granted.containsAll(basePermissions)) doSync() else {
                pendingToken = null
                syncing = false
                sendError("Faltan permisos básicos de Health Connect. Puedes negar velocidad, cadencia o potencia y la sincronización seguirá funcionando.")
            }
        }
    }

    private val exerciseRouteLauncher = registerForActivityResult(ExerciseRouteRequestContract()) { route ->
        val sessionId = pendingRouteSessionId
        pendingRouteSessionId = null
        if (sessionId != null && route != null) {
            authorizedRoutes[sessionId] = route
            runOnUiThread {
                webView.evaluateJavascript("window.healthConnectRouteAuthorized?.(${JSONObject.quote(sessionId)})", null)
            }
        } else {
            runOnUiThread {
                webView.evaluateJavascript("window.healthConnectRouteDenied?.()", null)
            }
        }
    }

    private fun launchFileChooser(params: WebChromeClient.FileChooserParams?): Boolean {
        val accepts = params?.acceptTypes?.map { it.trim().lowercase() }.orEmpty()
        val wantsImage = accepts.any { it == "image/*" || it.startsWith("image/") }
        if (!wantsImage) {
            pendingCameraUri = null
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            }
            return runCatching {
                fileChooserLauncher.launch(Intent.createChooser(intent, "Selecciona un archivo .FIT"))
                true
            }.getOrElse {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = null
                false
            }
        }

        val temp = runCatching { File.createTempFile("traininglab-food-", ".jpg", cacheDir) }.getOrNull()
        val cameraUri = temp?.let {
            runCatching { FileProvider.getUriForFile(this, "$packageName.fileprovider", it) }.getOrNull()
        }
        val cameraIntent = cameraUri?.let { uri ->
            Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
        }?.takeIf { it.resolveActivity(packageManager) != null }
        pendingCameraUri = if (cameraIntent != null) cameraUri else null

        if (params?.isCaptureEnabled == true && cameraIntent != null) {
            return runCatching { fileChooserLauncher.launch(cameraIntent); true }.getOrElse {
                pendingCameraUri = null
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = null
                false
            }
        }

        val gallery = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "image/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        }
        val chooser = Intent.createChooser(gallery, "Foto del plato").apply {
            if (cameraIntent != null) putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
        }
        return runCatching { fileChooserLauncher.launch(chooser); true }.getOrElse {
            pendingCameraUri = null
            fileChooserCallback?.onReceiveValue(null)
            fileChooserCallback = null
            false
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
                    if (request.isForMainFrame && request.url.scheme == "https") runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    return true
                }
                override fun onPageFinished(view: WebView, url: String?) {
                    super.onPageFinished(view, url)
                    val page = url ?: return
                    val uri = runCatching { Uri.parse(page) }.getOrNull() ?: return
                    if (!trusted(uri)) return
                    view.evaluateJavascript("""
                        (() => {
                          if (!navigator.onLine) return;
                          const build = document.querySelector('meta[name="build"]')?.content || '';
                          if (build === 'v10.1 · build foodai104') return;
                          const key = 'traininglab-native-bootstrap-10';
                          if (sessionStorage.getItem(key)) return;
                          sessionStorage.setItem(key, '1');
                          const base = new URL('./', location.href).href;
                          const unregister = ('serviceWorker' in navigator) ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.filter(r => r.scope.startsWith(base)).map(r => r.unregister()))) : Promise.resolve();
                          const clear = ('caches' in window) ? caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('training-lab-')).map(k => caches.delete(k)))) : Promise.resolve();
                          Promise.all([unregister, clear]).finally(() => location.replace('./?__native_bootstrap=10&ts=' + Date.now()));
                        })();
                    """.trimIndent(), null)
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(webView: WebView?, filePathCallback: ValueCallback<Array<Uri>>?, fileChooserParams: FileChooserParams?): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback ?: return false
                    return launchFileChooser(fileChooserParams)
                }
            }
            addJavascriptInterface(WebBridge(), "TrainingLabAndroid")
        }
        captureSharedFit(intent)
        setContentView(webView)
        loadInitialUrl(intent)
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); captureSharedFit(intent); loadInitialUrl(intent) }
    @Suppress("DEPRECATION")
    private fun sharedStream(intent: Intent): Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM) ?: intent.clipData?.getItemAt(0)?.uri
    private fun sharedDisplayName(uri: Uri): String {
        if (uri.scheme == "content") contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) { val i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (i >= 0) c.getString(i)?.takeIf { it.isNotBlank() }?.let { return it } } }
        return uri.lastPathSegment?.substringAfterLast('/')?.takeIf { it.isNotBlank() } ?: "coros-actividad.fit"
    }
    private fun captureSharedFit(intent: Intent?): Boolean {
        if (intent?.action != Intent.ACTION_SEND) return false
        val uri = sharedStream(intent) ?: run { pendingSharedFit = JSONObject().put("error", "Training Lab no ha recibido ningún archivo desde COROS.").toString(); return true }
        return try {
            val out = ByteArrayOutputStream()
            contentResolver.openInputStream(uri)?.use { input -> val buffer = ByteArray(8192); var total = 0; while (true) { val n = input.read(buffer); if (n <= 0) break; total += n; if (total > 20 * 1024 * 1024) error("El FIT supera el límite de 20 MB"); out.write(buffer, 0, n) } } ?: error("No se puede abrir el archivo compartido")
            val bytes = out.toByteArray(); if (bytes.size < 12 || String(bytes, 8, 4, Charsets.US_ASCII) != ".FIT") error("El archivo compartido no es un FIT válido")
            var name = sharedDisplayName(uri); if (!name.endsWith(".fit", ignoreCase = true)) name += ".fit"
            pendingSharedFit = JSONObject().put("name", name).put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP)).toString(); true
        } catch (e: Exception) { pendingSharedFit = JSONObject().put("error", "No se ha podido recibir el FIT: ${e.message ?: "archivo no válido"}").toString(); true }
    }

    private fun loadInitialUrl(intent: Intent?) {
        val uri = intent?.data
        if (uri?.scheme == "traininglab" && uri.host == "auth") {
            val suffix = buildString { if (!uri.encodedQuery.isNullOrBlank()) append("?").append(uri.encodedQuery); if (!uri.encodedFragment.isNullOrBlank()) append("#").append(uri.encodedFragment) }
            webView.loadUrl(getString(R.string.training_lab_url) + suffix)
        } else webView.loadUrl(getString(R.string.training_lab_url))
    }

    inner class WebBridge {
        @JavascriptInterface fun consumeSharedFit(): String { val payload = pendingSharedFit ?: return ""; pendingSharedFit = null; return payload }
        @JavascriptInterface fun syncHealthConnect(accessToken: String, supabaseUrl: String) {
            lifecycleScope.launch {
                if (!trusted(Uri.parse(webView.url ?: "")) || supabaseUrl != backendUrl) { sendError("Origen de sincronización no permitido."); return@launch }
                if (syncing) return@launch
                syncing = true; pendingToken = accessToken; pendingSupabaseUrl = backendUrl
                val status = HealthConnectClient.getSdkStatus(this@MainActivity)
                if (status != HealthConnectClient.SDK_AVAILABLE) { pendingToken = null; syncing = false; sendError("Health Connect no está disponible en este dispositivo."); return@launch }
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(basePermissions)) runOnUiThread { requestPermissions.launch(requestedPermissions) }
                else doSync()
            }
        }

        @JavascriptInterface fun requestExerciseRoute(sessionId: String) {
            if (sessionId.isBlank()) return
            runOnUiThread {
                val page = runCatching { Uri.parse(webView.url ?: "") }.getOrNull()
                if (page == null || !trusted(page)) return@runOnUiThread
                pendingRouteSessionId = sessionId
                runCatching { exerciseRouteLauncher.launch(sessionId) }
                    .onFailure { pendingRouteSessionId = null; sendError("No se pudo abrir el permiso de ruta GPS de Health Connect.") }
            }
        }

        @JavascriptInterface fun openHealthConnectSettings() {
            runOnUiThread {
                val page = runCatching { Uri.parse(webView.url ?: "") }.getOrNull()
                if (page == null || !trusted(page)) return@runOnUiThread
                runCatching { startActivity(Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)) }
                    .onFailure { sendError("No se pudieron abrir los ajustes de Health Connect.") }
            }
        }
    }

    private suspend fun doSync() {
        try {
            val now = Instant.now(); val sleepStart = now.minus(Duration.ofDays(14)); val workoutStart = now.minus(Duration.ofDays(30))
            val sleepRecords = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(sleepStart, now))).records
            val hrvRecords = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, TimeRangeFilter.between(sleepStart, now))).records
            val restingRecords = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, TimeRangeFilter.between(sleepStart, now))).records
            val sleepJson = JSONArray()
            val groupedSleep = sleepRecords.groupBy { it.endTime.atZone(ZoneId.systemDefault()).toLocalDate() }
            for ((day, sessionsForDay) in groupedSleep) {
                val main = sessionsForDay.maxByOrNull { Duration.between(it.startTime, it.endTime) } ?: continue
                fun minutesOf(type: Int) = main.stages.filter { it.stage == type }.sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }
                val deep=minutesOf(SleepSessionRecord.STAGE_TYPE_DEEP); val rem=minutesOf(SleepSessionRecord.STAGE_TYPE_REM); val light=minutesOf(SleepSessionRecord.STAGE_TYPE_LIGHT); val generic=minutesOf(SleepSessionRecord.STAGE_TYPE_SLEEPING); val stagedSleep=deep+rem+light+generic; val totalSleep=if(stagedSleep>0)stagedSleep else Duration.between(main.startTime,main.endTime).toMinutes()
                val hrv=hrvRecords.filter{it.time>=main.startTime&&it.time<=main.endTime}.map{it.heartRateVariabilityMillis}.takeIf{it.isNotEmpty()}?.average()
                val resting=restingRecords.filter{it.time>=main.startTime.minus(Duration.ofHours(3))&&it.time<=main.endTime.plus(Duration.ofHours(3))}.map{it.beatsPerMinute}.takeIf{it.isNotEmpty()}?.average()
                val naps=JSONArray();sessionsForDay.filter{it.metadata.id!=main.metadata.id}.forEach{nap->naps.put(JSONObject().put("start",nap.startTime.toString()).put("end",nap.endTime.toString()).put("duration_min",Duration.between(nap.startTime,nap.endTime).toMinutes()).put("source_app",nap.metadata.dataOrigin.packageName))}
                val o=JSONObject().put("external_id",main.metadata.id).put("source_app",main.metadata.dataOrigin.packageName).put("sleep_date",day.toString()).put("sleep_start",main.startTime.toString()).put("sleep_end",main.endTime.toString()).put("total_sleep_min",totalSleep).put("deep_sleep_min",deep).put("rem_sleep_min",rem).put("light_sleep_min",light).put("naps",naps);if(hrv!=null)o.put("avg_hrv",hrv);if(resting!=null)o.put("resting_hr",resting.toInt());sleepJson.put(o)
            }
            val sessions=client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class,TimeRangeFilter.between(workoutStart,now))).records
            val activitiesJson=JSONArray()
            val oneTimeRoutesUsed=mutableListOf<String>()
            for(s in sessions){
                val sourcePackage=s.metadata.dataOrigin.packageName
                val hr=runCatching{client.readRecords(ReadRecordsRequest(HeartRateRecord::class,TimeRangeFilter.between(s.startTime,s.endTime))).records.filter{it.metadata.dataOrigin.packageName==sourcePackage}.flatMap{it.samples}.map{it.beatsPerMinute}}.getOrDefault(emptyList())
                val distances=runCatching{client.readRecords(ReadRecordsRequest(DistanceRecord::class,TimeRangeFilter.between(s.startTime,s.endTime))).records.filter{it.metadata.dataOrigin.packageName==sourcePackage}.sumOf{it.distance.inKilometers}}.getOrDefault(0.0)
                val calories=runCatching{client.readRecords(ReadRecordsRequest(TotalCaloriesBurnedRecord::class,TimeRangeFilter.between(s.startTime,s.endTime))).records.filter{it.metadata.dataOrigin.packageName==sourcePackage}.sumOf{it.energy.inKilocalories}}.getOrDefault(0.0)
                val routeOverride=authorizedRoutes[s.metadata.id]
                val rich=richReader.read(s,routeOverride)
                if(routeOverride!=null)oneTimeRoutesUsed+=s.metadata.id
                val type=when(s.exerciseType){
                    ExerciseSessionRecord.EXERCISE_TYPE_SOCCER->"football"
                    ExerciseSessionRecord.EXERCISE_TYPE_BIKING,ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY->"cycling"
                    ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL->"run"
                    ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING->"gym"
                    else->"other"
                }
                val metrics=JSONObject()
                    .put("health_connect_exercise_type",s.exerciseType)
                    .put("health_connect_capabilities",rich.getJSONObject("health_connect_capabilities"))
                    .put("data_completeness",rich.getString("data_completeness"))
                    .put("route_status",rich.getString("route_status"))
                    .put("analysis_points",rich.getJSONArray("analysis_points"))
                    .put("laps",rich.getJSONArray("laps"))
                    .put("segments",rich.getJSONArray("segments"))
                listOf("avg_speed_kmh","max_speed_kmh","avg_step_cadence_spm","avg_cycling_cadence_rpm","avg_power_w","max_power_w","elevation_gain_m").forEach{key->if(rich.has(key))metrics.put(key,rich.get(key))}
                val o=JSONObject().put("external_id",s.metadata.id).put("source_app",sourcePackage).put("activity_date",s.startTime.atZone(ZoneId.systemDefault()).toLocalDate().toString()).put("started_at",s.startTime.toString()).put("activity_type",type).put("title",s.title?:"Health Connect").put("duration_min",Duration.between(s.startTime,s.endTime).seconds/60.0).put("distance_km",distances).put("calories",calories.toInt()).put("route_points",rich.getJSONArray("route_points")).put("metrics",metrics)
                if(rich.has("max_speed_kmh"))o.put("top_speed_kmh",rich.getDouble("max_speed_kmh"))
                if(rich.has("elevation_gain_m"))o.put("elevation_gain_m",rich.getDouble("elevation_gain_m"))
                if(hr.isNotEmpty()){o.put("avg_hr",hr.average().toInt());o.put("max_hr",hr.max())}
                activitiesJson.put(o)
            }
            val payload=JSONObject().put("sleep",sleepJson).put("activities",activitiesJson)
            val result=withContext(Dispatchers.IO){postToSupabase(payload.toString())}
            oneTimeRoutesUsed.forEach{authorizedRoutes.remove(it)}
            sendSuccess(result)
        }catch(e:Exception){sendError("No se ha completado la sincronización. ${e.message ?: "Comprueba permisos y conexión."}")}finally{pendingToken=null;pendingSupabaseUrl=null;syncing=false}
    }
    private fun postToSupabase(json:String):String{val token=pendingToken?:error("Falta sesión");val url=URL("$backendUrl/functions/v1/health-connect-ingest");val conn=(url.openConnection() as HttpURLConnection).apply{requestMethod="POST";doOutput=true;connectTimeout=15000;readTimeout=30000;setRequestProperty("Authorization","Bearer $token");setRequestProperty("Content-Type","application/json")};conn.outputStream.use{it.write(json.toByteArray())};val body=(if(conn.responseCode in 200..299)conn.inputStream else conn.errorStream).bufferedReader().use{it.readText()};if(conn.responseCode !in 200..299)error(body);return body}
    private fun sendSuccess(result:String)=runOnUiThread{webView.evaluateJavascript("window.healthConnectSyncFinished(${JSONObject.quote(result)})",null)}
    private fun sendError(message:String)=runOnUiThread{webView.evaluateJavascript("window.healthConnectSyncError(${JSONObject.quote(message)})",null)}
}
