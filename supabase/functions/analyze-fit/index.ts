import { createClient } from "@supabase/supabase-js";
import FitParser from "fit-file-parser";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ts(v: unknown): number | null {
  if (!v) return null;
  if (v instanceof Date) return v.getTime();
  const d = new Date(String(v));
  const n = d.getTime();
  return Number.isFinite(n) ? n : null;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor((a.length - 1) * p)));
  return a[idx];
}

function avg(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function haversineM(a: any, b: any) {
  if (a?.lat == null || a?.lon == null || b?.lat == null || b?.lon == null) return 0;
  const R = 6371000, toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function normalizeCoord(v: unknown) {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) > 180 ? n * (180 / 2147483648) : n;
}

function episodeCount(points: Array<{t:number,s:number}>, cutoff: number, minSeconds = 1.5) {
  let count = 0, start: number | null = null, last: number | null = null;
  for (const p of points) {
    if (p.s >= cutoff) {
      if (start == null) start = p.t;
      last = p.t;
    } else if (start != null && last != null) {
      if ((last - start) / 1000 >= minSeconds) count++;
      start = last = null;
    }
  }
  if (start != null && last != null && (last - start) / 1000 >= minSeconds) count++;
  return count;
}

function makeReport(m: any) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  if (m.highIntensityShare >= 0.18) strengths.push(`Volumen alto de trabajo intenso: ${Math.round(m.highIntensityM)} m (${(m.highIntensityShare*100).toFixed(1)} % de la distancia).`);
  if (m.absoluteSprintCount >= 6) strengths.push(`Buena repetición de esfuerzos rápidos: ${m.absoluteSprintCount} esfuerzos por encima de 18 km/h.`);
  if (m.metersPerMovingMin >= 85) strengths.push(`Ritmo de trabajo elevado: ${m.metersPerMovingMin.toFixed(1)} m/min en movimiento.`);
  if (m.hrZone45Share >= 0.7) improvements.push(`Carga cardiovascular muy alta: ${(m.hrZone45Share*100).toFixed(0)} % del tiempo en Z4–Z5; conviene vigilar recuperación y confirmar la FCmáx configurada.`);
  if (m.first10MinM && m.first10MinM / 10 > m.metersPerMovingMin * 1.08) improvements.push(`Salida especialmente intensa en los primeros 10 minutos; puede interesar dosificar algo mejor el inicio.`);
  if (!strengths.length) strengths.push("Sesión completada con carga útil para construir el histórico individual.");
  if (!improvements.length) improvements.push("Seguir acumulando sesiones comparables para valorar tendencias personales con más fiabilidad.");
  const analysis = `Sesión de ${m.distanceKm.toFixed(2)} km y ${Math.round(m.movingTimeSec/60)} min en movimiento, con ${Math.round(m.highIntensityM)} m de alta intensidad. La FC media fue ${m.avgHr || "—"} ppm y la máxima ${m.maxHr || "—"} ppm. El valor más útil será comparar estos datos contra tus próximas sesiones, especialmente trabajo producido por minuto y coste cardiovascular.`;
  return {analysis, strengths, improvements};
}

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const token = auth.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const fitFileId = body?.fit_file_id;
    if (!fitFileId) return json({ error: "fit_file_id is required" }, 400);

    const { data: fitRow, error: fitError } = await supabase
      .from("fit_files")
      .select("id,user_id,activity_id,storage_path,original_name")
      .eq("id", fitFileId)
      .single();
    if (fitError || !fitRow) return json({ error: "FIT record not found" }, 404);
    if (fitRow.user_id !== userId) return json({ error: "Forbidden" }, 403);
    if (!fitRow.activity_id || !fitRow.storage_path) return json({ error: "FIT record is incomplete" }, 400);

    await supabase.from("fit_files").update({ parse_status: "processing", parse_error: null }).eq("id", fitFileId);

    try {
      const { data: blob, error: dlError } = await supabase.storage.from("fit-files").download(fitRow.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message || "Could not download FIT");
      const bytes = await blob.arrayBuffer();

      const parser = new FitParser({ mode: "list", speedUnit: "km/h", lengthUnit: "km", elapsedRecordField: true, force: true });
      const parsed: any = await parser.parseAsync(bytes);
      const records: any[] = Array.isArray(parsed.records) ? parsed.records : [];
      const sessions: any[] = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      const session = sessions[0] || {};
      if (!records.length && !sessions.length) throw new Error("No activity records found in FIT");

      const pts = records.map((r: any) => {
        const speed = num(r.enhanced_speed ?? r.speed) ?? 0;
        const time = ts(r.timestamp);
        const distanceKm = num(r.distance);
        const lat = normalizeCoord(r.position_lat);
        const lon = normalizeCoord(r.position_long);
        return { t: time, speed, distanceKm, hr: num(r.heart_rate), lat, lon, altitudeKm: num(r.enhanced_altitude ?? r.altitude) };
      }).filter((p: any) => p.t != null).sort((a: any,b: any)=>a.t-b.t);

      const speeds = pts.map((p:any)=>p.speed).filter((v:number)=>Number.isFinite(v) && v >= 0 && v < 80);
      const rawTop = speeds.length ? Math.max(...speeds) : (num(session.max_speed) ?? 0);
      const p99 = percentile(speeds, .99);
      const top5 = [...speeds].sort((a,b)=>b-a).slice(0,5);
      const robustTop = top5.length ? avg(top5) : p99;
      const relativeCutoff = Math.max(15.5, robustTop * .82);

      let movingSec = 0, highIntensityM = 0, first10MinM = 0, elevationGainM = 0;
      const speedZones = [
        {name:"Caminar",min:0,max:7,seconds:0,distance_m:0},
        {name:"Trote",min:7,max:14.4,seconds:0,distance_m:0},
        {name:"Carrera",min:14.4,max:19.8,seconds:0,distance_m:0},
        {name:"Alta velocidad",min:19.8,max:25.2,seconds:0,distance_m:0},
        {name:"Muy alta velocidad",min:25.2,max:999,seconds:0,distance_m:0},
      ];
      const hrValues = pts.map((p:any)=>p.hr).filter((v:any)=>v != null) as number[];
      const profileRes = await supabase.from("profiles").select("hr_max_bpm").eq("user_id",userId).maybeSingle();
      const recordedMaxHr = hrValues.length ? Math.max(...hrValues) : (num(session.max_heart_rate) ?? null);
      const refMaxHr = num(profileRes.data?.hr_max_bpm) ?? recordedMaxHr ?? 180;
      const hrBounds = [0.5,0.6,0.7,0.8,0.9,1.01].map(x=>refMaxHr*x);
      const hrZones = [1,2,3,4,5].map((z,i)=>({zone:z,min_bpm:Math.round(hrBounds[i]),max_bpm:Math.round(hrBounds[i+1]),seconds:0}));
      let accelCount = 0, decelCount = 0;

      for (let i=1;i<pts.length;i++) {
        const a=pts[i-1], b=pts[i];
        const dt=Math.max(0,Math.min(10,(b.t-a.t)/1000)); if(!dt) continue;
        let dm=0;
        if(a.distanceKm!=null && b.distanceKm!=null && b.distanceKm>=a.distanceKm) dm=(b.distanceKm-a.distanceKm)*1000;
        else dm=haversineM(a,b);
        if (b.speed > .5) movingSec += dt;
        if (b.speed >= 13) highIntensityM += dm;
        if ((b.t-pts[0].t) <= 600000) first10MinM += dm;
        const z=speedZones.find((x:any)=>b.speed>=x.min && b.speed<x.max); if(z){z.seconds+=dt;z.distance_m+=dm;}
        if (b.hr!=null) {
          const zi=Math.min(4,Math.max(0,Math.floor((b.hr/refMaxHr-.5)/.1)));
          if(b.hr>=refMaxHr*.5) hrZones[zi].seconds+=dt;
        }
        const acc=((b.speed-a.speed)/3.6)/dt; if(acc>=.7)accelCount++; if(acc<=-.7)decelCount++;
        if(a.altitudeKm!=null && b.altitudeKm!=null){const gain=(b.altitudeKm-a.altitudeKm)*1000;if(gain>0&&gain<30)elevationGainM+=gain;}
      }

      const totalDurationSec = num(session.total_elapsed_time ?? session.total_timer_time) ?? (pts.length>1 ? (pts.at(-1).t-pts[0].t)/1000 : 0);
      const distanceKm = num(session.total_distance) ?? (pts.length && pts.at(-1).distanceKm!=null ? pts.at(-1).distanceKm : 0);
      const avgHr = Math.round(num(session.avg_heart_rate) ?? avg(hrValues));
      const maxHr = Math.round(recordedMaxHr ?? 0);
      const calories = Math.round(num(session.total_calories) ?? 0);
      const absoluteSprintCount = episodeCount(pts.map((p:any)=>({t:p.t,s:p.speed})),18);
      const sprintCount = episodeCount(pts.map((p:any)=>({t:p.t,s:p.speed})),relativeCutoff);
      const metersPerMovingMin = movingSec ? distanceKm*1000/(movingSec/60) : 0;
      const highIntensityShare = distanceKm ? highIntensityM/(distanceKm*1000) : 0;
      const zoneTotal = hrZones.reduce((s:any,z:any)=>s+z.seconds,0);
      const hrZone45Share = zoneTotal ? (hrZones[3].seconds+hrZones[4].seconds)/zoneTotal : 0;
      const avgPaceSecKm = distanceKm && movingSec ? Math.round(movingSec/distanceKm) : null;

      const step=Math.max(1,Math.ceil(pts.length/1200));
      const trackPoints=pts.filter((_:any,i:number)=>i%step===0).map((p:any)=>({t:p.t,lat:p.lat,lon:p.lon,hr:p.hr,speed_kmh:+p.speed.toFixed(2)})).filter((p:any)=>p.lat!=null&&p.lon!=null);

      const summary = {
        distanceKm:+distanceKm.toFixed(3), durationSec:Math.round(totalDurationSec), movingTimeSec:Math.round(movingSec),
        avgHr:avgHr||null, maxHr:maxHr||null, calories:calories||null, rawTopKmh:+rawTop.toFixed(2), robustTopKmh:+robustTop.toFixed(2), p99TopKmh:+p99.toFixed(2),
        relativeSprintCutoffKmh:+relativeCutoff.toFixed(2), sprintCount, absoluteSprintCount, highIntensityM:+highIntensityM.toFixed(1), highIntensityShare:+highIntensityShare.toFixed(4),
        metersPerMovingMin:+metersPerMovingMin.toFixed(1), accelerations:accelCount, decelerations:decelCount, first10MinM:+first10MinM.toFixed(1), elevationGainM:+elevationGainM.toFixed(1), referenceMaxHr:Math.round(refMaxHr),
        hrZone45Share:+hrZone45Share.toFixed(4), parser:"fit-file-parser@5.0.2"
      };
      const report=makeReport({...summary,distanceKm,movingTimeSec:movingSec,avgHr,maxHr,highIntensityM,highIntensityShare,metersPerMovingMin,hrZone45Share,first10MinM});
      const startMs = pts[0]?.t ?? ts(session.start_time ?? session.timestamp);
      const startedAt = startMs ? new Date(startMs).toISOString() : null;
      const activityDate = startedAt ? startedAt.slice(0,10) : new Date().toISOString().slice(0,10);

      const { error: actError } = await supabase.from("activities").update({
        activity_date:activityDate, started_at:startedAt, duration_min:+(totalDurationSec/60).toFixed(2), moving_time_min:+(movingSec/60).toFixed(2),
        distance_km:+distanceKm.toFixed(3), avg_hr:avgHr||null, max_hr:maxHr||null, calories:calories||null,
        top_speed_kmh:+rawTop.toFixed(2), high_intensity_m:+highIntensityM.toFixed(1), sprint_count:sprintCount, absolute_sprint_count:absoluteSprintCount,
        avg_pace_sec_km:avgPaceSecKm, elevation_gain_m:+elevationGainM.toFixed(1), metrics:summary
      }).eq("id",fitRow.activity_id);
      if(actError) throw new Error(actError.message);

      const { error: analysisError } = await supabase.from("activity_analysis").upsert({
        activity_id:fitRow.activity_id,user_id:userId,analysis_version:"fit-v1",summary,hr_zones:hrZones,speed_zones:speedZones,track_points:trackPoints,report,sample_count:pts.length,analyzed_at:new Date().toISOString(),updated_at:new Date().toISOString()
      },{onConflict:"activity_id"});
      if(analysisError) throw new Error(analysisError.message);

      await supabase.from("fit_files").update({parser_version:"fit-v1 / fit-file-parser@5.0.2",parse_status:"parsed",parse_error:null,analyzed_at:new Date().toISOString(),analysis_activity_id:fitRow.activity_id}).eq("id",fitFileId);

      return json({ ok:true, activity_id:fitRow.activity_id, summary, report, track_points:trackPoints.length });
    } catch (e) {
      const message=e instanceof Error?e.message:String(e);
      await supabase.from("fit_files").update({parse_status:"error",parse_error:message}).eq("id",fitFileId);
      return json({ error:message }, 422);
    }
  }
};
