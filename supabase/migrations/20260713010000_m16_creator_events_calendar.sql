-- M16: creator-owned events and the server-authoritative Community Calendar read model.
-- Radio programming and radio_playlist_entries are intentionally untouched.

alter table public.catalog_items
  add column if not exists upcoming_release_at timestamptz,
  add column if not exists upcoming_release_timezone text;

alter table public.catalog_items
  add constraint catalog_items_upcoming_release_pair_check
  check ((upcoming_release_at is null) = (upcoming_release_timezone is null));

create or replace function public.is_valid_iana_timezone(value text)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select value is not null and exists(select 1 from pg_catalog.pg_timezone_names where name = value);
$$;

create or replace function public.is_safe_public_https_url(value text)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare parsed text[];
begin
  if value is null then return true; end if;
  if length(value) > 2048 or value !~ '^https://[^[:space:]]+$' or value ~ '[<>"\\]' then return false; end if;
  if value ~ '^https://[^/]*@' then return false; end if;
  parsed := regexp_match(value, '^https://([^/:?#]+)');
  return parsed is not null and parsed[1] is not null and parsed[1] <> '';
end;
$$;

create table public.creator_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  short_description text not null,
  format text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null,
  venue_name text,
  address_line1 text,
  address_line2 text,
  locality text,
  region text,
  postal_code text,
  country_code text,
  online_url text,
  info_url text,
  lifecycle_state text not null default 'scheduled',
  moderation_state text not null default 'visible',
  moderation_reason text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_events_title_check check (char_length(btrim(title)) between 1 and 120),
  constraint creator_events_description_check check (char_length(btrim(short_description)) between 1 and 280),
  constraint creator_events_format_check check (format in ('in_person','online','hybrid')),
  constraint creator_events_time_check check (ends_at is null or ends_at > starts_at),
  constraint creator_events_timezone_check check (public.is_valid_iana_timezone(timezone)),
  constraint creator_events_lifecycle_check check (lifecycle_state in ('scheduled','cancelled','removed')),
  constraint creator_events_moderation_check check (moderation_state in ('visible','hidden','removed')),
  constraint creator_events_online_url_check check (public.is_safe_public_https_url(online_url)),
  constraint creator_events_info_url_check check (public.is_safe_public_https_url(info_url)),
  constraint creator_events_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint creator_events_format_fields_check check (
    (format = 'in_person' and venue_name is not null and address_line1 is not null and locality is not null and online_url is null)
    or (format = 'online' and online_url is not null and venue_name is null and address_line1 is null and address_line2 is null and locality is null and region is null and postal_code is null and country_code is null)
    or (format = 'hybrid' and venue_name is not null and address_line1 is not null and locality is not null and online_url is not null)
  )
);

comment on table public.creator_events is 'Authoritative creator-owned event listings. Calendar is a read model over this table and catalog_items.';
create index creator_events_public_time_idx on public.creator_events(starts_at, id) where lifecycle_state <> 'removed' and moderation_state = 'visible';
create index creator_events_creator_time_idx on public.creator_events(creator_id, starts_at desc);
alter table public.creator_events enable row level security;

create policy creator_events_public_read on public.creator_events for select
using ((moderation_state = 'visible' and lifecycle_state <> 'removed') or creator_id = auth.uid() or public.is_platform_admin());

revoke insert, update, delete on public.creator_events from anon, authenticated;
grant select on public.creator_events to anon, authenticated;

create or replace function public.save_creator_event(target_event_id uuid, payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare result_id uuid; owner_id uuid; event_format text; event_timezone text;
begin
  if not public.is_approved_publisher(auth.uid()) then raise exception 'Creator access required.' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(payload, '{}'::jsonb)) <> 'object' then raise exception 'Event details must be an object.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(payload) key where key <> all(array['title','short_description','format','starts_at','ends_at','timezone','venue_name','address_line1','address_line2','locality','region','postal_code','country_code','online_url','info_url'])) then
    raise exception 'Unsupported event field.' using errcode='22023';
  end if;
  event_format := payload->>'format'; event_timezone := payload->>'timezone';
  if not public.is_valid_iana_timezone(event_timezone) then raise exception 'Choose a valid IANA timezone.' using errcode='22023'; end if;
  if target_event_id is not null and exists(select 1 from public.creator_events where id=target_event_id) then
    select creator_id into owner_id from public.creator_events where id=target_event_id;
    if owner_id is null or (owner_id <> auth.uid() and not public.is_platform_admin()) then raise exception 'Event not found or not editable by this account.' using errcode='42501'; end if;
    if exists(select 1 from public.creator_events where id=target_event_id and lifecycle_state='removed') then raise exception 'Removed events cannot be edited.' using errcode='55000'; end if;
  end if;
  insert into public.creator_events(id,creator_id,title,short_description,format,starts_at,ends_at,timezone,venue_name,address_line1,address_line2,locality,region,postal_code,country_code,online_url,info_url)
  values(coalesce(target_event_id,gen_random_uuid()),coalesce(owner_id,auth.uid()),btrim(payload->>'title'),btrim(payload->>'short_description'),event_format,(payload->>'starts_at')::timestamptz,nullif(payload->>'ends_at','')::timestamptz,event_timezone,nullif(btrim(payload->>'venue_name'),''),nullif(btrim(payload->>'address_line1'),''),nullif(btrim(payload->>'address_line2'),''),nullif(btrim(payload->>'locality'),''),nullif(btrim(payload->>'region'),''),nullif(btrim(payload->>'postal_code'),''),nullif(upper(btrim(payload->>'country_code')),''),nullif(btrim(payload->>'online_url'),''),nullif(btrim(payload->>'info_url'),''))
  on conflict(id) do update set title=excluded.title,short_description=excluded.short_description,format=excluded.format,starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,venue_name=excluded.venue_name,address_line1=excluded.address_line1,address_line2=excluded.address_line2,locality=excluded.locality,region=excluded.region,postal_code=excluded.postal_code,country_code=excluded.country_code,online_url=excluded.online_url,info_url=excluded.info_url,updated_at=now()
  returning id into result_id;
  return result_id;
