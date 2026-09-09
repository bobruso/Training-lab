create table if not exists public.activity_analysis (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_version text not null default 'fit-v1',
  summary jsonb not null default '{}'::jsonb,
  hr_zones jsonb not null default '[]'::jsonb,
  speed_zones jsonb not null default '[]'::jsonb,
  track_points jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  sample_count integer,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_analysis enable row level security;

grant select, insert, update, delete on public.activity_analysis to authenticated;

create policy "activity_analysis_select_own" on public.activity_analysis
for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity_analysis_insert_own" on public.activity_analysis
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity_analysis_update_own" on public.activity_analysis
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "activity_analysis_delete_own" on public.activity_analysis
for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists activity_analysis_user_id_idx on public.activity_analysis(user_id);

alter table public.fit_files add column if not exists analyzed_at timestamptz;
alter table public.fit_files add column if not exists analysis_activity_id uuid references public.activities(id) on delete set null;
;

