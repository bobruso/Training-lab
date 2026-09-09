from pathlib import Path
OLD='20260909adaptive75'
NEW='20260909nav76'

# Version/cache bump
for name in ['index.html','runtime.js','app.js','service-worker.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace(OLD,NEW)
    if name=='index.html':
        s=s.replace('v7.5 · build adaptive75','v7.6 · build nav76')
    p.write_text(s,encoding='utf-8')

p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
s += r'''

/* nav-v76: no visible horizontal scrollbar on section navigation */
nav{
  overflow-x:hidden;
  overflow-y:visible;
  flex-wrap:wrap;
  align-content:flex-start;
  scrollbar-width:none;
  -ms-overflow-style:none;
}
nav::-webkit-scrollbar{display:none;width:0;height:0}
nav button{flex:0 0 auto}

@media(max-width:700px){
  nav{
    overflow-x:auto;
    overflow-y:hidden;
    flex-wrap:nowrap;
    scrollbar-width:none;
    -ms-overflow-style:none;
  }
  nav::-webkit-scrollbar{display:none;width:0;height:0}
}
'''
p.write_text(s,encoding='utf-8')
