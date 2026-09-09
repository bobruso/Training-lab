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
  window.TrainingLab.authForm=(signedIn=false)=>`<input id="authEmail" aria-label="Email de acceso" autocomplete="email" required type="email" placeholder="tu@email.com" ${signedIn?'hidden':''}><input id="authPassword" aria-label="Contraseña" type="password" autocomplete="${signedIn?'new-password':'current-password'}" placeholder="${signedIn?'Nueva contraseña':'Contraseña'}"><div class="actions">${signedIn?'<button class="btn" data-auth="update">Guardar contraseña</button>':'<button class="btn" data-auth="signin">Entrar</button><button class="btn alt" data-auth="signup">Crear cuenta</button><button class="btn alt" data-auth="recover">Olvidé mi contraseña</button><button class="btn alt" id="loginBtn">Enviar enlace</button>'}</div>`;
  document.getElementById('authActions').innerHTML=window.TrainingLab.authForm();
  let passwordBusy=false;
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-auth]');if(!button||passwordBusy)return;
    e.preventDefault();
    const action=button.dataset.auth,input=document.getElementById('authEmail'),passwordInput=document.getElementById('authPassword'),detail=document.getElementById('cloudDetail');
    const email=input.value.trim(),password=passwordInput.value;
    if(action!=='update'&&(!email||!input.checkValidity())){detail.textContent='Escribe un email válido.';input.focus();return;}
    if(action!=='recover'&&(!password||((action==='signup'||action==='update')&&password.length<8))){detail.textContent='Introduce una contraseña'+(action==='signin'?'.':' de al menos 8 caracteres.');passwordInput.focus();return;}
    if(!window.TrainingLab.passwordAuth){detail.textContent='La aplicación aún no está lista. Recarga con conexión.';return;}
    passwordBusy=true;const label=button.textContent;button.disabled=true;button.textContent='Procesando…';
    try {detail.textContent=await window.TrainingLab.passwordAuth(action,email,password);passwordInput.value='';}
    catch(error){const code=error.code||({'Invalid login credentials':'invalid_credentials','Email not confirmed':'email_not_confirmed'}[error.message])||'';detail.textContent=error.status===429?'Demasiadas solicitudes. El servicio ha limitado los intentos; espera antes de repetir. Entrar con una contraseña ya creada no envía correo.':code==='invalid_credentials'?'Email o contraseña incorrectos. Si antes usabas enlaces, crea tu contraseña desde un dispositivo donde ya tengas sesión.':code==='email_not_confirmed'?'Confirma primero tu correo y después entra con tu contraseña.':code==='weak_password'?'La contraseña no cumple los requisitos de seguridad. Usa una más larga y variada.':'No se pudo completar el acceso. Comprueba la conexión y vuelve a intentarlo.';}
    finally {passwordBusy=false;button.disabled=false;button.textContent=label;}
  });
  let sending=false;
  window.sendTrainingLabMagicLink=async()=>{
    if(sending)return;
    const input=document.getElementById('authEmail'),btn=document.getElementById('loginBtn'),detail=document.getElementById('cloudDetail');
    const email=(input?.value || '').trim();
    if(!email || !input.checkValidity()){detail.textContent='Escribe un email válido para recibir el enlace.';input?.focus();return;}
    sending=true;btn.disabled=true;btn.textContent='Enviando…';btn.setAttribute('aria-busy','true');
    detail.textContent='Solicitando enlace de acceso…';
    try{
      const redirect=typeof window.TrainingLabAndroid?.syncHealthConnect==='function'?'traininglab://auth':config.redirect;
      const res=await request(`${config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});
      if(!res.ok)throw new Error(res.status===429?'Demasiadas solicitudes. Espera unos minutos antes de intentarlo de nuevo.':`No se pudo enviar el enlace (HTTP ${res.status}). Comprueba el email y vuelve a intentarlo.`);
      detail.textContent=`Enlace enviado a ${email}. Revisa también spam. Ábrelo en este dispositivo.`;
      state.supabase='accesible';
    }catch(error){const message=error.name==='AbortError'?'La solicitud tardó demasiado. Comprueba el correo antes de repetirla.':safe(error);detail.textContent=message;report('Login',message);}
    finally{sending=false;btn.disabled=false;btn.textContent='Enviar enlace';btn.removeAttribute('aria-busy');render();}
  };
  document.addEventListener('click',e=>{if(e.target.closest('#loginBtn')){e.preventDefault();window.sendTrainingLabMagicLink();}});
  document.addEventListener('keydown',e=>{if(['authEmail','authPassword'].includes(e.target.id)&&e.key==='Enter'){e.preventDefault();document.querySelector('[data-auth=signin],[data-auth=update]')?.click();}});
  document.addEventListener('DOMContentLoaded',()=>{
    const badge=document.getElementById('buildVersion');if(badge)badge.textContent=state.frontend;
    if(new URLSearchParams(location.search).get('debug')==='1'){
      document.getElementById('diagnostics').hidden=false;
      request(config.url+'/auth/v1/settings',{headers:{apikey:config.key}}).then(r=>{state.supabase=r.ok?'accesible':`HTTP ${r.status}`;render();}).catch(()=>{state.supabase='sin conexión';render();});
    }
    render();
    setTimeout(()=>{if(!state.appReady)report('Inicio','La aplicación no ha terminado de cargar. El acceso por email sigue disponible. Recarga con conexión.');},15000);
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
