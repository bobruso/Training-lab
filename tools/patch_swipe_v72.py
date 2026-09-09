from pathlib import Path

OLD='20260909updater71'
NEW='20260909swipe72'

# index/cache build
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v7.1 · build updater71','v7.2 · build swipe72').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# runtime: remove top version presentation and add mobile swipe navigation
p=Path('runtime.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
# Stop populating any legacy header version badge. Settings keeps state.frontend.
s=s.replace("    const badge=document.getElementById('buildVersion');if(badge)badge.textContent=state.frontend;\n","")

anchor="""  document.addEventListener('DOMContentLoaded',()=>{\n    installAccountSettings();\n"""
if anchor not in s: raise SystemExit('DOMContentLoaded anchor not found')

swipe=r'''  function installMobileSwipeNavigation(){
    let start=null;
    const mobile=()=>window.matchMedia('(max-width: 700px)').matches;
    const blocked=target=>!!target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],[role="slider"],canvas,svg,.update-dialog');
    const updateOpen=()=>{const n=document.getElementById('updateNotice');return n&&!n.hidden;};
    const pages=()=>[...document.querySelectorAll('nav [data-page]')]
      .map(b=>b.dataset.page)
      .filter((id,i,a)=>id&&a.indexOf(id)===i&&document.getElementById(id));

    document.addEventListener('touchstart',e=>{
      if(!mobile()||updateOpen()||e.touches.length!==1||blocked(e.target)){start=null;return;}
      const t=e.touches[0];start={x:t.clientX,y:t.clientY,time:performance.now(),target:e.target};
    },{passive:true});

    document.addEventListener('touchend',e=>{
      if(!start||!mobile()||updateOpen()){start=null;return;}
      const t=e.changedTouches?.[0];if(!t){start=null;return;}
      const dx=t.clientX-start.x,dy=t.clientY-start.y,dt=performance.now()-start.time;
      start=null;
      const threshold=Math.max(58,window.innerWidth*.14);
      if(dt>850||Math.abs(dx)<threshold||Math.abs(dx)<Math.abs(dy)*1.35)return;
      const order=pages(),current=document.querySelector('.page.on')?.id,idx=order.indexOf(current);
      if(idx<0)return;
      const next=dx<0?idx+1:idx-1;
      if(next<0||next>=order.length)return;
      document.documentElement.dataset.swipeDirection=dx<0?'left':'right';
      if(typeof window.navTo==='function')window.navTo(order[next]);
      else {
        document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===order[next]));
        document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===order[next]));
      }
      window.scrollTo({top:0,left:0,behavior:'auto'});
      window.setTimeout(()=>delete document.documentElement.dataset.swipeDirection,260);
    },{passive:true});

    document.addEventListener('touchcancel',()=>{start=null;},{passive:true});
  }
'''
s=s.replace(anchor,swipe+anchor,1)
s=s.replace("    installAccountSettings();\n","    installAccountSettings();\n    document.getElementById('buildVersion')?.remove();\n    installMobileSwipeNavigation();\n",1)
p.write_text(s,encoding='utf-8')

# styles: guarantee legacy top badge hidden + swipe animation mobile only
p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
if '/* mobile-swipe-v72 */' not in s:
    s += r'''

/* mobile-swipe-v72 */
#buildVersion,.top .version-badge,.top .build-version{display:none!important}
@media(max-width:700px){
  html[data-swipe-direction="left"] .page.on{animation:traininglabSwipeLeft .22s ease-out}
  html[data-swipe-direction="right"] .page.on{animation:traininglabSwipeRight .22s ease-out}
}
@keyframes traininglabSwipeLeft{from{opacity:.72;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
@keyframes traininglabSwipeRight{from{opacity:.72;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
'''
p.write_text(s,encoding='utf-8')

# service worker cache
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')
