-- "Delete my account" from inside the app.
-- The browser/app only holds the public key, which can't delete auth users, so this runs as the
-- function owner (security definer) and can only ever delete the caller: auth.uid(), never an argument.
-- The user_id foreign keys have no ON DELETE CASCADE, so every table is emptied first, children before parents.

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
  delete from public.profiles where user_id = uid;
  -- Sessions, identities and refresh tokens cascade from auth.users.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
