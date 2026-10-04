-- Automation: habits that tick themselves, workouts and water synced from Health Connect.

-- A build habit can carry a rule, e.g. {"kind":"steps","target":8000} or
-- {"kind":"place","lat":17.4,"lng":78.5,"radius":150}. The app ticks the habit when the day's
-- data meets it (and, for places on Android, from the background location task).
alter table public.habits add column if not exists auto jsonb check (auto is null or auto ? 'kind');

-- Water from Health Connect (Samsung Health, Google Fit, …) lands next to taps in the app.
alter table public.water_logs
  add column if not exists source text not null default 'manual' check (source in ('health', 'manual')),
  add column if not exists external_id text;
create unique index if not exists water_logs_user_external on public.water_logs (user_id, external_id);

create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  started_at  timestamptz not null,
  ended_at    timestamptz not null check (ended_at > started_at),
  -- Health Connect ExerciseType number (0 = other).
  exercise    integer not null default 0,
  title       text check (char_length(title) <= 120),
  source      text not null default 'health' check (source in ('health', 'manual')),
  external_id text,
  created_at  timestamptz not null default now(),
  unique (user_id, external_id)
);
create index if not exists workouts_user_start on public.workouts (user_id, started_at desc);

alter table public.workouts enable row level security;
drop policy if exists "owner only" on public.workouts;
create policy "owner only" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.habit_logs where user_id = uid;
  delete from public.habits where user_id = uid;
  delete from public.habit_events where user_id = uid;
  delete from public.food_entries where user_id = uid;
  delete from public.study_sessions where user_id = uid;
  delete from public.location_points where user_id = uid;
  delete from public.moods where user_id = uid;
  delete from public.steps where user_id = uid;
  delete from public.sleep_sessions where user_id = uid;
  delete from public.water_logs where user_id = uid;
  delete from public.workouts where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
