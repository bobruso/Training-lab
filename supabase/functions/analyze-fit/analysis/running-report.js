import {finite,paceText,round} from './running-samples.js';

export function buildRunningReport(m,deep){
  const {splits,regularity,halves,drift,elevation,cadence,pauses,quality}=deep,strengths=[],improvements=[],highlights=[];
  if(halves.available&&halves.level==='negative')strengths.push(`Terminaste la segunda mitad ${Math.abs(halves.paceChangePct).toFixed(1)} % más rápida que la primera.`);
  if(regularity.available&&['very_stable','stable'].includes(regularity.level))strengths.push(`Ritmo ${regularity.label.toLowerCase()}: variabilidad robusta ${regularity.cvPct.toFixed(1)} % entre kilómetros completos.`);
  if(drift.available&&drift.comparable&&['none','low'].includes(drift.level))strengths.push(`Deriva cardíaca baja (${drift.driftPct.toFixed(1)} %) con mitades comparables.`);
  if(halves.available&&halves.level==='positive'&&halves.paceChangePct>=4)improvements.push(`La segunda mitad fue ${halves.paceChangePct.toFixed(1)} % más lenta; interprétalo junto al desnivel, paradas y objetivo del rodaje.`);
  if(drift.available&&drift.comparable&&drift.level==='notable')improvements.push(`La eficiencia ritmo/FC cayó ${drift.driftPct.toFixed(1)} % entre mitades. Es una observación del entrenamiento, no un diagnóstico.`);
  if(regularity.available&&regularity.level==='very_variable')improvements.push(`El ritmo varió bastante entre kilómetros (CV ${regularity.cvPct.toFixed(1)} %); revisa si era intencional por terreno o tipo de sesión.`);
  if(!strengths.length)strengths.push('Sesión útil para construir tu referencia individual de running.');
  if(!improvements.length)improvements.push('No aparece una señal aislada que justifique una conclusión fuerte; compara próximas salidas equivalentes.');
  if(splits.fastest)highlights.push(`Km ${splits.fastest.index} fue el más rápido: ${paceText(splits.fastest.paceSecKm)}.`);
  if(splits.slowest&&splits.slowest.index!==splits.fastest?.index)highlights.push(`Km ${splits.slowest.index} fue el más lento: ${paceText(splits.slowest.paceSecKm)}.`);
  if(cadence.available)highlights.push(`Cadencia media registrada: ${cadence.avgSpm.toFixed(0)} spm.`);
  if(elevation.available)highlights.push(`Desnivel filtrado: +${Math.round(elevation.gainM)} / -${Math.round(elevation.lossM)} m.`);
  const pace=finite(m.avgPaceSecKm)?paceText(m.avgPaceSecKm):'ritmo no disponible',halfSentence=halves.available?` ${halves.label}: ${halves.paceChangePct>=0?'+':''}${halves.paceChangePct.toFixed(1)} % de cambio de ritmo en la segunda mitad.`:'';
  const driftSentence=drift.available?` Deriva ritmo/FC estimada: ${drift.driftPct.toFixed(1)} % (${drift.label.toLowerCase()})${drift.comparable?'':', con comparabilidad limitada'}.`:'';
  const analysis=`Carrera de ${Number(m.distanceKm||0).toFixed(2)} km y ${Math.round(Number(m.movingTimeSec||0)/60)} min en movimiento, a ${pace}.${halfSentence}${driftSentence}`;
  const partial=splits.partial;
  const sections={
    resumen:{distancia_km:round(m.distanceKm,2),duracion_min:round(Number(m.durationSec||0)/60,1),tiempo_movimiento_min:round(Number(m.movingTimeSec||0)/60,1),ritmo_movimiento_s_km:round(m.avgPaceSecKm,1),ritmo_transcurrido_s_km:round(m.avgPaceElapsedSecKm,1),paradas_s:pauses.pauseSec,paradas_detectadas:pauses.stopCount},
    splits:{km_completos:splits.fullCount,km_mas_rapido:splits.fastest?.index??null,ritmo_km_mas_rapido_s:round(splits.fastest?.paceSecKm,1),km_mas_lento:splits.slowest?.index??null,ritmo_km_mas_lento_s:round(splits.slowest?.paceSecKm,1),tramo_parcial_km:partial?partial.distanceKm:null,detalle:splits.splits},
    regularidad:{lectura:regularity.label,variabilidad_pct:regularity.cvPct,ritmo_mediano_s_km:regularity.medianPaceSecKm,dispersion_robusta_s:regularity.robustSpreadSec,kilometros_usados:regularity.usedSplits??regularity.fullSplits},
    mitades:{lectura:halves.available?halves.label:halves.reason,cambio_ritmo_segunda_mitad_pct:halves.available?halves.paceChangePct:null,primera_mitad_ritmo_s_km:halves.available?halves.first.paceSecKm:null,segunda_mitad_ritmo_s_km:halves.available?halves.second.paceSecKm:null,primera_mitad_fc:halves.available?halves.first.avgHr:null,segunda_mitad_fc:halves.available?halves.second.avgHr:null},
    cardiaco:{deriva_disponible:drift.available,lectura:drift.label,deriva_pct:drift.driftPct,mitades_comparables:drift.available?drift.comparable:false,fc_media:m.avgHr??null,fc_maxima:m.maxHr??null,nota:drift.reason??null},
    elevacion:{disponible:elevation.available,desnivel_positivo_m:elevation.gainM,desnivel_negativo_m:elevation.lossM,elevacion_min_m:elevation.minM,elevacion_max_m:elevation.maxM},
    cadencia:{disponible:cadence.available,cadencia_media_spm:cadence.avgSpm,cadencia_p95_spm:cadence.p95Spm,muestras:cadence.samples},
    calidad:{lectura:quality.label,muestras_temporales:quality.temporalSamples,muestras_gps:quality.gpsSamples,muestras_fc:quality.hrSamples,muestras_cadencia:quality.cadenceSamples,muestras_altitud:quality.altitudeSamples}
  };
  return{version:'running-report-v1',sport:'run',analysis,strengths:strengths.slice(0,3),improvements:improvements.slice(0,3),highlights:highlights.slice(0,5),observations:[drift.available&&!drift.comparable?drift.reason:null,elevation.available?'El desnivel aplica un filtro simple para reducir ruido altimétrico.':null].filter(Boolean),sections,dataQuality:quality};
}
