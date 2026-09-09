create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birth_year integer,
  height_cm numeric(5,2),
  target_weight_kg numeric(5,2),
  protein_target_g integer default 130,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  fatigue smallint check (fatigue between 1 and 5),
  rest_requested boolean not null default false,
  football_override boolean,
  sleep_hours numeric(4,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  started_at timestamptz,
  activity_type text not null check (activity_type in ('football','run','gym','walk','recovery','other')),
  source text not null default 'manual' check (source in ('manual','fit','coros','strava')),
  external_id text,
  title text,
  duration_min numeric(8,2),
  moving_time_min numeric(8,2),
  rpe smallint check (rpe between 1 and 10),
  distance_km numeric(9,3),
  avg_hr integer,
  max_hr integer,
  calories integer,
  top_speed_kmh numeric(6,2),
  high_intensity_m numeric(10,2),
  sprint_count integer,
  absolute_sprint_count integer,
  avg_pace_sec_km integer,
  elevation_gain_m numeric(9,2),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source, external_id)
);

create table if not exists public.fit_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  original_name text not null,
  storage_path text,
  file_size_bytes bigint,
  parser_version text,
  parse_status text not null default 'pending' check (parse_status in ('pending','processing','parsed','error')),
  parse_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  body_fat_pct numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, measured_on)
);

create table if not exists public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  session_type text not null check (session_type in ('football','run','gym','rest','recovery')),
  focus text,
  status text not null default 'planned' check (status in ('planned','done','skipped','moved')),
  fixed boolean not null default false,
  generated_reason text,
  moved_from uuid references public.planned_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activities_user_date on public.activities(user_id, activity_date desc);
create index if not exists idx_status_user_day on public.daily_status(user_id, day desc);
create index if not exists idx_weigh_user_date on public.weigh_ins(user_id, measured_on desc);
create index if not exists idx_planned_user_date on public.planned_sessions(user_id, session_date);
create index if not exists idx_fit_user_created on public.fit_files(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.daily_status enable row level security;
alter table public.activities enable row level security;
alter table public.fit_files enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.planned_sessions enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.daily_status to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.fit_files to authenticated;
grant select, insert, update, delete on public.weigh_ins to authenticated;
grant select, insert, update, delete on public.planned_sessions to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy daily_status_select_own on public.daily_status for select to authenticated using ((select auth.uid()) = user_id);
create policy daily_status_insert_own on public.daily_status for insert to authenticated with check ((select auth.uid()) = user_id);
create policy daily_status_update_own on public.daily_status for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy daily_status_delete_own on public.daily_status for delete to authenticated using ((select auth.uid()) = user_id);

create policy activities_select_own on public.activities for select to authenticated using ((select auth.uid()) = user_id);
create policy activities_insert_own on public.activities for insert to authenticated with check ((select auth.uid()) = user_id);
create policy activities_update_own on public.activities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy activities_delete_own on public.activities for delete to authenticated using ((select auth.uid()) = user_id);

create policy fit_files_select_own on public.fit_files for select to authenticated using ((select auth.uid()) = user_id);
create policy fit_files_insert_own on public.fit_files for insert to authenticated with check ((select auth.uid()) = user_id);
create policy fit_files_update_own on public.fit_files for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy fit_files_delete_own on public.fit_files for delete to authenticated using ((select auth.uid()) = user_id);

create policy weigh_ins_select_own on public.weigh_ins for select to authenticated using ((select auth.uid()) = user_id);
create policy weigh_ins_insert_own on public.weigh_ins for insert to authenticated with check ((select auth.uid()) = user_id);
create policy weigh_ins_update_own on public.weigh_ins for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy weigh_ins_delete_own on public.weigh_ins for delete to authenticated using ((select auth.uid()) = user_id);

create policy planned_select_own on public.planned_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy planned_insert_own on public.planned_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy planned_update_own on public.planned_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy planned_delete_own on public.planned_sessions for delete to authenticated using ((select auth.uid()) = user_id);
;

