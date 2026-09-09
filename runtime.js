/* Runs before the application module: login and errors survive a failed import. */
(() => {
  const config = Object.freeze({url:'https://nnpvklaxhomarxszlclt.supabase.co',key:'sb_publishable_4zzi_K9QK12-qtD4RG2Gxg_TyXX1TBd',redirect:'https://bobruso.github.io/Training-lab/'});
  const state = {frontend:document.querySelector('meta[name="build"]')?.content || 'development',appReady:false,supabase:'sin comprobar',authenticated:false,email:null,lastSync:null,activities:0,sleep:0,lastFunction:null,lastError:null,cache:null};
  const safe = value => String(value?.message || value || 'Error desconocido').replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_.-]+|sb_secret_\S+|(?:access_token|refresh_token|token|apikey|service_role)\s*[=:]\s*[^\s&,]+/gi,'[oculto]').slice(0,250);
  function render(){
    const el=document.getElementById('diagnosticData');
    if(el) el.textContent=JSON.stringify({...state,serviceWorker:navigator.serviceWorker?.controller?.scriptURL?.split('?')[0] || 'sin controlador',healthConnect:!!window.TrainingLabAndroid},null,2);
  }
  function report(scope,error){
    state.lastError={scope,message:safe(error),time:new Date().toISOString()};
    const el=document.getElementById('appError');
    if(el){el.hidden=false;el.textContent=`${scope}: ${safe(error)}`;}
    render();
  }
  async function request(input,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    const external=options.signal;
    const abort=()=>controller.abort();
    if(external?.aborted) abort(); else external?.addEventListener('abort',abort,{once:true});
    try{return await fetch(input,{...options,signal:controller.signal});}
    finally{clearTimeout(timer);external?.removeEventListener('abort',abort);}
  }
  window.TrainingLab={config,state,safe,report,request,update(values){Object.assign(state,values);render();}};
  window.addEventListener('error',e=>report('Aplicación',e.error || 'No se pudo cargar un recurso. Recarga cuando tengas conexión.'));
  window.addEventListener('unhandledrejection',e=>report('Aplicación',e.reason));
  window.TrainingLab.authForm=(signedIn=false)=>`<input id="authEmail" aria-label="Email de acceso" autocomplete="email" required type="email" placeholder="tu@email.com" ${signedIn?'hidden':''}><input id="authPassword" aria-label="Contraseña" type="password" autocomplete="${signedIn?'new-password':'current-password'}" placeholder="${signedIn?'Nueva contraseña':'Contraseña'}"><div class="actions">${signedIn?'<button class="btn" data-auth="update">Guardar contraseña</button>':'<button class="btn" data-auth="signin">Entrar</button><button class="btn alt" data-auth="signup">Crear cuenta</button><button class="btn alt" data-auth="recover">Olvidé mi contraseña</button>'}</div>`;
  document.getElementById('authActions').innerHTML=window.TrainingLab.authForm();
  let passwordBusy=false;
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-auth]');if(!button||passwordBusy)return;
    e.preventDefault();
    const action=button.dataset.auth,input=document.getElementById('authEmail'),passwordInput=document.getElementById('authPassword'),detail=document.getElementById('cloudDetail');
    const email=input.value.trim(),password=passwordInput.value;
    const feedback=document.getElementById('authFeedback');
    const show=message=>{detail.textContent=message;feedback.textContent=message;feedback.hidden=false;};
    if(action!=='update'&&(!email||!input.checkValidity())){detail.textContent='Escribe un email válido.';input.focus();return;}
    if(action!=='recover'&&(!password||((action==='signup'||action==='update')&&password.length<8))){detail.textContent='Introduce una contraseña'+(action==='signin'?'.':' de al menos 8 caracteres.');passwordInput.focus();return;}
    if(!window.TrainingLab.passwordAuth){detail.textContent='La aplicación aún no está lista. Recarga con conexión.';return;}
    passwordBusy=true;const label=button.textContent;button.disabled=true;button.textContent='Procesando…';
    try {show(await window.TrainingLab.passwordAuth(action,email,password));passwordInput.value='';document.getElementById('appError').hidden=true;}
    catch(error){
      const code=error.code||({'Invalid login credentials':'invalid_credentials','Email not confirmed':'email_not_confirmed'}[error.message])||'';
      const messages={
        invalid_credentials:'Email o contraseña incorrectos. Usa el mismo correo de tu sesión abierta y la contraseña que guardaste.',
        email_not_confirmed:'Confirma primero tu correo y después entra con tu contraseña.',
        weak_password:'La contraseña no cumple los requisitos de seguridad. Usa una más larga y variada.',
        same_password:'Esa contraseña ya está guardada. Puedes usarla para entrar en la APK.',
        reauthentication_needed:'Por seguridad, debes volver a autenticarte antes de cambiar la contraseña.',
        session_not_found:'La sesión ha caducado. Vuelve a iniciar sesión.',
        user_banned:'El acceso a esta cuenta está deshabilitado.',
        signup_disabled:'El registro de cuentas está deshabilitado.',
        over_email_send_rate_limit:'Se ha alcanzado el límite de correos. No repitas el registro; entra con tu contraseña si ya tienes cuenta.'
      };
      const message=messages[code]||(error.status===429?'Demasiadas solicitudes. Espera antes de repetir.':error.name==='AbortError'?'La solicitud tardó demasiado. Comprueba tu conexión.':'No se pudo completar el acceso'+(error.status?' (HTTP '+error.status+')':'')+'. '+(code?'Código: '+safe(code)+'.':'Comprueba la conexión.'));
      show(message);report('Acceso',message);
    }
    finally {passwordBusy=false;button.disabled=false;button.textContent=label;}
  });
  document.addEventListener('keydown',e=>{if(['authEmail','authPassword'].includes(e.target.id)&&e.key==='Enter'){e.preventDefault();document.querySelector('[data-auth=signin],[data-auth=update]')?.click();}});
  function installAccountSettings(){
    const cloud=document.getElementById('cloudCard'),nav=document.querySelector('nav');
    if(!cloud||!nav)return;
    let section=document.getElementById('ajustes');
    if(!section){
      section=document.createElement('section');
      section.className='page';
      section.id='ajustes';
      section.innerHTML=`<div class="sectionhead"><h2>Ajustes / Perfil</h2><span class="muted">cuenta, sincronización y preferencias</span></div><div class="grid g2"><div id="settingsAccountSlot"></div><div class="card"><div class="eyebrow">Datos y dispositivos</div><h2>COROS / Health Connect</h2><p class="muted">Training Lab recibe los datos del reloj mediante Health Connect cuando COROS comparte allí tus métricas.</p><div class="actions"><button class="btn" id="settingsHealthSync">Sincronizar ahora</button><button class="btn alt" id="settingsSources">Ver fuentes</button></div><p class="small muted" style="margin-top:10px">Contraseña y cierre de sesión quedan aquí para no ocupar espacio en la pantalla principal.</p></div><div class="card" id="settingsUpdateCard"><div class="eyebrow">Actualización de la app</div><h2>Versión y caché</h2><p class="muted">Comprueba directamente GitHub Pages, sin confiar en la copia guardada por la APK.</p><div class="small muted" id="settingsCurrentVersion">Instalada: —</div><div class="small muted" id="settingsRemoteVersion" style="margin-top:4px">Última disponible: sin comprobar</div><div class="actions" style="margin-top:12px"><button class="btn" id="settingsCheckUpdate">Comprobar actualización</button><button class="btn alt" id="settingsForceUpdate" hidden>Descargar y reiniciar</button></div><div id="settingsUpdateStatus" class="small muted" role="status" aria-live="polite" style="margin-top:10px"></div></div></div>`;
      (document.getElementById('progreso')||document.querySelector('.bottom'))?.before(section);
    }
    (section.querySelector('#settingsAccountSlot')||section).appendChild(cloud);
    cloud.style.marginBottom='0';
    if(!nav.querySelector('[data-page="ajustes"]')){
      const b=document.createElement('button');b.dataset.page='ajustes';b.textContent='Ajustes';
      b.addEventListener('click',()=>window.navTo?window.navTo('ajustes'):(()=>{document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id==='ajustes'));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page==='ajustes'));})());
      nav.appendChild(b);
    }
    const sync=section.querySelector('#settingsHealthSync');if(sync)sync.onclick=()=>window.syncHealthConnect?.();
    const sources=section.querySelector('#settingsSources');if(sources)sources.onclick=()=>window.navTo?.('entrenos');
    const profile=document.querySelector('.top .profile');if(profile){profile.style.cursor='pointer';profile.title='Abrir Ajustes / Perfil';profile.onclick=()=>window.navTo?.('ajustes');}
    const current=section.querySelector('#settingsCurrentVersion');if(current)current.textContent='Instalada: '+state.frontend;
    const check=section.querySelector('#settingsCheckUpdate');if(check)check.onclick=()=>window.TrainingLab.checkForUpdate?.();
    const force=section.querySelector('#settingsForceUpdate');if(force)force.onclick=()=>window.TrainingLab.forceUpdate?.();
  }
  function parseBuild(html){
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
  document.addEventListener('DOMContentLoaded',()=>{
    installAccountSettings();
    const badge=document.getElementById('buildVersion');if(badge)badge.textContent=state.frontend;
    const previous=sessionStorage.getItem('traininglab-updated-from');
    if(previous){sessionStorage.removeItem('traininglab-updated-from');const st=document.getElementById('settingsUpdateStatus');if(st)st.textContent=`Actualización completada: ${previous} → ${state.frontend}.`; }
    if(new URLSearchParams(location.search).get('debug')==='1'){
      document.getElementById('diagnostics').hidden=false;
      request(config.url+'/auth/v1/settings',{headers:{apikey:config.key}}).then(r=>{state.supabase=r.ok?'accesible':`HTTP ${r.status}`;render();}).catch(()=>{state.supabase='sin conexión';render();});
    }
    render();
    setTimeout(()=>{if(!state.appReady)report('Inicio','La aplicación no ha terminado de cargar. Recarga con conexión para iniciar sesión.');},15000);
    if('serviceWorker' in navigator){
      navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='VERSION'){state.cache=e.data.cache;const cacheVersion=String(e.data.cache||'').replace(/^training-lab-/,'');const runtimeSrc=document.querySelector('script[src*="runtime.js"]')?.src;const runtimeVersion=runtimeSrc?new URL(runtimeSrc,location.href).searchParams.get('v'):null;const notice=document.getElementById('updateNotice');if(notice)notice.hidden=!!runtimeVersion&&runtimeVersion===cacheVersion;render();}});
      navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{
        const check=()=>{navigator.serviceWorker.controller?.postMessage({type:'VERSION'});};
        navigator.serviceWorker.controller?.postMessage({type:'VERSION'});
        navigator.serviceWorker.addEventListener('controllerchange',check);
        reg?.update().catch(e=>report('Actualización',e));
      }).catch(e=>report('Service worker',e));
    }
  });
})();
