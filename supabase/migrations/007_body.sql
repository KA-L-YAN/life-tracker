-- Body: steps (hourly, synced from Health Connect on Android or entered by hand), sleep sessions,
-- and water. Plus the daily goals for each.

-- Steps per local hour. 'health' rows mirror Health Connect; a 'manual' row is a whole-day total
-- someone typed in (stored at hour 0). The day's total prefers health data when there is any.
create table if not exists public.steps (
  user_id    uuid not null references auth.users(id) default auth.uid(),
  day        date not null,
  hour       smallint not null check (hour between 0 and 23),
  source     text not null check (source in ('health', 'manual')),
  count      integer not null check (count between 0 and 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, hour, source)
);

alter table public.steps enable row level security;
drop policy if exists "owner only" on public.steps;
create policy "owner only" on public.steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per day, for Insights and the year view (security_invoker keeps RLS in force).
create or replace view public.steps_daily with (security_invoker = on) as
  select user_id, day,
    case when bool_or(source = 'health')
      then sum(count) filter (where source = 'health')
      else sum(count) filter (where source = 'manual')
    end::integer as total
  from public.steps
  group by user_id, day;

create table if not exists public.sleep_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  source      text not null default 'manual' check (source in ('health', 'manual')),
  -- Health Connect's record id, so re-syncing updates instead of duplicating.
  external_id text,
  created_at  timestamptz not null default now(),
  check (ended_at > started_at and ended_at - started_at <= interval '24 hours'),
  unique (user_id, external_id)
);
create index if not exists sleep_sessions_user_end on public.sleep_sessions (user_id, ended_at desc);

alter table public.sleep_sessions enable row level security;
drop policy if exists "owner only" on public.sleep_sessions;
create policy "owner only" on public.sleep_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.water_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) default auth.uid(),
  logged_at timestamptz not null default now(),
  ml        integer not null default 250 check (ml between 1 and 5000)
);
create index if not exists water_logs_user_time on public.water_logs (user_id, logged_at desc);

alter table public.water_logs enable row level security;
drop policy if exists "owner only" on public.water_logs;
create policy "owner only" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.profiles
  add column if not exists step_goal integer not null default 8000 check (step_goal between 500 and 100000),
  add column if not exists water_goal integer not null default 8 check (water_goal between 1 and 30),
  add column if not exists sleep_goal_minutes integer not null default 480 check (sleep_goal_minutes between 180 and 840);

-- Account deletion must clear the new tables too.
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
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
