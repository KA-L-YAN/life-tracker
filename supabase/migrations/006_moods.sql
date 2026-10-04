-- Daily mood check-in: one row per person per day (1 = rough … 5 = great) with an optional note.
-- Plotted on the Day Dial and the weekly Insights screen.

create table if not exists public.moods (
  user_id    uuid not null references auth.users(id) default auth.uid(),
  day        date not null,
  mood       smallint not null check (mood between 1 and 5),
  note       text check (char_length(note) <= 280),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.moods enable row level security;

drop policy if exists "owner only" on public.moods;
create policy "owner only" on public.moods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Account deletion (migration 003) must also clear moods, or the auth.users delete would hit
-- this table's foreign key.
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
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
