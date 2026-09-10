from pathlib import Path
import json

# Web identity + cache/version bump
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<meta name="theme-color" content="#0c1114"><link rel="manifest" href="./manifest.webmanifest">', '<meta name="theme-color" content="#0c1114"><link rel="manifest" href="./manifest.webmanifest"><link rel="icon" type="image/png" href="./favicon.png"><link rel="apple-touch-icon" href="./favicon.png">')
s=s.replace('v8.0 · build share80','v8.1 · build icon81')
s=s.replace('20260910share80','20260910icon81')
p.write_text(s,encoding='utf-8')

p=Path('manifest.webmanifest')
manifest={
  'name':'Training Lab',
  'short_name':'TrainingLab',
  'start_url':'./',
  'display':'standalone',
  'background_color':'#0a0f12',
  'theme_color':'#0c1114',
  'icons':[
    {'src':'./favicon.png','sizes':'144x144','type':'image/png','purpose':'any'}
  ]
}
p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p=Path('service-worker.js')
s=p.read_text(encoding='utf-8')
s=s.replace("training-lab-20260910share80","training-lab-20260910icon81")
s=s.replace("./app.js?v=20260910share80","./app.js?v=20260910icon81")
s=s.replace("./runtime.js?v=20260910share80","./runtime.js?v=20260910icon81")
s=s.replace("./styles.css?v=20260910share80","./styles.css?v=20260910icon81")
s=s.replace("'./manifest.webmanifest','./privacy.html'", "'./manifest.webmanifest','./favicon.png','./privacy.html'")
p.write_text(s,encoding='utf-8')

# Native Android launcher icon
p=Path('android-companion/app/src/main/AndroidManifest.xml')
s=p.read_text(encoding='utf-8')
needle='''    <application\n        android:theme="@style/AppTheme"\n        android:label="@string/app_name"'''
repl='''    <application\n        android:theme="@style/AppTheme"\n        android:label="@string/app_name"\n        android:icon="@mipmap/ic_launcher"\n        android:roundIcon="@mipmap/ic_launcher"'''
if needle not in s:
    raise SystemExit('No se encontró <application> para añadir el icono')
s=s.replace(needle,repl,1)
p.write_text(s,encoding='utf-8')

p=Path('android-companion/app/build.gradle.kts')
s=p.read_text(encoding='utf-8')
s=s.replace('versionCode = 3','versionCode = 4')
s=s.replace('versionName = "0.3"','versionName = "0.4"')
p.write_text(s,encoding='utf-8')
