-- v2: personal plan (onboarding), multiple habits (build / quit), meal types, study topics.
-- Safe to re-run: every statement is idempotent. The old habit_events table is kept untouched.

create table if not exists public.profiles (
  user_id            uuid primary key references auth.users(id) default auth.uid(),
  display_name       text,
  goals              text[]    not null default '{}',
  focus_goal_minutes integer   not null default 60,
  reminder_time      text      not null default '07:00',
  reminder_days      integer[] not null default '{1,2,3,4,5}',
  reminders_enabled  boolean   not null default true,
  onboarded_at       timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  name        text not null,
  note        text,
  kind        text not null default 'build' check (kind in ('build', 'quit')),
  icon        text not null default 'sparkles',
  color       text not null default 'lime',
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists habits_user_idx on public.habits (user_id, created_at);

create table if not exists public.habit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) default auth.uid(),
  habit_id  uuid not null references public.habits(id) on delete cascade,
  logged_at timestamptz not null default now()
);
create index if not exists habit_logs_user_logged_idx on public.habit_logs (user_id, logged_at desc);
create index if not exists habit_logs_habit_logged_idx on public.habit_logs (habit_id, logged_at desc);

alter table public.food_entries   add column if not exists meal  text check (meal in ('breakfast', 'lunch', 'snack', 'dinner'));
alter table public.study_sessions add column if not exists topic text;

alter table public.profiles   enable row level security;
alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists "owner only" on public.profiles;
drop policy if exists "owner only" on public.habits;
drop policy if exists "owner only" on public.habit_logs;
create policy "owner only" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on public.habits   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- A log must belong to you AND point at one of your own habits.
create policy "owner only" on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

-- Carry the old single-counter history into a "quit" habit, once per user.
insert into public.habits (user_id, name, kind, icon, color)
select u.user_id, 'Break the habit', 'quit', 'flame', 'bubblegum'
from (select distinct user_id from public.habit_events) u
where not exists (select 1 from public.habits h where h.user_id = u.user_id and h.kind = 'quit');

insert into public.habit_logs (user_id, habit_id, logged_at)
select e.user_id, h.id, e.occurred_at
from public.habit_events e
join public.habits h on h.user_id = e.user_id and h.kind = 'quit' and h.name = 'Break the habit'
where not exists (select 1 from public.habit_logs l where l.habit_id = h.id and l.logged_at = e.occurred_at);
