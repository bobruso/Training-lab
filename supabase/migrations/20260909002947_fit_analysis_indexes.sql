create index if not exists activities_user_date_idx on public.activities(user_id, activity_date desc);
create index if not exists fit_files_user_created_idx on public.fit_files(user_id, created_at desc);
;

