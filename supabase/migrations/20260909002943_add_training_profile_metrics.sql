alter table public.profiles add column if not exists hr_max_bpm integer;
alter table public.profiles add column if not exists weight_kg numeric;
alter table public.profiles add column if not exists timezone text not null default 'Europe/Madrid';
alter table public.profiles add column if not exists carb_rest_g integer not null default 275;
alter table public.profiles add column if not exists carb_training_g integer not null default 325;
alter table public.profiles add column if not exists carb_football_g integer not null default 390;
;

