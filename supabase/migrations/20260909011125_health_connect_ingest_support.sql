alter table public.activities drop constraint if exists activities_user_source_external_key;
alter table public.activities add constraint activities_user_source_external_key unique(user_id,source,external_id);

create table if not exists public.sync_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  status text not null default 'connected',
  last_sync_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,source)
);
alter table public.sync_sources enable row level security;
grant select,insert,update,delete on public.sync_sources to authenticated;
create policy "sync_sources_select_own" on public.sync_sources for select to authenticated using ((select auth.uid())=user_id);
create policy "sync_sources_insert_own" on public.sync_sources for insert to authenticated with check ((select auth.uid())=user_id);
create policy "sync_sources_update_own" on public.sync_sources for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "sync_sources_delete_own" on public.sync_sources for delete to authenticated using ((select auth.uid())=user_id);
create index if not exists sync_sources_user_idx on public.sync_sources(user_id,source);
;