end; $$;

create or replace function public.set_creator_event_state(target_event_id uuid, target_state text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if target_state not in ('scheduled','cancelled','removed') then raise exception 'Unsupported event state.' using errcode='22023'; end if;
  update public.creator_events set lifecycle_state=target_state,updated_at=now()
  where id=target_event_id and lifecycle_state<>'removed' and (creator_id=auth.uid() or public.is_platform_admin());
  if not found then raise exception 'Event not found or not editable by this account.' using errcode='42501'; end if;
end; $$;

create or replace function public.moderate_creator_event(target_event_id uuid, target_state text, reason text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_state not in ('visible','hidden','removed') then raise exception 'Unsupported moderation state.' using errcode='22023'; end if;
  update public.creator_events set moderation_state=target_state,moderation_reason=nullif(btrim(reason),''),moderated_by=auth.uid(),moderated_at=now(),updated_at=now() where id=target_event_id;
  if not found then raise exception 'Event not found.' using errcode='P0002'; end if;
end; $$;

create or replace function public.set_item_upcoming_release(target_item_id uuid, release_at timestamptz, release_timezone text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_item(target_item_id) then raise exception 'Item not found or not editable by this account.' using errcode='42501'; end if;
  if (release_at is null) <> (release_timezone is null) then raise exception 'Release date and timezone must be set together.' using errcode='22023'; end if;
  if release_timezone is not null and not public.is_valid_iana_timezone(release_timezone) then raise exception 'Choose a valid IANA timezone.' using errcode='22023'; end if;
  update public.catalog_items set upcoming_release_at=release_at,upcoming_release_timezone=release_timezone,updated_at=now() where id=target_item_id and status<>'archived';
  if not found then raise exception 'Archived Items cannot be edited.' using errcode='55000'; end if;
end; $$;

create or replace function public.calendar_feed(range_start timestamptz, range_end timestamptz)
returns table(source_type text,source_id uuid,creator_id uuid,title text,description text,starts_at timestamptz,ends_at timestamptz,timezone text,state text,format text,venue_name text,locality text,region text,country_code text,online_url text,info_url text,profile_username text,profile_slug text,item_slug text,item_cover_url text)
language sql stable security definer set search_path=public as $$
  select 'event',e.id,e.creator_id,e.title,e.short_description,e.starts_at,e.ends_at,e.timezone,e.lifecycle_state,e.format,e.venue_name,e.locality,e.region,e.country_code,e.online_url,e.info_url,p.username,p.slug,null::text,null::text
  from public.creator_events e join public.profiles p on p.id=e.creator_id
  where e.moderation_state='visible' and e.lifecycle_state<>'removed' and e.starts_at>=range_start and e.starts_at<range_end
  union all
  select 'release',i.id,i.author_id,i.title,coalesce(i.short_description,i.long_description),i.upcoming_release_at,null,i.upcoming_release_timezone,'upcoming',null,null,null,null,null,null,null,p.username,p.slug,i.slug,i.cover_url
  from public.catalog_items i join public.profiles p on p.id=i.author_id
  where i.status='published' and i.upcoming_release_at is not null and i.upcoming_release_at>=greatest(range_start,now()) and i.upcoming_release_at<range_end
  order by 6,1,2;
$$;

revoke all on function public.save_creator_event(uuid,jsonb), public.set_creator_event_state(uuid,text), public.moderate_creator_event(uuid,text,text), public.set_item_upcoming_release(uuid,timestamptz,text) from public, anon;
grant execute on function public.save_creator_event(uuid,jsonb), public.set_creator_event_state(uuid,text), public.moderate_creator_event(uuid,text,text), public.set_item_upcoming_release(uuid,timestamptz,text) to authenticated;
revoke all on function public.calendar_feed(timestamptz,timestamptz) from public;
grant execute on function public.calendar_feed(timestamptz,timestamptz) to anon, authenticated;

comment on function public.calendar_feed(timestamptz,timestamptz) is 'Bounded public read model over visible creator events and published Items with informational upcoming release dates.';
