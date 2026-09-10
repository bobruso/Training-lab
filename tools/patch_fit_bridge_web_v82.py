from pathlib import Path

p=Path('app.js')
s=p.read_text(encoding='utf-8')
old="try{raw=window.TrainingLabAndroid.consumeSharedFit()||'';}catch(e){window.TrainingLab.report('FIT compartido',e);return;}"
new="try{raw=window.TrainingLabAndroid.consumeSharedFit()||'';}catch(e){const message=String(e?.message||e||'');if(message.includes('Error invoking consumeSharedFit')&&message.includes('Java exception was raised during method invocation'))return;window.TrainingLab.report('FIT compartido',e);return;}"
if old not in s:
    raise SystemExit('Shared FIT catch block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'v8.1 · build icon81' not in s:
    raise SystemExit('Expected v8.1 build not found')
s=s.replace('v8.1 · build icon81','v8.2 · build fitbridge82',1)
s=s.replace('20260910icon81','20260910fitbridge82')
p.write_text(s,encoding='utf-8')

p=Path('service-worker.js')
s=p.read_text(encoding='utf-8')
s=s.replace('training-lab-20260910icon81','training-lab-20260910fitbridge82')
s=s.replace('20260910icon81','20260910fitbridge82')
p.write_text(s,encoding='utf-8')
