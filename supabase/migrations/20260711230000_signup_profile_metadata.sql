-- Persist the name and username collected by the account creation form.
-- Email-only and third-party signups keep a collision-resistant fallback username.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  fallback_username text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  fallback_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'));
  fallback_username := trim(both '_' from fallback_username);

  if requested_username !~ '^[a-z0-9_]{3,32}$' then
    requested_username := left(coalesce(nullif(fallback_username, ''), 'member'), 23) || '_' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1),
      '44 Member'
    ),
    requested_username
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
