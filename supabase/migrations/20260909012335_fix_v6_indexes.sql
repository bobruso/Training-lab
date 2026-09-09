alter table public.activities drop constraint if exists activities_user_source_external_key;
create index if not exists muscle_recovery_user_id_idx on public.muscle_recovery(user_id);
create index if not exists strength_sets_activity_id_idx on public.strength_sets(activity_id);
;

