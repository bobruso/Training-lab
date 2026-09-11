import {NUTRITION_PRESETS} from './nutrition-tracker.js?v=20260911food103';
import {authState,dayKey,edge,esc,rest} from './training-data.js?v=20260911overhaul110';

const CSS='./ux-overhaul.css?v=20260911overhaul110';
const HIDDEN_PAGES=['registro','entrenos','checkin','recuperacion'];
const ICONS={Fútbol:'⚽',Carrera:'🏃',Running:'🏃',Ciclismo:'🚴',Fuerza:'🏋️',Caminata:'🚶',Actividad:'🏃'};
const FOOD_IMAGES={
 yogur_cereales:'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=480&q=76',
 batido_proteina:'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=480&q=76',
 sandwich_atun_huevo:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=480&q=76',
 ensalada_pasta_atun:'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=480&q=76',
 arroz_carne_huevo:'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=480&q=76',
 arroz_atun_huevo:'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=480&q=76',
 arroz_pescado_huevo:'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=480&q=76',
 pasta_atun:'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=480&q=76',
 carne_patatas:'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=480&q=76',
 tortilla_patatas:'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=480&q=76',
 huevos_rotos:'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=480&q=76',
 sopa_fideos:'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=480&q=76',
 bocadillo:'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=480&q=76',
 tapas_bravas:'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=480&q=76',
 pizza:'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=480&q=76',
 hamburguesa_patatas:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=480&q=76',
 nueces:'https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&w=480&q=76',
 gazpacho:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=480&q=76',
 queso:'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=480&q=76'
};
let installed=false,foodObserver=null,uiObserver=null;

