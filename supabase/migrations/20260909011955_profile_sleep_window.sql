alter table public.profiles add column if not exists sleep_target_start time not null default '05:00';
alter table public.profiles add column if not exists sleep_target_end time not null default '13:00';
;

