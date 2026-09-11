-- Adds creator-uploaded artwork to events, matching the online_url/info_url
-- validation pattern already used on this table. save_creator_event's
-- payload whitelist and calendar_feed's event branch are updated in the
-- same migration so both RPCs agree on the new column immediately.

alter table public.creator_events
  add column if not exists cover_url text;

alter table public.creator_events
  add constraint creator_events_cover_url_check check (is_safe_public_https_url(cover_url));

create or replace function public.save_creator_event(target_event_id uuid, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare result_id uuid; owner_id uuid; event_format text; event_timezone text;
begin
  if not public.is_approved_publisher(auth.uid()) then raise exception 'Creator access required.' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(payload, '{}'::jsonb)) <> 'object' then raise exception 'Event details must be an object.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(payload) key where key <> all(array['title','short_description','format','starts_at','ends_at','timezone','venue_name','address_line1','address_line2','locality','region','postal_code','country_code','online_url','info_url','cover_url'])) then
    raise exception 'Unsupported event field.' using errcode='22023';
  end if;
  event_format := payload->>'format'; event_timezone := payload->>'timezone';
  if not public.is_valid_iana_timezone(event_timezone) then raise exception 'Choose a valid IANA timezone.' using errcode='22023'; end if;
  if target_event_id is not null and exists(select 1 from public.creator_events where id=target_event_id) then
    select creator_id into owner_id from public.creator_events where id=target_event_id;
    if owner_id is null or (owner_id <> auth.uid() and not public.is_platform_admin()) then raise exception 'Event not found or not editable by this account.' using errcode='42501'; end if;
    if exists(select 1 from public.creator_events where id=target_event_id and lifecycle_state='removed') then raise exception 'Removed events cannot be edited.' using errcode='55000'; end if;
  end if;
  insert into public.creator_events(id,creator_id,title,short_description,format,starts_at,ends_at,timezone,venue_name,address_line1,address_line2,locality,region,postal_code,country_code,online_url,info_url,cover_url)
  values(coalesce(target_event_id,gen_random_uuid()),coalesce(owner_id,auth.uid()),btrim(payload->>'title'),btrim(payload->>'short_description'),event_format,(payload->>'starts_at')::timestamptz,nullif(payload->>'ends_at','')::timestamptz,event_timezone,nullif(btrim(payload->>'venue_name'),''),nullif(btrim(payload->>'address_line1'),''),nullif(btrim(payload->>'address_line2'),''),nullif(btrim(payload->>'locality'),''),nullif(btrim(payload->>'region'),''),nullif(btrim(payload->>'postal_code'),''),nullif(upper(btrim(payload->>'country_code')),''),nullif(btrim(payload->>'online_url'),''),nullif(btrim(payload->>'info_url'),''),nullif(btrim(payload->>'cover_url'),''))
  on conflict(id) do update set title=excluded.title,short_description=excluded.short_description,format=excluded.format,starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,venue_name=excluded.venue_name,address_line1=excluded.address_line1,address_line2=excluded.address_line2,locality=excluded.locality,region=excluded.region,postal_code=excluded.postal_code,country_code=excluded.country_code,online_url=excluded.online_url,info_url=excluded.info_url,cover_url=excluded.cover_url,updated_at=now()
  returning id into result_id;
  return result_id;
end; $$;

create or replace function public.calendar_feed(range_start timestamptz, range_end timestamptz)
returns table(source_type text,source_id uuid,creator_id uuid,title text,description text,starts_at timestamptz,ends_at timestamptz,timezone text,state text,format text,venue_name text,locality text,region text,country_code text,online_url text,info_url text,profile_username text,profile_slug text,item_slug text,item_cover_url text)
language sql stable security definer set search_path=public as $$
  select 'event',e.id,e.creator_id,e.title,e.short_description,e.starts_at,e.ends_at,e.timezone,e.lifecycle_state,e.format,e.venue_name,e.locality,e.region,e.country_code,e.online_url,e.info_url,p.username,p.slug,null::text,e.cover_url
  from public.creator_events e join public.profiles p on p.id=e.creator_id
  where e.moderation_state='visible' and e.lifecycle_state<>'removed' and e.starts_at>=range_start and e.starts_at<range_end
  union all
  select 'release',i.id,i.author_id,i.title,coalesce(i.short_description,i.long_description),i.upcoming_release_at,null,i.upcoming_release_timezone,'upcoming',null,null,null,null,null,null,null,p.username,p.slug,i.slug,i.cover_url
  from public.catalog_items i join public.profiles p on p.id=i.author_id
  where i.status='published' and i.upcoming_release_at is not null and i.upcoming_release_at>=greatest(range_start,now()) and i.upcoming_release_at<range_end
  order by 6,1,2;
$$;

revoke all on function public.calendar_feed(timestamptz,timestamptz) from public;
grant execute on function public.calendar_feed(timestamptz,timestamptz) to anon, authenticated;

comment on column public.creator_events.cover_url is 'Creator-uploaded event artwork, shown on the Calendar and Studio''s Events shelf. Optional.';