function ensureCss(){if(document.querySelector('link[data-ux-overhaul]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.uxOverhaul='1';document.head.append(l)}
function navButton(page,label){const b=document.createElement('button');b.dataset.page=page;b.textContent=label;return b}
function ensurePage(id,afterId,title,subtitle){let p=document.getElementById(id);if(p)return p;p=document.createElement('section');p.className='page';p.id=id;p.innerHTML=`<div class="sectionhead"><div><h2>${esc(title)}</h2><span class="muted">${esc(subtitle)}</span></div></div>`;document.getElementById(afterId)?.insertAdjacentElement('afterend',p);return p}
function moveCardByChild(childId,destination){const child=document.getElementById(childId),card=child?.closest('.card');if(card&&destination&&!destination.contains(card))destination.append(card);return card}
function hideLegacyNav(){document.querySelectorAll('nav [data-page],.bottom [data-page]').forEach(b=>{if(HIDDEN_PAGES.includes(b.dataset.page)||b.dataset.page==='ajustes')b.hidden=true})}
function setNavLabel(page,label){document.querySelectorAll(`[data-page="${page}"]`).forEach(b=>b.textContent=label)}
function installNavigation(){
 setNavLabel('hoy','Deporte');setNavLabel('semana','Consejos');
 const nav=document.querySelector('nav');if(nav){
  const comer=nav.querySelector('[data-page="comer"]');if(!nav.querySelector('[data-page="perfil"]'))comer?.insertAdjacentElement('afterend',navButton('perfil','Mi perfil'));
  const sueno=nav.querySelector('[data-page="sueno"]');if(!nav.querySelector('[data-page="estado"]'))sueno?.insertAdjacentElement('afterend',navButton('estado','Mi estado'));
 }
 hideLegacyNav();
 const bottom=[...document.querySelectorAll('.bottom button')];if(bottom.length>=5){const spec=[['hoy','DEPORTE'],['semana','CONSEJOS'],['comer','COMER'],['estado','ESTADO'],['futbol','FÚTBOL']];bottom.slice(0,5).forEach((b,i)=>{b.hidden=false;b.dataset.page=spec[i][0];b.textContent=spec[i][1]})}
}
function buildProfile(){
 const p=ensurePage('perfil','comer','Mi perfil','datos personales, peso y disponibilidad para jugar');if(p.dataset.overhaulBuilt)return;p.dataset.overhaulBuilt='1';
 p.insertAdjacentHTML('beforeend','<div class="profile-overview card"><div><span class="eyebrow">Perfil deportivo</span><h2>Tu contexto</h2><p class="muted">Tus datos personales y decisiones que cambian el plan viven aquí.</p></div><div class="profile-chips"><span>Objetivo · ganar masa muscular</span><span>Horario sueño · 05:00–13:00 aprox.</span><span>Entreno · casa + fútbol + cardio</span></div></div><div class="profile-moved" data-profile-moved></div>');
 const slot=p.querySelector('[data-profile-moved]'),weightGrid=document.querySelector('#registro > .grid.g2');if(weightGrid)slot.append(weightGrid);
 const playCard=document.querySelector('#entrenos > .section.grid.g2');if(playCard)slot.append(playCard);
 const matchPanel=document.getElementById('matchDayPanel');if(matchPanel)slot.append(matchPanel);
 const strength=moveCardByChild('setExercise',document.getElementById('gym'));if(strength){strength.classList.add('gym-log-card');strength.querySelector('.eyebrow').textContent='Registro de fuerza';strength.querySelector('h2').textContent='Apunta una serie si quieres afinar la progresión'}
}
function moveFitImporter(){const settings=document.getElementById('ajustes'),input=document.getElementById('fitInput');if(!settings||!input)return false;const card=input.closest('.card');if(!card)return false;card.classList.add('settings-fit-import');card.querySelector('h2').textContent='Importar archivo .FIT';const grid=settings.querySelector('.grid');if(grid&&!grid.contains(card))grid.prepend(card);return true}
function installGear(){
 const top=document.querySelector('.top');if(!top||top.querySelector('.settings-gear'))return;
 const wrap=document.createElement('div');wrap.className='settings-gear';wrap.innerHTML='<button type="button" class="gear-button" aria-label="Menú de cuenta" aria-expanded="false">⚙</button><div class="gear-menu" hidden><button type="button" data-gear-page="perfil">👤 Mi perfil</button><button type="button" data-gear-page="ajustes">⚙ Ajustes</button><button type="button" data-gear-update>↻ Actualizar app</button></div>';top.append(wrap);
 const button=wrap.querySelector('.gear-button'),menu=wrap.querySelector('.gear-menu');button.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden))};wrap.querySelectorAll('[data-gear-page]').forEach(b=>b.onclick=()=>{menu.hidden=true;window.navTo?.(b.dataset.gearPage)});wrap.querySelector('[data-gear-update]').onclick=()=>{menu.hidden=true;window.navTo?.('ajustes');setTimeout(()=>{document.getElementById('settingsUpdateCard')?.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('settingsCheckUpdate')?.click()},80)};document.addEventListener('click',e=>{if(!wrap.contains(e.target))menu.hidden=true});
 const profile=document.querySelector('.top .profile');if(profile){profile.onclick=null;profile.title='';}
}
function hideOldWeekHero(){const page=document.getElementById('semana');page?.querySelector(':scope > .card.hero')?.classList.add('legacy-now-hidden');const legacyChoice=page?.querySelector(':scope > .section.grid.g2');if(legacyChoice)legacyChoice.classList.add('legacy-choice-hidden')}
function hideLegacyPages(){HIDDEN_PAGES.forEach(id=>document.getElementById(id)?.classList.add('legacy-page-hidden'));hideLegacyNav()}
function decorateFood(){document.querySelectorAll('.nutrition-food-btn[data-preset-id]').forEach(b=>{if(b.querySelector('.nutrition-food-photo'))return;const src=FOOD_IMAGES[b.dataset.presetId];if(!src)return;const img=document.createElement('img');img.className='nutrition-food-photo';img.src=src;img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';b.prepend(img)})}
function installFoodObserver(){const root=document.querySelector('.nutrition-tracker-root');if(!root)return false;decorateFood();foodObserver?.disconnect();foodObserver=new MutationObserver(decorateFood);foodObserver.observe(root,{childList:true,subtree:true});return true}
function findPreset(id){for(const group of Object.values(NUTRITION_PRESETS))for(const item of group)if(item.id===id)return item;return null}
function mealTypeFromPresetButton(b){const cat=b.dataset.presetCat;if(cat!=='breakfast')return cat==='breakfast'?'desayuno':cat;if(document.querySelector('.nutrition-mode [data-mode="recena"].on'))return'recena';return'desayuno'}
function toast(text,error=false){let t=document.querySelector('.overhaul-toast');if(!t){t=document.createElement('div');t.className='overhaul-toast';document.body.append(t)}t.textContent=text;t.classList.toggle('is-error',error);t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
async function saveMeal(payload,button){if(button?.dataset.overhaulSaving)return;button&&(button.dataset.overhaulSaving='1',button.disabled=true);try{const out=await edge('meal-log',payload);if(out?.meal){window.cloudMeals=window.cloudMeals||[];window.cloudMeals.unshift(out.meal)}document.dispatchEvent(new Event('visibilitychange'));toast(`Añadido: ${payload.title}`);return out}catch(e){toast(e?.message||'No se pudo guardar el plato.',true);throw e}finally{if(button){delete button.dataset.overhaulSaving;button.disabled=false}}}
function installMealFix(){document.addEventListener('click',async e=>{
 const preset=e.target.closest?.('.nutrition-food-btn[data-preset-id]');if(preset){e.preventDefault();e.stopImmediatePropagation();const item=findPreset(preset.dataset.presetId);if(!item)return;try{await saveMeal({meal_type:mealTypeFromPresetButton(preset),title:item.title,protein_g:item.protein,carbs_g:item.carbs,fat_g:item.fat,source:'manual',metadata:{preset_id:item.id}},preset)}catch{}return}
 const other=e.target.closest?.('[data-add-other]');if(other){e.preventDefault();e.stopImmediatePropagation();const form=other.closest('.nutrition-other-form'),title=form?.querySelector('[data-desc]')?.value?.trim();if(!title){toast('Escribe el plato.',true);return}const cat=other.dataset.addOther,type=cat==='breakfast'?(document.querySelector('.nutrition-mode [data-mode="recena"].on')?'recena':'desayuno'):cat;try{await saveMeal({meal_type:type,title,protein_g:form.querySelector('[data-p]')?.value,carbs_g:form.querySelector('[data-c]')?.value,fat_g:form.querySelector('[data-f]')?.value,source:'manual'},other)}catch{}return}
 const ai=e.target.closest?.('[data-ai-add]');if(ai){e.preventDefault();e.stopImmediatePropagation();const modal=ai.closest('.food-camera-modal');if(!modal)return;const payload={meal_type:modal.querySelector('[data-ai-meal-type]')?.value,title:modal.querySelector('[data-ai-title]')?.value?.trim(),protein_g:modal.querySelector('[data-ai-protein]')?.value,carbs_g:modal.querySelector('[data-ai-carbs]')?.value,fat_g:modal.querySelector('[data-ai-fat]')?.value,source:'ai_photo',metadata:{via:'gemini_photo'}};try{await saveMeal(payload,ai);modal.querySelector('.food-camera-close')?.click()}catch{}return}
 const del=e.target.closest?.('.nutrition-log-row [data-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();del.disabled=true;try{await edge('meal-log',{id:del.dataset.delete},'DELETE');document.dispatchEvent(new Event('visibilitychange'));toast('Registro eliminado')}catch(err){toast(err?.message||'No se pudo eliminar.',true)}finally{del.disabled=false}}
 },true)}
function enhanceActivityIcons(){document.querySelectorAll('.activity-card,.activity-detail-header').forEach(card=>{const text=card.textContent||'',icon=card.querySelector('.activity-icon');if(!icon)return;for(const[label,emoji]of Object.entries(ICONS))if(text.includes(label)){icon.textContent=emoji;break}})}
function installIconObserver(){enhanceActivityIcons();const root=document.getElementById('hoy');if(root){uiObserver?.disconnect();uiObserver=new MutationObserver(enhanceActivityIcons);uiObserver.observe(root,{subtree:true,childList:true})}}
async function lockFootballUi(){
 if(!authState()?.access_token)return;let rows=[];try{rows=await rest('daily_status',{select:'day,football_override,football_time',day:`eq.${dayKey()}`,limit:1})}catch{return}const s=rows?.[0],confirmed=s?.football_override===true,time=s?.football_time?String(s.football_time).slice(0,5):null;
 const page=document.getElementById('futbol');const headerBtn=page?.querySelector('.sectionhead [onclick="setFootball(true)"]');if(headerBtn)headerBtn.hidden=confirmed;
 const hero=page?.querySelector('.football-hero');if(hero){hero.classList.toggle('match-locked',!!(confirmed&&time));let lock=hero.querySelector('.match-lock-summary');if(confirmed&&time){if(!lock){lock=document.createElement('div');lock.className='match-lock-summary';hero.querySelector('.grid > div:last-child')?.append(lock)}lock.innerHTML=`<span>Partido confirmado</span><strong>⚽ ${esc(time)}</strong><small>La hora queda fijada. El partido se registrará solo cuando llegue una actividad real.</small>`}else lock?.remove()}
 const profilePlay=document.querySelector('#perfil [onclick="setFootball(true)"]')?.closest('.card');if(profilePlay){profilePlay.classList.toggle('match-profile-confirmed',!!(confirmed&&time));let note=profilePlay.querySelector('.profile-match-lock');if(confirmed&&time){profilePlay.querySelector('.actions')?.setAttribute('hidden','');if(!note){note=document.createElement('div');note.className='profile-match-lock';profilePlay.append(note)}note.innerHTML=`<b>⚽ Partido confirmado hoy a las ${esc(time)}</b><span>Ya no hace falta volver a confirmar ni cancelar desde esta pantalla.</span>`}else{profilePlay.querySelector('.actions')?.removeAttribute('hidden');note?.remove()}}
 const panel=document.getElementById('matchDayPanel');if(panel){if(confirmed&&time){panel.style.display='none'}else if(confirmed){panel.style.display='block'}}
}
function disableLegacyDone(){window.markTodayDone=()=>toast('El check de Consejos confirma una tarea; las actividades deportivas solo se registran cuando realmente las haces.',false)}
function install(){if(installed)return;installed=true;ensureCss();installNavigation();buildProfile();hideOldWeekHero();hideLegacyPages();installGear();moveFitImporter();installMealFix();disableLegacyDone();let tries=0;const settle=()=>{installNavigation();hideLegacyNav();moveFitImporter();installGear();installFoodObserver();installIconObserver();lockFootballUi();if(tries++<30)setTimeout(settle,350)};settle();document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="futbol"],[data-page="perfil"],[data-page="comer"]'))setTimeout(()=>{lockFootballUi();decorateFood()},80)})}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0)}
