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
      section.innerHTML=`<div class="sectionhead"><h2>Ajustes / Perfil</h2><span class="muted">cuenta, sincronización y preferencias</span></div><div class="grid g2"><div id="settingsAccountSlot"></div><div class="card"><div class="eyebrow">Datos y dispositivos</div><h2>COROS / Health Connect</h2><p class="muted">Training Lab recibe los datos del reloj mediante Health Connect cuando COROS comparte allí tus métricas.</p><div class="actions"><button class="btn" id="settingsHealthSync">Sincronizar ahora</button><button class="btn alt" id="settingsSources">Ver fuentes</button></div><p class="small muted" style="margin-top:10px">Contraseña y cierre de sesión quedan aquí para no ocupar espacio en la pantalla principal.</p></div></div>`;
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
  }
  document.addEventListener('DOMContentLoaded',()=>{
    installAccountSettings();
    const badge=document.getElementById('buildVersion');if(badge)badge.textContent=state.frontend;
    if(new URLSearchParams(location.search).get('debug')==='1'){
      document.getElementById('diagnostics').hidden=false;
      request(config.url+'/auth/v1/settings',{headers:{apikey:config.key}}).then(r=>{state.supabase=r.ok?'accesible':`HTTP ${r.status}`;render();}).catch(()=>{state.supabase='sin conexión';render();});
    }
    render();
    setTimeout(()=>{if(!state.appReady)report('Inicio','La aplicación no ha terminado de cargar. Recarga con conexión para iniciar sesión.');},15000);
    if('serviceWorker' in navigator){
      navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='VERSION'){state.cache=e.data.cache;document.getElementById('updateNotice').hidden=state.frontend.endsWith(String(e.data.cache).replace('training-lab-',''));render();}});
      navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{
        const check=()=>{navigator.serviceWorker.controller?.postMessage({type:'VERSION'});};
        navigator.serviceWorker.controller?.postMessage({type:'VERSION'});
        navigator.serviceWorker.addEventListener('controllerchange',check);
        reg?.update().catch(e=>report('Actualización',e));
      }).catch(e=>report('Service worker',e));
    }
  });
})();
