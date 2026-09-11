alter table public.activities drop constraint if exists activities_activity_type_check;
alter table public.activities add constraint activities_activity_type_check check (
  activity_type = any (array[
    'football'::text,
    'futsal'::text,
    'run'::text,
    'cycling'::text,
    'gym'::text,
    'walk'::text,
    'recovery'::text,
    'other'::text
  ])
);
