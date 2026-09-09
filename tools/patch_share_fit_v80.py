from pathlib import Path
import re

OLD='20260910home79'
NEW='20260910share80'

# Version/cache bump.
for name in ['index.html','runtime.js','app.js','styles.css','service-worker.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace(OLD,NEW)
    if name=='index.html':
        s=s.replace('v7.9 · build home79','v8.0 · build share80')
    p.write_text(s,encoding='utf-8')

# Remove manual activity entry from Registrar and point quick action to FIT import.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<div class="sectionhead"><h2>Registrar</h2><span class="muted">lo que realmente has hecho manda sobre el plan</span></div>',
            '<div class="sectionhead"><h2>Registrar</h2><span class="muted">peso, sensaciones y otros datos manuales</span></div>')
pattern=r'''\n    <div class="card">\n      <div class="eyebrow">Actividad</div><h2>Añadir entrenamiento</h2>.*?\n    </div>(?=\n    <div class="card">)'''
s,n=re.subn(pattern,'',s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'No se pudo eliminar el bloque manual de actividad: {n}')
s=s.replace('<button class="btn alt" onclick="openRegister()">Registrar actividad</button>',
            '<button class="btn alt" onclick="navTo(\'entrenos\')">Importar FIT</button>')
s=s.replace('<p class="muted small">Sin sesión, el FIT se analiza en este dispositivo. Con sesión iniciada, se guarda en tu cuenta y se analiza automáticamente. En fútbol/running extrae GPS, FC, zonas, velocidad y esfuerzos; en fuerza intentará además leer mensajes de sets si el dispositivo los incluye.</p>',
            '<p class="muted small">También puedes exportar un .FIT desde COROS y elegir Training Lab en “Compartir con otras apps”: la APK lo recibirá e importará automáticamente. Sin sesión, el FIT se analiza en este dispositivo. Con sesión iniciada, se guarda en tu cuenta y se analiza automáticamente.</p>')
p.write_text(s,encoding='utf-8')

# Web: accept an optional shared File and consume Android share payload after session restoration.
p=Path('app.js')
s=p.read_text(encoding='utf-8')
old="""window.registerFit=async function registerFit(){\n const f=document.getElementById('fitInput').files[0];"""
new="""window.registerFit=async function registerFit(sharedFile=null,sharedType=null){\n const f=sharedFile||document.getElementById('fitInput')?.files?.[0];"""
if old not in s: raise SystemExit('registerFit signature not found')
s=s.replace(old,new,1)
s=s.replace("await analyzeLocalFit(await f.arrayBuffer(),document.getElementById('fitType')?.value||'football')",
            "await analyzeLocalFit(await f.arrayBuffer(),sharedType||document.getElementById('fitType')?.value||'football')",1)
s=s.replace("const fitType=document.getElementById('fitType')?.value||'football';",
            "const fitType=sharedType||document.getElementById('fitType')?.value||'football';",1)

marker="window.registerFit=async function registerFit(sharedFile=null,sharedType=null){"
shared=r'''let sharedFitImportRunning=false;
window.consumeSharedFitFromAndroid=async function consumeSharedFitFromAndroid(){
 if(sharedFitImportRunning)return;
 if(!(window.TrainingLabAndroid&&typeof window.TrainingLabAndroid.consumeSharedFit==='function'))return;
 let raw='';
 try{raw=window.TrainingLabAndroid.consumeSharedFit()||'';}catch(e){window.TrainingLab.report('FIT compartido',e);return;}
 if(!raw)return;
 let payload;
 try{payload=JSON.parse(raw);}catch(e){window.TrainingLab.report('FIT compartido','Respuesta nativa no válida');return;}
 window.navTo('entrenos');
 const result=document.getElementById('fitResult');
 if(payload.error){if(result)result.textContent=payload.error;return;}
 try{
   const bin=atob(payload.base64||'');
   const bytes=new Uint8Array(bin.length);
   for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
   const name=/\.fit$/i.test(payload.name||'')?payload.name:`${payload.name||'coros-actividad'}.fit`;
   const file=new File([bytes],name,{type:'application/octet-stream'});
   const type=payload.activity_type||'football';
   const sel=document.getElementById('fitType');if(sel)sel.value=type;
   if(result)result.textContent='FIT recibido desde COROS · importando automáticamente como '+(type==='football'?'Fútbol':type)+'…';
   sharedFitImportRunning=true;
   await window.registerFit(file,type);
 }catch(e){
   if(result)result.textContent='No se ha podido importar el FIT compartido: '+(e?.message||e);
   window.TrainingLab.report('FIT compartido',e);
 }finally{sharedFitImportRunning=false;}
};

'''
if marker not in s: raise SystemExit('registerFit marker not found')
s=s.replace(marker,shared+marker,1)

# Trigger after auth/session has settled. Native payload is consumed once.
needle="""     await loadCloud();\n     queueAutoHealthConnectSync();\n   }\n }\n}"""
repl="""     await loadCloud();\n     queueAutoHealthConnectSync();\n   }\n }\n setTimeout(()=>window.consumeSharedFitFromAndroid?.(),350);\n}"""
if needle not in s: raise SystemExit('applySession tail not found')
s=s.replace(needle,repl,1)

# Manual form is gone; keep legacy initialization null-safe.
s=s.replace("document.getElementById('actDate').value=iso();document.getElementById('weightDate').value=iso();",
            "if(document.getElementById('actDate'))document.getElementById('actDate').value=iso();document.getElementById('weightDate').value=iso();",1)
