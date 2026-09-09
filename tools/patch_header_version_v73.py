from pathlib import Path
OLD='20260909swipe72'
NEW='20260909header73'

p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v7.2 · build swipe72','v7.3 · build header73').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
if '/* header-version-cleanup-v73 */' not in s:
    s += '\n\n/* header-version-cleanup-v73 */\n.brand::after{display:none!important;content:none!important}\n'
p.write_text(s,encoding='utf-8')

p=Path('runtime.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')
