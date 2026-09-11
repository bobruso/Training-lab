import {buildKilometerSplits,finite,isMoving,normalizeRunningSamples,round} from './running-samples.js';
import {assessPaceRegularity,cadenceSummary,compareDistanceHalves,dataQuality,elevationSummary,estimateCardiacDrift,pauseSummary} from './running-metrics.js';
import {buildRunningReport} from './running-report.js';

export {normalizeRunningSamples,buildKilometerSplits} from './running-samples.js';
export {assessPaceRegularity,compareDistanceHalves,estimateCardiacDrift} from './running-metrics.js';

export function analyzeRunningSession(points=[],summary={}){
  const samples=normalizeRunningSamples(points);
  if(samples.length<2)return{summaryPatch:{runningAnalysisVersion:'running-v1'},report:null,details:null};
  const sampleDistanceM=Number(samples.at(-1)?.cumulativeM)||0,distanceKm=finite(summary.distanceKm)&&Number(summary.distanceKm)>0?Number(summary.distanceKm):sampleDistanceM/1000,durationSec=finite(summary.durationSec)?Number(summary.durationSec):Number(samples.at(-1)?.tSec)||0;
  const movingSec=samples.reduce((n,x)=>n+(isMoving(x)?Number(x.dt)||0:0),0),elapsedPace=distanceKm>0&&durationSec>0?durationSec/distanceKm:null,movingPace=distanceKm>0&&movingSec>0?movingSec/distanceKm:(distanceKm>0&&finite(summary.movingTimeSec)?Number(summary.movingTimeSec)/distanceKm:null);
  const splitData=buildKilometerSplits(samples),regularity=assessPaceRegularity(splitData.splits),halves=compareDistanceHalves(samples),drift=estimateCardiacDrift(samples,halves),elevation=elevationSummary(samples),cadence=cadenceSummary(samples),pauses=pauseSummary(samples),quality=dataQuality(samples);
  const patch={runningAnalysisVersion:'running-v1',movingTimeSec:round(movingSec,0),avgPaceSecKm:round(movingPace,1),avgPaceElapsedSecKm:round(elapsedPace,1),runningSplitCount:splitData.fullCount,fastestKmIndex:splitData.fastest?.index??null,fastestKmPaceSec:round(splitData.fastest?.paceSecKm,1),slowestKmIndex:splitData.slowest?.index??null,slowestKmPaceSec:round(splitData.slowest?.paceSecKm,1),paceRegularityPct:regularity.cvPct,paceRegularityLabel:regularity.label,halfSplitLevel:halves.available?halves.level:null,secondHalfPaceChangePct:halves.available?halves.paceChangePct:null,cardiacDriftPct:drift.available?drift.driftPct:null,cardiacDriftLabel:drift.available?drift.label:null,elevationGainM:elevation.available?elevation.gainM:summary.elevationGainM??null,elevationLossM:elevation.available?elevation.lossM:null,avgCadenceSpm:cadence.available?cadence.avgSpm:null,p95CadenceSpm:cadence.available?cadence.p95Spm:null,pauseSec:pauses.pauseSec,stopCount:pauses.stopCount,runningDataQuality:quality.label};
  const merged={...summary,...patch,distanceKm,durationSec,movingTimeSec:Number(patch.movingTimeSec||summary.movingTimeSec||movingSec)};
  const deep={splits:splitData,regularity,halves,drift,elevation,cadence,pauses,quality};
  return{summaryPatch:patch,report:buildRunningReport(merged,deep),details:deep};
}
