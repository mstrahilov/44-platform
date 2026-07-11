-- Supports the progressive login screen without exposing auth user records.
-- The function returns only whether a normalized email is already registered.
create or replace function public.account_exists_for_email(lookup_email text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(lookup_email))
  );
$$;

revoke all on function public.account_exists_for_email(text) from public;
grant execute on function public.account_exists_for_email(text) to anon, authenticated;
