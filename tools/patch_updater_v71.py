from pathlib import Path

OLD='20260909home70'
NEW='20260909updater71'

# index / asset versions
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v7.0 · build home70','v7.1 · build updater71').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# runtime settings + updater logic
p=Path('runtime.js')
s=p.read_text(encoding='utf-8')
old='''section.innerHTML=`<div class="sectionhead"><h2>Ajustes / Perfil</h2><span class="muted">cuenta, sincronización y preferencias</span></div><div class="grid g2"><div id="settingsAccountSlot"></div><div class="card"><div class="eyebrow">Datos y dispositivos</div><h2>COROS / Health Connect</h2><p class="muted">Training Lab recibe los datos del reloj mediante Health Connect cuando COROS comparte allí tus métricas.</p><div class="actions"><button class="btn" id="settingsHealthSync">Sincronizar ahora</button><button class="btn alt" id="settingsSources">Ver fuentes</button></div><p class="small muted" style="margin-top:10px">Contraseña y cierre de sesión quedan aquí para no ocupar espacio en la pantalla principal.</p></div></div>`;'''
new='''section.innerHTML=`<div class="sectionhead"><h2>Ajustes / Perfil</h2><span class="muted">cuenta, sincronización y preferencias</span></div><div class="grid g2"><div id="settingsAccountSlot"></div><div class="card"><div class="eyebrow">Datos y dispositivos</div><h2>COROS / Health Connect</h2><p class="muted">Training Lab recibe los datos del reloj mediante Health Connect cuando COROS comparte allí tus métricas.</p><div class="actions"><button class="btn" id="settingsHealthSync">Sincronizar ahora</button><button class="btn alt" id="settingsSources">Ver fuentes</button></div><p class="small muted" style="margin-top:10px">Contraseña y cierre de sesión quedan aquí para no ocupar espacio en la pantalla principal.</p></div><div class="card" id="settingsUpdateCard"><div class="eyebrow">Actualización de la app</div><h2>Versión y caché</h2><p class="muted">Comprueba directamente GitHub Pages, sin confiar en la copia guardada por la APK.</p><div class="small muted" id="settingsCurrentVersion">Instalada: —</div><div class="small muted" id="settingsRemoteVersion" style="margin-top:4px">Última disponible: sin comprobar</div><div class="actions" style="margin-top:12px"><button class="btn" id="settingsCheckUpdate">Comprobar actualización</button><button class="btn alt" id="settingsForceUpdate" hidden>Descargar y reiniciar</button></div><div id="settingsUpdateStatus" class="small muted" role="status" aria-live="polite" style="margin-top:10px"></div></div></div>`;'''
if old not in s: raise SystemExit('settings template anchor not found')
s=s.replace(old,new,1)

anchor='''    const profile=document.querySelector('.top .profile');if(profile){profile.style.cursor='pointer';profile.title='Abrir Ajustes / Perfil';profile.onclick=()=>window.navTo?.('ajustes');}\n  }'''
insert='''    const profile=document.querySelector('.top .profile');if(profile){profile.style.cursor='pointer';profile.title='Abrir Ajustes / Perfil';profile.onclick=()=>window.navTo?.('ajustes');}\n    const current=section.querySelector('#settingsCurrentVersion');if(current)current.textContent='Instalada: '+state.frontend;\n    const check=section.querySelector('#settingsCheckUpdate');if(check)check.onclick=()=>window.TrainingLab.checkForUpdate?.();\n    const force=section.querySelector('#settingsForceUpdate');if(force)force.onclick=()=>window.TrainingLab.forceUpdate?.();\n  }'''
if anchor not in s: raise SystemExit('settings end anchor not found')
s=s.replace(anchor,insert,1)

