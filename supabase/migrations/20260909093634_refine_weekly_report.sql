create or replace function training_lab_private.generate_weekly_reports()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  local_day date;
  week_start_d date;
  week_end_d date;
  gym_n int;
  run_n int;
  run_target int;
  hrv_avg numeric;
  regular_sleep int;
  injury_n int;
  football_n int;
  activity_n int;
  load_v numeric;
  km_v numeric;
  sleep_avg numeric;
  sleep_n int;
  checkin_n int;
  protein_days int;
  weight_first numeric;
  weight_last numeric;
  report_text text;
begin
  for p in select user_id, timezone, protein_target_g from public.profiles loop
    local_day := (now() at time zone coalesce(p.timezone,'Europe/Madrid'))::date;
    if extract(isodow from local_day)::int <> 7 then
      continue;
    end if;
    week_start_d := local_day - 6;
    week_end_d := local_day;

    select
      count(*) filter (where activity_type='gym'),
      count(*) filter (where activity_type='run'),
      count(*) filter (where activity_type='football'),
      count(*),
      coalesce(sum(coalesce(duration_min,0)*coalesce(rpe,0)),0),
      coalesce(sum(coalesce(distance_km,0)),0)
    into gym_n,run_n,football_n,activity_n,load_v,km_v
    from public.activities
    where user_id=p.user_id and activity_date between week_start_d and week_end_d;

    run_target := case when football_n>=3 then 0 when football_n>=2 then 1 else 2 end;
    select avg(total_sleep_min)/60.0,count(total_sleep_min),avg(avg_hrv),
      count(*) filter (where (sleep_start at time zone coalesce(p.timezone,'Europe/Madrid'))::time between time '04:00' and time '06:00'
        and (sleep_end at time zone coalesce(p.timezone,'Europe/Madrid'))::time between time '12:00' and time '14:00')
    into sleep_avg,sleep_n,hrv_avg,regular_sleep
    from (select distinct on (sleep_date) * from public.sleep_records
      where user_id=p.user_id and sleep_date between week_start_d and week_end_d
      order by sleep_date,(source='manual') desc,updated_at desc) nights;
    select count(*) into injury_n from public.injuries where user_id=p.user_id and status='active';

    select count(*) into checkin_n from public.daily_checkins
    where user_id=p.user_id and checkin_date between week_start_d and week_end_d;

    select count(*) into protein_days from (
      select (eaten_at at time zone coalesce(p.timezone,'Europe/Madrid'))::date as d,
             sum(coalesce(protein_g,0)) as protein
      from public.meal_logs
      where user_id=p.user_id
        and (eaten_at at time zone coalesce(p.timezone,'Europe/Madrid'))::date between week_start_d and week_end_d
      group by 1
      having sum(coalesce(protein_g,0)) >= coalesce(p.protein_target_g,130)*0.9
    ) q;

    select weight_kg into weight_first from public.weigh_ins
    where user_id=p.user_id and measured_on between week_start_d and week_end_d
    order by measured_on asc limit 1;
    select weight_kg into weight_last from public.weigh_ins
    where user_id=p.user_id and measured_on between week_start_d and week_end_d
    order by measured_on desc limit 1;

    report_text := format(
      'FUERZA: %s/3\nRUNNING: %s/%s\nFÚTBOL: %s\nCARGA: %s min×RPE\nDISTANCIA: %s km\nSUEÑO MEDIO: %s\nCHECK-INS: %s/7\nDÍAS CON PROTEÍNA ≥90%% OBJETIVO: %s/7\nPESO: %s\n\nRECOMENDACIÓN: %s',
      gym_n,run_n,run_target,football_n,round(load_v),round(km_v,1),
      case when sleep_avg is null then '—' else round(sleep_avg,1)::text||' h' end,
      checkin_n,protein_days,
      case when weight_first is null then '—' when weight_last is null or weight_first=weight_last then weight_first::text||' kg' else weight_first::text||' → '||weight_last::text||' kg' end,
      trim(both ' ' from concat(
        case when gym_n<3 then 'priorizar fuerza; ' else '' end,
        case when run_n<run_target then 'mantener trabajo aeróbico suave; ' else '' end,
        case when sleep_avg is not null and sleep_avg<7 then 'proteger algo más el sueño; ' else '' end,
        case when load_v>1200 then 'reducir carga desplazable; ' else '' end,
        case when gym_n>=3 and run_n>=run_target and (sleep_avg is null or sleep_avg>=7) and load_v<=1200 then 'mantener progresión gradual.' else '' end
      ))
    );

    report_text := replace(replace(report_text,chr(92)||chr(92)||'n',chr(10)),chr(92)||'n',chr(10));
    report_text := report_text || format(E'\nHRV MEDIA: %s\nNOCHES EN HORARIO PERSONAL: %s/%s\nMOLESTIAS ACTIVAS: %s',coalesce(round(hrv_avg,1)::text,'—'),regular_sleep,sleep_n,injury_n);
    insert into public.weekly_reports(user_id,week_start,week_end,summary,report,updated_at)
    values(
      p.user_id,week_start_d,week_end_d,
      jsonb_build_object('gym',gym_n,'run',run_n,'football',football_n,'activities',activity_n,'load',round(load_v),'km',round(km_v,1),'sleepAvg',sleep_avg,'sleepDays',sleep_n,'hrvAvg',hrv_avg,'regularSleepDays',regular_sleep,'activeInjuries',injury_n,'runTarget',run_target,'checkins',checkin_n,'proteinDays',protein_days,'weightFirst',weight_first,'weightLast',weight_last),
      jsonb_build_object('text',report_text,'generatedBy','cron-v2'),now()
    )
    on conflict (user_id,week_start) do update set week_end=excluded.week_end,summary=excluded.summary,report=excluded.report,updated_at=now();

    insert into public.goal_confirmations(user_id,code,period_start,period_end,prompt,category,xp_reward)
      values(p.user_id,'weekly_protein',week_start_d,week_end_d,'¿Dirías que has cumplido bien tu objetivo de proteína la mayor parte de esta semana?','nutrition',15)
      on conflict (user_id,code,period_start) do nothing;
    if football_n>0 then
      insert into public.goal_confirmations(user_id,code,period_start,period_end,prompt,category,xp_reward)
        values(p.user_id,'weekly_recovery',week_start_d,week_end_d,'Después de tus pachangas, ¿hiciste al menos una rutina breve de recuperación/movilidad?','recovery',15)
        on conflict (user_id,code,period_start) do nothing;
    end if;
  end loop;
end;
$$;

revoke all on function training_lab_private.generate_weekly_reports() from public, anon, authenticated;