p.write_text(s,encoding='utf-8')

# Android: receive ACTION_SEND .FIT from COROS and expose it once to the trusted WebView.
p=Path('android-companion/app/src/main/AndroidManifest.xml')
s=p.read_text(encoding='utf-8')
needle='''            <!-- Magic-link de Supabase: vuelve al companion en vez de quedarse en Chrome. -->\n            <intent-filter>'''
share='''            <!-- Recibir archivos FIT compartidos desde COROS y otras apps deportivas. -->\n            <intent-filter>\n                <action android:name="android.intent.action.SEND" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <data android:mimeType="application/octet-stream" />\n                <data android:mimeType="application/vnd.ant.fit" />\n                <data android:mimeType="application/x-fit" />\n                <data android:mimeType="application/fit" />\n            </intent-filter>\n            <!-- Magic-link de Supabase: vuelve al companion en vez de quedarse en Chrome. -->\n            <intent-filter>'''
if needle not in s: raise SystemExit('manifest insertion point not found')
s=s.replace(needle,share,1)
p.write_text(s,encoding='utf-8')

p=Path('android-companion/app/src/main/java/com/traininglab/companion/MainActivity.kt')
s=p.read_text(encoding='utf-8')
s=s.replace('import android.os.Bundle\n', 'import android.os.Bundle\nimport android.provider.OpenableColumns\nimport android.util.Base64\n')
s=s.replace('import java.net.HttpURLConnection\n', 'import java.io.ByteArrayOutputStream\nimport java.net.HttpURLConnection\n')
s=s.replace('    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null\n',
            '    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null\n    private var pendingSharedFit: String? = null\n')

# Capture share before first load and on singleTask re-entry.
s=s.replace('''        setContentView(webView)\n        loadInitialUrl(intent)''','''        captureSharedFit(intent)\n        setContentView(webView)\n        loadInitialUrl(intent)''',1)
s=s.replace('''        setIntent(intent)\n        loadInitialUrl(intent)''','''        setIntent(intent)\n        captureSharedFit(intent)\n        loadInitialUrl(intent)''',1)

# Add native share helpers before loadInitialUrl.
needle='''    private fun loadInitialUrl(intent: Intent?) {'''
helpers=r'''    @Suppress("DEPRECATION")
    private fun sharedStream(intent: Intent): Uri? =
        intent.getParcelableExtra(Intent.EXTRA_STREAM) ?: intent.clipData?.getItemAt(0)?.uri

    private fun sharedDisplayName(uri: Uri): String {
        if (uri.scheme == "content") {
            contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) {
                    val i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (i >= 0) c.getString(i)?.takeIf { it.isNotBlank() }?.let { return it }
                }
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/')?.takeIf { it.isNotBlank() } ?: "coros-actividad.fit"
    }

    private fun captureSharedFit(intent: Intent?): Boolean {
        if (intent?.action != Intent.ACTION_SEND) return false
        val uri = sharedStream(intent) ?: run {
            pendingSharedFit = JSONObject().put("error", "Training Lab no ha recibido ningún archivo desde COROS.").toString()
            return true
        }
        return try {
            val out = ByteArrayOutputStream()
            contentResolver.openInputStream(uri)?.use { input ->
                val buffer = ByteArray(8192)
                var total = 0
                while (true) {
                    val n = input.read(buffer)
                    if (n <= 0) break
                    total += n
                    if (total > 20 * 1024 * 1024) error("El FIT supera el límite de 20 MB")
                    out.write(buffer, 0, n)
                }
            } ?: error("No se puede abrir el archivo compartido")
            val bytes = out.toByteArray()
            if (bytes.size < 12 || String(bytes, 8, 4, Charsets.US_ASCII) != ".FIT") error("El archivo compartido no es un FIT válido")
            var name = sharedDisplayName(uri)
            if (!name.endsWith(".fit", ignoreCase = true)) name += ".fit"
            pendingSharedFit = JSONObject()
                .put("name", name)
                .put("activity_type", "football")
                .put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP))
                .toString()
            true
        } catch (e: Exception) {
            pendingSharedFit = JSONObject().put("error", "No se ha podido recibir el FIT: ${e.message ?: "archivo no válido"}").toString()
            true
        }
    }

'''
if needle not in s: raise SystemExit('loadInitialUrl marker not found')
s=s.replace(needle,helpers+needle,1)

# Add one-shot bridge method before Health Connect bridge method.
needle='''    inner class WebBridge {\n        @JavascriptInterface\n        fun syncHealthConnect(accessToken: String, supabaseUrl: String) {'''
bridge='''    inner class WebBridge {\n        @JavascriptInterface\n        fun consumeSharedFit(): String {\n            if (!trusted(Uri.parse(webView.url ?: ""))) return ""\n            val payload = pendingSharedFit ?: return ""\n            pendingSharedFit = null\n            return payload\n        }\n\n        @JavascriptInterface\n        fun syncHealthConnect(accessToken: String, supabaseUrl: String) {'''
if needle not in s: raise SystemExit('WebBridge marker not found')
s=s.replace(needle,bridge,1)
p.write_text(s,encoding='utf-8')

# Native build version.
p=Path('android-companion/app/build.gradle.kts')
s=p.read_text(encoding='utf-8')
s=s.replace('versionCode = 2','versionCode = 3')
s=s.replace('versionName = "0.2"','versionName = "0.3"')
p.write_text(s,encoding='utf-8')
