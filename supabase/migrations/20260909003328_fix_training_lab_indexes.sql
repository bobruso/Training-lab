drop index if exists public.activities_user_date_idx;
drop index if exists public.fit_files_user_created_idx;
create index if not exists fit_files_analysis_activity_id_idx on public.fit_files(analysis_activity_id);
create index if not exists planned_sessions_moved_from_idx on public.planned_sessions(moved_from);
;

