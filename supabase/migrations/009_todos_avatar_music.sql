-- To-dos, a profile picture (photo or buddy avatar) and focus music.

create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) default auth.uid(),
  title      text not null check (char_length(title) between 1 and 200),
  -- A day, not a time: "today", "tomorrow", or nothing for someday.
  due        date,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists todos_user_open on public.todos (user_id, done_at, due);

alter table public.todos enable row level security;
drop policy if exists "owner only" on public.todos;
create policy "owner only" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- {"kind":"photo","path":"<uid>/<file>"} or {"kind":"buddy","shape":"cloud","color":"lilac","mood":"happy"}.
alter table public.profiles
  add column if not exists avatar jsonb check (avatar is null or avatar ? 'kind'),
  -- A Spotify playlist link or URI, played from the Focus screen.
  add column if not exists focus_playlist text check (char_length(focus_playlist) <= 300),
  add column if not exists focus_music_autoplay boolean not null default false;

-- Profile photos: a private bucket, one folder per account, readable only by its owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars: owner reads" on storage.objects;
create policy "avatars: owner reads" on storage.objects
  for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: owner uploads" on storage.objects;
create policy "avatars: owner uploads" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: owner replaces" on storage.objects;
create policy "avatars: owner replaces" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: owner deletes" on storage.objects;
create policy "avatars: owner deletes" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Account deletion: the app removes the photo file first (storage files go through the API),
-- then this clears the rows.
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
  delete from public.todos where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
