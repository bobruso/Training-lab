from pathlib import Path

# Web: bump the build, bust cached assets and remove the old automatic update modal.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
if 'v8.2 · build fitbridge82' not in s:
    raise SystemExit('Expected v8.2 build marker not found')
s = s.replace('v8.2 · build fitbridge82', 'v8.3 · build iconfix83', 1)
s = s.replace('20260910fitbridge82', '20260910iconfix83')
old_notice = '<div id="updateNotice" class="update-modal" hidden><div class="update-dialog" role="dialog" aria-modal="true" aria-labelledby="updateTitle"><div class="eyebrow">Actualización</div><h2 id="updateTitle">Nueva versión disponible</h2><p class="muted">Training Lab tiene una versión más reciente. Pulsa actualizar para cargarla.</p><button class="btn big" onclick="location.reload()">Actualizar ahora</button></div></div>\n'
s = s.replace(old_notice, '')
s = s.replace('href="./favicon.png"', 'href="./favicon.png?v=20260910iconfix83"')
p.write_text(s, encoding='utf-8')

# Runtime: updates are now manual from Ajustes. Never block the app with a stale-cache popup.
p = Path('runtime.js')
s = p.read_text(encoding='utf-8')
old = "navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='VERSION'){state.cache=e.data.cache;const cacheVersion=String(e.data.cache||'').replace(/^training-lab-/,'');const runtimeSrc=document.querySelector('script[src*=\"runtime.js\"]')?.src;const runtimeVersion=runtimeSrc?new URL(runtimeSrc,location.href).searchParams.get('v'):null;const notice=document.getElementById('updateNotice');if(notice)notice.hidden=!!runtimeVersion&&runtimeVersion===cacheVersion;render();}});"
new = "navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='VERSION'){state.cache=e.data.cache;render();}});"
if old not in s:
    raise SystemExit('Automatic update notice handler not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Service worker: new cache and network-first navigation so index.html cannot remain stale forever.
p = Path('service-worker.js')
s = p.read_text(encoding='utf-8')
s = s.replace('training-lab-20260910fitbridge82', 'training-lab-20260910iconfix83')
s = s.replace('20260910fitbridge82', '20260910iconfix83')
old = "    const cached=await cache.match(isDocument?new URL('./index.html',base).href:event.request);\n    return cached || fetch(event.request);"
new = "    if(isDocument){\n      const indexUrl=new URL('./index.html',base).href;\n      try{\n        const fresh=await fetch(new Request(indexUrl,{cache:'no-store'}));\n        if(fresh.ok)await cache.put(indexUrl,fresh.clone());\n        return fresh;\n      }catch{\n        return await cache.match(indexUrl);\n      }\n    }\n    return (await cache.match(event.request)) || fetch(event.request);"
if old not in s:
    raise SystemExit('Service worker cache-first navigation block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Android: v0.7 plus a real adaptive launcher icon. The foreground PNG is committed from the exact user image.
p = Path('android-companion/app/build.gradle.kts')
s = p.read_text(encoding='utf-8')
if 'versionCode = 6' not in s or 'versionName = "0.6"' not in s:
    raise SystemExit('Expected Android v0.6 not found')
s = s.replace('versionCode = 6', 'versionCode = 7', 1).replace('versionName = "0.6"', 'versionName = "0.7"', 1)
p.write_text(s, encoding='utf-8')

p = Path('android-companion/app/src/main/AndroidManifest.xml')
s = p.read_text(encoding='utf-8')
s = s.replace('android:roundIcon="@mipmap/ic_launcher"', 'android:roundIcon="@mipmap/ic_launcher_round"', 1)
p.write_text(s, encoding='utf-8')

background = '''<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#030712" />
</shape>
'''
adaptive = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
'''
Path('android-companion/app/src/main/res/drawable').mkdir(parents=True, exist_ok=True)
Path('android-companion/app/src/main/res/drawable/ic_launcher_background.xml').write_text(background, encoding='utf-8')
Path('android-companion/app/src/main/res/mipmap-anydpi-v26').mkdir(parents=True, exist_ok=True)
Path('android-companion/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml').write_text(adaptive, encoding='utf-8')
Path('android-companion/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml').write_text(adaptive, encoding='utf-8')
