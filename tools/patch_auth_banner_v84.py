from pathlib import Path

# Bump web build and asset/cache keys so the APK receives the fix.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
if 'v8.3 · build iconfix83' not in s:
    raise SystemExit('Expected v8.3 build marker not found')
s = s.replace('v8.3 · build iconfix83', 'v8.4 · build authfix84', 1)
s = s.replace('20260910iconfix83', '20260910authfix84')
p.write_text(s, encoding='utf-8')

p = Path('runtime.js')
s = p.read_text(encoding='utf-8')
old = "window.TrainingLab={config,state,safe,report,request,update(values){Object.assign(state,values);render();}};"
new = "window.TrainingLab={config,state,safe,report,request,update(values){Object.assign(state,values);if(values?.authenticated===true&&state.lastError?.scope==='Acceso'){state.lastError=null;const error=document.getElementById('appError');if(error){error.hidden=true;error.textContent='';}}render();}};"
if old not in s:
    raise SystemExit('TrainingLab update target not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

p = Path('service-worker.js')
s = p.read_text(encoding='utf-8')
if '20260910iconfix83' not in s:
    raise SystemExit('Expected v8.3 service-worker cache key not found')
s = s.replace('20260910iconfix83', '20260910authfix84')
p.write_text(s, encoding='utf-8')
