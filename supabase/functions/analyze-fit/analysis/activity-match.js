const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

export function scoreActivityMatch(fit={},candidate={}){
  const fitStart=Date.parse(fit.startedAt||'');
  const candidateStart=Date.parse(candidate.started_at||'');
  if(!Number.isFinite(fitStart)||!Number.isFinite(candidateStart))return null;
  const startDiffMin=Math.abs(fitStart-candidateStart)/60000;
  if(startDiffMin>12)return null;
  const fitDuration=finite(fit.durationMin)?Number(fit.durationMin):null;
  const candDuration=finite(candidate.duration_min)?Number(candidate.duration_min):null;
  let durationDiffMin=null;
  if(fitDuration&&candDuration){durationDiffMin=Math.abs(fitDuration-candDuration);const tolerance=Math.max(6,fitDuration*.15,candDuration*.15);if(durationDiffMin>tolerance)return null;}
  const fitDistance=finite(fit.distanceKm)&&Number(fit.distanceKm)>0?Number(fit.distanceKm):null;
  const candDistance=finite(candidate.distance_km)&&Number(candidate.distance_km)>0?Number(candidate.distance_km):null;
  let distanceDiffKm=null;
  if(fitDistance&&candDistance){distanceDiffKm=Math.abs(fitDistance-candDistance);const tolerance=Math.max(.75,fitDistance*.20,candDistance*.20);if(distanceDiffKm>tolerance)return null;}
  const fitHr=finite(fit.avgHr)?Number(fit.avgHr):null,candHr=finite(candidate.avg_hr)?Number(candidate.avg_hr):null,hrDiff=fitHr&&candHr?Math.abs(fitHr-candHr):null;
  if(hrDiff!==null&&hrDiff>30)return null;
  const startScore=startDiffMin/12,durationScore=durationDiffMin===null?.22:durationDiffMin/Math.max(6,(fitDuration||candDuration||40)*.15),distanceScore=distanceDiffKm===null?.16:distanceDiffKm/Math.max(.75,(fitDistance||candDistance||4)*.20),hrScore=hrDiff===null?.08:Math.min(1,hrDiff/30),score=startScore*.55+durationScore*.22+distanceScore*.18+hrScore*.05;
  return{score:+score.toFixed(4),startDiffMin:+startDiffMin.toFixed(2),durationDiffMin:durationDiffMin===null?null:+durationDiffMin.toFixed(2),distanceDiffKm:distanceDiffKm===null?null:+distanceDiffKm.toFixed(3),hrDiff};
}
export function chooseActivityMatch(fit={},candidates=[]){const ranked=(Array.isArray(candidates)?candidates:[]).map(candidate=>({candidate,match:scoreActivityMatch(fit,candidate)})).filter(x=>x.match).sort((a,b)=>a.match.score-b.match.score);if(!ranked.length)return null;const best=ranked[0],second=ranked[1];if(best.match.score>.72)return null;if(second&&second.match.score-best.match.score<.12)return null;return{activity:best.candidate,...best.match};}
