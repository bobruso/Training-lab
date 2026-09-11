from pathlib import Path
path=Path('supabase/functions/analyze-fit/index.ts')
text=path.read_text(encoding='utf-8')
needle='import FitParser from "fit-file-parser";\n'
line='import { analyzeFootballSession } from "./analysis/football.js";\n'
if line not in text:
    if needle not in text: raise SystemExit('import anchor not found')
    text=text.replace(needle,needle+line,1)
old='''      const report = activityType === "gym"\n        ? makeStrengthReport(summary)\n        : makeReport({...summary,distanceKm,movingTimeSec:movingSec,avgHr,maxHr,highIntensityM,highIntensityShare,metersPerMovingMin,hrZone45Share,first10MinM});\n      if(activityType!='gym')report.analysis+=` ${sprintCount} esfuerzos de sprint detectados por el modelo relativo; ${absoluteSprintCount} superaron 18 km/h. Zonas FC ${configuredMax?'basadas en tu FC máxima configurada':'estimadas; configura tu FC máxima para compararlas'}.`;\n'''
# source uses !==; support exact actual block separately
old=old.replace("activityType!='gym'","activityType!=='gym'")
new='''      let footballDeep:any = null;\n      if(activityType==="football" && pts.length){\n        footballDeep = analyzeFootballSession(pts, summary);\n        if(footballDeep?.summaryPatch)Object.assign(summary, footballDeep.summaryPatch);\n      }\n      const report = activityType === "gym"\n        ? makeStrengthReport(summary)\n        : footballDeep?.report || makeReport({...summary,distanceKm,movingTimeSec:movingSec,avgHr,maxHr,highIntensityM,highIntensityShare,metersPerMovingMin,hrZone45Share,first10MinM});\n      if(activityType!=='gym' && !footballDeep)report.analysis+=` ${sprintCount} esfuerzos de sprint detectados por el modelo relativo; ${absoluteSprintCount} superaron 18 km/h. Zonas FC ${configuredMax?'basadas en tu FC máxima configurada':'estimadas; configura tu FC máxima para compararlas'}.`;\n'''
if old not in text: raise SystemExit('report block anchor not found')
text=text.replace(old,new,1)
old='top_speed_kmh:+rawTop.toFixed(2), high_intensity_m:+highIntensityM.toFixed(1), sprint_count:sprintCount, absolute_sprint_count:absoluteSprintCount,'
new='top_speed_kmh:+rawTop.toFixed(2), high_intensity_m:+highIntensityM.toFixed(1), sprint_count:summary.sprintCount, absolute_sprint_count:summary.absoluteSprintCount,'
if old not in text: raise SystemExit('activity fields anchor not found')
text=text.replace(old,new,1)
old='activity_id:fitRow.activity_id,user_id:userId,analysis_version:"fit-v2",summary,hr_zones:hrZones,speed_zones:speedZones,track_points:trackPoints,report,sample_count:pts.length,analyzed_at:new Date().toISOString(),updated_at:new Date().toISOString()'
new='activity_id:fitRow.activity_id,user_id:userId,analysis_version:activityType==="football"&&footballDeep?"fit-v4-football-v1":"fit-v2",summary,hr_zones:hrZones,speed_zones:speedZones,track_points:trackPoints,report,sample_count:pts.length,analyzed_at:new Date().toISOString(),updated_at:new Date().toISOString()'
if old not in text: raise SystemExit('analysis upsert anchor not found')
text=text.replace(old,new,1)
old='parser_version:"fit-v3 / fit-file-parser@5.0.2"';new='parser_version:"fit-v4 / fit-file-parser@5.0.2"'
if old not in text: raise SystemExit('parser anchor not found')
text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')
