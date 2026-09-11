import {authState,edge,esc,finite,rest} from './training-data.js?v=20260911overhaul110';
const CSS='./training-effect.css?v=20260911overhaul110';
let lastId=null,observer=null;
function css(){if(document.querySelector('link[data-training-effect]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.trainingEffect='1';document.head.append(l)}
function meaning(v,kind){const x=Number(v);if(x<1)return'Impacto muy ligero';if(x<2)return'Mantenimiento / estímulo suave';if(x<3)return kind==='aerobic'?'Mejora aeróbica ligera':'Estímulo anaeróbico ligero';if(x<4)return kind==='aerobic'?'Mejora aeróbica clara':'Mejora anaeróbica clara';if(x<5)return'Estímulo alto';return'Estímulo muy alto'}
function meter(v){return`<div class="te-meter"><i style="width:${Math.min(100,Number(v)/5*100)}%"></i></div>`}
async function inject(id){
 if(!id||!authState()?.access_token)return;lastId=id;
 try{
  const rows=await rest('activity_analysis',{select:'activity_id,summary',activity_id:`eq.${id}`,limit:1});
  let s=rows?.[0]?.summary||{},a=s.aerobicTrainingEffect,n=s.anaerobicTrainingEffect;
  if(!finite(a)&&!finite(n)){
   const enriched=await edge('fit-training-effect',{activity_id:id}).catch(()=>null);
   if(enriched?.available){a=enriched.aerobicTrainingEffect;n=enriched.anaerobicTrainingEffect}
  }
  if(!finite(a)&&!finite(n))return;
  const detail=document.getElementById('activityDetailView');if(!detail||detail.hidden)return;
  detail.querySelector('.training-effect-card')?.remove();
  const card=document.createElement('section');card.className='card training-effect-card';
  card.innerHTML=`<div class="training-effect-head"><div><span class="eyebrow">Training Effect · desde el FIT</span><h2>Mejora aeróbica y anaeróbica</h2></div><span class="te-source">dato exportado por el reloj</span></div><div class="training-effect-grid">${finite(a)?`<div><span>Aeróbico</span><b>${Number(a).toFixed(1)}</b>${meter(a)}<small>${esc(meaning(a,'aerobic'))}</small></div>`:''}${finite(n)?`<div><span>Anaeróbico</span><b>${Number(n).toFixed(1)}</b>${meter(n)}<small>${esc(meaning(n,'anaerobic'))}</small></div>`:''}</div><p class="muted small">Training Lab solo muestra estos valores cuando vienen en el archivo FIT. No los reconstruye ni los inventa a partir de la frecuencia cardíaca.</p>`;
  const metrics=detail.querySelector('.activity-detail-metrics');metrics?.insertAdjacentElement('afterend',card);
 }catch{}
}
function install(){css();document.getElementById('homeActivityFeed')?.addEventListener('click',e=>{const c=e.target.closest?.('[data-activity-id]');if(c)setTimeout(()=>inject(c.dataset.activityId),160)},true);observer=new MutationObserver(()=>{const detail=document.getElementById('activityDetailView');if(detail&&!detail.hidden&&lastId&&!detail.querySelector('.training-effect-card'))inject(lastId)});const d=document.getElementById('activityDetailView');if(d)observer.observe(d,{childList:true,subtree:true})}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,0)}
