create table if not exists public.sleep_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  source text not null default 'manual',
  sleep_start timestamptz,
  sleep_end timestamptz,
  total_sleep_min integer,
  deep_sleep_min integer,
  rem_sleep_min integer,
  light_sleep_min integer,
  awake_min integer,
  awake_count integer,
  sleep_score integer,
  avg_hrv numeric,
  hrv_baseline_low numeric,
  hrv_baseline_high numeric,
  resting_hr integer,
  naps jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,sleep_date,source)
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  energy smallint,
  soreness smallint,
  stress smallint,
  mood smallint,
  motivation smallint,
  sleep_quality smallint,
  alcohol boolean,
  caffeine_late boolean,
  enough_carbs boolean,
  hydration_ok boolean,
  notes text,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,checkin_date)
);

create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body_area text not null,
  side text,
  pain_score smallint,
  onset_date date not null default current_date,
  status text not null default 'active',
  trigger text,
  symptoms jsonb not null default '{}'::jsonb,
  red_flags jsonb not null default '[]'::jsonb,
  advice jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text,
  title text,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  calories integer,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary jsonb not null default '{}'::jsonb,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,week_start)
);

create table if not exists public.muscle_recovery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calculated_at timestamptz not null default now(),
  muscles jsonb not null default '{}'::jsonb,
  source_window_hours integer not null default 96
);

create table if not exists public.strength_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  performed_at timestamptz not null default now(),
  exercise text not null,
  muscle_group text,
  set_number integer,
  reps integer,
  weight_kg numeric,
  rir numeric,
  rpe numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  xp integer not null default 0,
  rarity text not null default 'common',
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id,code)
);

create table if not exists public.game_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1,
  xp integer not null default 0,
  strength integer not null default 1,
  endurance integer not null default 1,
  recovery integer not null default 1,
  inventory jsonb not null default '[]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists sleep_records_user_date_idx on public.sleep_records(user_id,sleep_date desc);
create index if not exists daily_checkins_user_date_idx on public.daily_checkins(user_id,checkin_date desc);
create index if not exists injuries_user_status_idx on public.injuries(user_id,status);
create index if not exists meal_logs_user_time_idx on public.meal_logs(user_id,eaten_at desc);
create index if not exists weekly_reports_user_week_idx on public.weekly_reports(user_id,week_start desc);
create index if not exists strength_sets_user_time_idx on public.strength_sets(user_id,performed_at desc);

alter table public.sleep_records enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.injuries enable row level security;
alter table public.meal_logs enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.muscle_recovery enable row level security;
alter table public.strength_sets enable row level security;
alter table public.achievements enable row level security;
alter table public.game_state enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sleep_records','daily_checkins','injuries','meal_logs','weekly_reports','muscle_recovery','strength_sets','achievements','game_state']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_select_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_update_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete_own', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t||'_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t||'_delete_own', t);
  end loop;
end $$;

grant select,insert,update,delete on public.sleep_records,public.daily_checkins,public.injuries,public.meal_logs,public.weekly_reports,public.muscle_recovery,public.strength_sets,public.achievements,public.game_state to authenticated;;

