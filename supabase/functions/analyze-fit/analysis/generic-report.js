export function makeReport(m){
 const strengths=[],improvements=[];
 if(m.highIntensityShare>=.18)strengths.push(`Volumen alto de trabajo intenso: ${Math.round(m.highIntensityM)} m (${(m.highIntensityShare*100).toFixed(1)} % de la distancia).`);
 if(m.absoluteSprintCount>=6)strengths.push(`Buena repetición de esfuerzos rápidos: ${m.absoluteSprintCount} esfuerzos por encima de 18 km/h.`);
 if(m.metersPerMovingMin>=85)strengths.push(`Ritmo de trabajo elevado: ${m.metersPerMovingMin.toFixed(1)} m/min en movimiento.`);
 if(m.hrZone45Share>=.7)improvements.push(`Carga cardiovascular muy alta: ${(m.hrZone45Share*100).toFixed(0)} % del tiempo en Z4–Z5; conviene vigilar recuperación y confirmar la FCmáx configurada.`);
 if(m.first10MinM&&m.first10MinM/10>m.metersPerMovingMin*1.08)improvements.push('Salida especialmente intensa en los primeros 10 minutos; puede interesar dosificar algo mejor el inicio.');
 if(!strengths.length)strengths.push('Sesión completada con carga útil para construir el histórico individual.');
 if(!improvements.length)improvements.push('Seguir acumulando sesiones comparables para valorar tendencias personales con más fiabilidad.');
 const analysis=`Sesión de ${m.distanceKm.toFixed(2)} km y ${Math.round(m.movingTimeSec/60)} min en movimiento, con ${Math.round(m.highIntensityM)} m de alta intensidad. La FC media fue ${m.avgHr||'—'} ppm y la máxima ${m.maxHr||'—'} ppm. El valor más útil será comparar estos datos contra tus próximas sesiones, especialmente trabajo producido por minuto y coste cardiovascular.`;
 return{analysis,strengths,improvements};
}
