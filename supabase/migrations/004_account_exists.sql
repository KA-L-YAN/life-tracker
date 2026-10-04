-- Lets "Forgot password?" say "no account with that email" instead of pretending a code was sent.
-- Supabase hides this on purpose (it stops strangers learning who has an account); the app chose
-- the clearer message. Returns only true/false, never any account details.

create or replace function public.account_exists(check_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(check_email)) and deleted_at is null
  );
$$;

revoke all on function public.account_exists(text) from public;
grant execute on function public.account_exists(text) to anon, authenticated;