# Add robust updater functions before DOMContentLoaded handler.
anchor2="""  document.addEventListener('DOMContentLoaded',()=>{\n"""
updater=r'''  function parseBuild(html){
    try{return new DOMParser().parseFromString(html,'text/html').querySelector('meta[name="build"]')?.content || null}catch{return null}
  }
  async function checkForUpdate(){
    const btn=document.getElementById('settingsCheckUpdate'),force=document.getElementById('settingsForceUpdate'),remote=document.getElementById('settingsRemoteVersion'),status=document.getElementById('settingsUpdateStatus');
    if(btn){btn.disabled=true;btn.textContent='Comprobando…'}
    if(status)status.textContent='Consultando la versión publicada sin usar la caché local…';
    try{
      const url=new URL('./index.html',location.href);url.searchParams.set('__traininglab_update_check',Date.now());
      const res=await request(url.href,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const latest=parseBuild(await res.text());if(!latest)throw new Error('No pude leer la versión publicada.');
      if(remote)remote.textContent='Última disponible: '+latest;
      state.remoteBuild=latest;render();
      const available=latest!==state.frontend;
      if(force){force.hidden=!available;force.textContent='Descargar y reiniciar'}
      if(status)status.textContent=available?`Hay una versión distinta disponible (${latest}).`:`Ya tienes la versión publicada (${latest}).`;
      return {available,latest};
    }catch(error){
      if(status)status.textContent='No se pudo comprobar la actualización. Revisa la conexión.';
      report('Comprobar actualización',error);return {available:false,error};
    }finally{if(btn){btn.disabled=false;btn.textContent='Comprobar actualización'}}
  }
  async function forceUpdate(){
    const status=document.getElementById('settingsUpdateStatus'),check=document.getElementById('settingsCheckUpdate'),force=document.getElementById('settingsForceUpdate');
    if(check)check.disabled=true;if(force){force.disabled=true;force.textContent='Descargando…'}
    if(status)status.textContent='Preparando actualización. No cierres Training Lab…';
    try{
      // Verify network first. Do not destroy the working offline copy if the new index is unreachable.
      const probe=new URL('./index.html',location.href);probe.searchParams.set('__traininglab_force_probe',Date.now());
      const res=await request(probe.href,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const latest=parseBuild(await res.text());if(!latest)throw new Error('Versión remota no válida.');
      if(status)status.textContent='Versión '+latest+' localizada. Limpiando únicamente la caché de Training Lab…';
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.filter(r=>r.scope.startsWith(new URL('./',location.href).href)).map(r=>r.unregister().catch(()=>false)));
      }
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>k.startsWith('training-lab-')).map(k=>caches.delete(k)));
      }
      sessionStorage.setItem('traininglab-updated-from',state.frontend);
      if(status)status.textContent='Actualización descargándose. Training Lab se reiniciará ahora.';
      // A cache-busting navigation forces the WebView back to the network. The old worker may
      // still control this one navigation, but its Training Lab cache has just been removed.
      const target=new URL('./',location.href);target.searchParams.set('__traininglab_updated',Date.now());
      setTimeout(()=>location.replace(target.href),250);
    }catch(error){
      if(status)status.textContent='No se pudo forzar la actualización. La versión actual se mantiene intacta.';
      report('Forzar actualización',error);
      if(check)check.disabled=false;if(force){force.disabled=false;force.textContent='Descargar y reiniciar'}
    }
  }
  window.TrainingLab.checkForUpdate=checkForUpdate;
  window.TrainingLab.forceUpdate=forceUpdate;
'''
if anchor2 not in s: raise SystemExit('DOMContentLoaded anchor not found')
s=s.replace(anchor2,updater+anchor2,1)

# On a post-update restart, show a compact confirmation in Settings status if opened.
needle="""    installAccountSettings();\n    const badge=document.getElementById('buildVersion');if(badge)badge.textContent=state.frontend;\n"""
repl="""    installAccountSettings();\n    const badge=document.getElementById('buildVersion');if(badge)badge.textContent=state.frontend;\n    const previous=sessionStorage.getItem('traininglab-updated-from');\n    if(previous){sessionStorage.removeItem('traininglab-updated-from');const st=document.getElementById('settingsUpdateStatus');if(st)st.textContent=`Actualización completada: ${previous} → ${state.frontend}.`; }\n"""
if needle not in s: raise SystemExit('DOMContentLoaded settings anchor not found')
s=s.replace(needle,repl,1)

p.write_text(s,encoding='utf-8')

# service worker cache version / assets
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')
