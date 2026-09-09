from pathlib import Path

old='20260909banner64'
new='20260909ui65'

p=Path('styles.css')
s=p.read_text(encoding='utf-8')
marker='/* ui-safearea-v65 */'
css='''\n\n/* ui-safearea-v65 */\n.top{position:relative}\n.brand::after{\n  content:"v6.5 · ui65";\n  display:inline-block;\n  margin-left:9px;\n  vertical-align:middle;\n  font-size:9px;\n  line-height:1;\n  letter-spacing:.04em;\n  font-weight:800;\n  color:var(--muted);\n  opacity:.82;\n  border:1px solid var(--line);\n  border-radius:999px;\n  padding:4px 6px;\n}\n@media(max-width:700px){\n  .app{padding-top:max(42px, calc(env(safe-area-inset-top) + 14px));}\n  .top{min-height:34px;margin-bottom:10px}\n  .brand{display:flex;align-items:center;gap:7px;flex-wrap:wrap}\n  .brand::after{margin-left:0;font-size:8px;padding:3px 5px}\n}\n'''
if marker not in s:
    s += css
p.write_text(s,encoding='utf-8')

for name in ['index.html','app.js','service-worker.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8').replace(old,new)
    p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8').replace('v6.4 · build banner64','v6.5 · build ui65')
p.write_text(s,encoding='utf-8')
