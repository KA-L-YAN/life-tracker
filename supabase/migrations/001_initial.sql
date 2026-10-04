-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
create extension if not exists pgcrypto;

-- 1. FOOD LOG -------------------------------------------------------------
create table public.food_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) default auth.uid(),
  note       text not null,
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index food_entries_user_logged_idx on public.food_entries (user_id, logged_at desc);

-- 2. HABIT COUNTER ----------------------------------------------------------
create table public.habit_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  occurred_at timestamptz not null default now()
);
create index habit_events_user_occurred_idx on public.habit_events (user_id, occurred_at desc);

-- 3. STUDY STOPWATCH SESSIONS ------------------------------------------------
create table public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) default auth.uid(),
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  duration_seconds integer not null,
  created_at       timestamptz not null default now()
);
create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at desc);

-- 4. LOCATION POINTS ----------------------------------------------------------
create table public.location_points (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) default auth.uid(),
  recorded_at timestamptz not null,
  latitude    double precision not null,
  longitude   double precision not null,
  accuracy_m  real,
  local_date  date not null
);
create index location_points_user_date_idx on public.location_points (user_id, local_date, recorded_at);

-- Row Level Security: every table is private to its owner only.
alter table public.food_entries    enable row level security;
alter table public.habit_events    enable row level security;
alter table public.study_sessions  enable row level security;
alter table public.location_points enable row level security;

create policy "owner only" on public.food_entries    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on public.habit_events    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on public.study_sessions  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on public.location_points for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
