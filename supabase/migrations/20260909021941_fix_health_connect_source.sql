-- Training Lab only. Retains existing sources and ownership policies.
alter table public.activities drop constraint activities_source_check;
alter table public.activities add constraint activities_source_check
  check (source in ('manual','fit','coros','strava','health_connect'));
