-- Usernames preserve the member's chosen capitalization while identity,
-- uniqueness, profile routing, and mentions remain case-insensitive.

do $$
begin
  if exists (
    select lower(username)
    from public.profiles
    where username is not null
    group by lower(username)
    having count(*) > 1
  ) then
    raise exception 'Case-insensitive duplicate usernames must be resolved before this migration.';
  end if;

  if exists (
    select 1
    from public.profiles
    where username is not null
      and username !~ '^[A-Za-z0-9_]{3,32}$'
  ) then
    raise exception 'Invalid existing usernames must be resolved before this migration.';
  end if;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_username_key;

alter table public.profiles
  add column username_normalized text generated always as (lower(username)) stored,
  add constraint profiles_username_format_check
    check (username is null or username ~ '^[A-Za-z0-9_]{3,32}$'),
  add constraint profiles_username_normalized_key unique (username_normalized);

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  requested_username text;
  fallback_username text;
  requested_country text;
begin
  requested_username:=trim(coalesce(new.raw_user_meta_data->>'username',''));
  fallback_username:=lower(regexp_replace(split_part(new.email,'@',1),'[^a-zA-Z0-9_]+','_','g'));
  fallback_username:=trim(both '_' from fallback_username);
  requested_country:=upper(trim(coalesce(new.raw_user_meta_data->>'country_code','')));
  if requested_username !~ '^[A-Za-z0-9_]{3,32}$' then
    requested_username:=left(coalesce(nullif(fallback_username,''),'member'),23)||'_'||left(new.id::text,8);
  end if;
  if requested_country !~ '^[A-Z]{2}$' then requested_country:=null; end if;
  insert into public.profiles(id,display_name,username,country_code,home_country_code)
  values(
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),
      nullif(trim(new.raw_user_meta_data->>'name'),''),
      split_part(new.email,'@',1),'44 Member'),
    requested_username,requested_country,requested_country
  )
  on conflict(id) do update set
    country_code=coalesce(public.profiles.country_code,excluded.country_code),
    home_country_code=coalesce(public.profiles.home_country_code,excluded.home_country_code);
  return new;
end;
$$;

comment on column public.profiles.username_normalized is
  'Generated case-insensitive identity key. The username column retains member-selected capitalization.';
