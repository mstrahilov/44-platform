-- M14 Cross-Platform Reach: validated, owner-managed profile and Item links.
-- Existing link rows are preserved. The linked project currently has zero rows in both tables.

create table public.external_link_platforms (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{0,31}$'),
  label text not null check (char_length(label) between 1 and 40),
  host_patterns text[] not null check (cardinality(host_patterns) > 0),
  supports_profiles boolean not null default false,
  supports_items boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (supports_profiles or supports_items)
);

comment on table public.external_link_platforms is 'Approved, extensible destinations for creator profile and Item outbound links. Mutated only through reviewed migrations/service administration.';

insert into public.external_link_platforms(key,label,host_patterns,supports_profiles,supports_items,sort_order) values
  ('spotify','Spotify',array['open.spotify.com'],true,true,10),
  ('apple_music','Apple Music',array['music.apple.com'],true,true,20),
  ('bandcamp','Bandcamp',array['bandcamp.com','*.bandcamp.com'],true,true,30),
  ('youtube','YouTube',array['youtube.com','*.youtube.com','youtu.be'],true,true,40),
  ('instagram','Instagram',array['instagram.com','*.instagram.com'],true,false,50),
  ('x','X',array['x.com','*.x.com','twitter.com','*.twitter.com'],true,false,60),
  ('website','Website',array['*'],true,false,70);

alter table public.external_link_platforms enable row level security;
create policy external_link_platforms_read on public.external_link_platforms for select using (is_active);
revoke all on public.external_link_platforms from anon,authenticated;
grant select on public.external_link_platforms to anon,authenticated;
grant all on public.external_link_platforms to service_role;

create or replace function public.external_link_host(target_url text)
returns text language sql immutable strict parallel safe set search_path=public as $$
  select lower((regexp_match(target_url, '^https://([^/?#:@]+)(?:[/?#]|$)', 'i'))[1]);
$$;

create or replace function public.external_link_is_valid(target_platform text,target_url text,target_scope text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare
  host text;
  patterns text[];
  pattern text;
  scope_allowed boolean;
begin
  if target_scope not in ('profile','item') or target_url is null or char_length(target_url) > 2048
    or target_url !~ '^https://[^[:space:]]+$' then return false; end if;
  host := public.external_link_host(target_url);
  if host is null or host in ('localhost','127.0.0.1','0.0.0.0','::1')
    or host !~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$' then return false; end if;

  select host_patterns,
    case when target_scope='profile' then supports_profiles else supports_items end
  into patterns,scope_allowed
  from public.external_link_platforms
  where key=target_platform and is_active;
  if not found or not scope_allowed then return false; end if;

  foreach pattern in array patterns loop
    if pattern='*' and host like '%.%' then return true; end if;
    if left(pattern,2)='*.' and (host=substr(pattern,3) or right(host,char_length(pattern)-1)=substr(pattern,2)) then return true; end if;
    if host=pattern then return true; end if;
  end loop;
  return false;
end;
$$;

revoke all on function public.external_link_host(text) from public,anon,authenticated;
revoke all on function public.external_link_is_valid(text,text,text) from public,anon,authenticated;
grant execute on function public.external_link_is_valid(text,text,text) to authenticated,service_role;

create or replace function public.validate_external_link_row()
returns trigger language plpgsql security definer set search_path=public as $$
declare expected_label text;
begin
  select label into expected_label from public.external_link_platforms where key=new.platform and is_active;
  if expected_label is null or not public.external_link_is_valid(new.platform,new.url,tg_argv[0]) then
    raise exception 'Use a valid HTTPS link for an approved % platform.',tg_argv[0] using errcode='23514';
  end if;
  new.platform:=lower(new.platform);
  new.label:=expected_label;
  new.url:=btrim(new.url);
  if new.sort_order < 0 then raise exception 'Link order cannot be negative.' using errcode='23514'; end if;
  return new;
end;
$$;

drop trigger if exists validate_profile_external_link on public.profile_external_links;
create trigger validate_profile_external_link before insert or update on public.profile_external_links
for each row execute function public.validate_external_link_row('profile');
drop trigger if exists validate_item_external_link on public.item_external_links;
create trigger validate_item_external_link before insert or update on public.item_external_links
for each row execute function public.validate_external_link_row('item');

alter table public.profile_external_links drop constraint if exists profile_external_links_profile_id_platform_url_key;
alter table public.item_external_links drop constraint if exists item_external_links_item_id_platform_url_key;
alter table public.profile_external_links add constraint profile_external_links_profile_platform_key unique(profile_id,platform);
alter table public.item_external_links add constraint item_external_links_item_platform_key unique(item_id,platform);

create or replace function public.replace_own_profile_external_links(link_rows jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare row_value jsonb; platform_key text; target_url text; seen text[]:=array[]::text[]; position integer:=0;
begin
  if auth.uid() is null then raise exception 'Sign in to manage profile links.' using errcode='42501'; end if;
  if not public.is_approved_publisher(auth.uid()) then raise exception 'Creator approval is required to manage creator links.' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(link_rows,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(link_rows,'[]'::jsonb)) > 12 then
    raise exception 'Profile links must be an array of at most 12 destinations.' using errcode='22023';
  end if;
  for row_value in select value from jsonb_array_elements(coalesce(link_rows,'[]'::jsonb)) loop
    platform_key:=lower(btrim(coalesce(row_value->>'platform',''))); target_url:=btrim(coalesce(row_value->>'url',''));
    if platform_key='' or target_url='' or platform_key=any(seen) then raise exception 'Each profile platform can appear once.' using errcode='23505'; end if;
    if not public.external_link_is_valid(platform_key,target_url,'profile') then raise exception 'Use a valid HTTPS link for %.',platform_key using errcode='23514'; end if;
    seen:=array_append(seen,platform_key);
    insert into public.profile_external_links(profile_id,platform,label,url,sort_order)
    select auth.uid(),p.key,p.label,target_url,position from public.external_link_platforms p where p.key=platform_key
    on conflict(profile_id,platform) do update set label=excluded.label,url=excluded.url,sort_order=excluded.sort_order,updated_at=now();
    position:=position+1;
  end loop;
  delete from public.profile_external_links where profile_id=auth.uid() and not(platform=any(seen));
end;
$$;

create or replace function public.replace_owned_item_external_links(target_item_id uuid,link_rows jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare row_value jsonb; platform_key text; target_url text; seen text[]:=array[]::text[]; position integer:=0;
begin
  if not public.can_manage_item(target_item_id) then raise exception 'Item not found or not editable by this account.' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(link_rows,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(link_rows,'[]'::jsonb)) > 4 then
    raise exception 'Release links must be an array of at most four destinations.' using errcode='22023';
  end if;
  for row_value in select value from jsonb_array_elements(coalesce(link_rows,'[]'::jsonb)) loop
    platform_key:=lower(btrim(coalesce(row_value->>'platform',''))); target_url:=btrim(coalesce(row_value->>'url',''));
    if platform_key='' or target_url='' or platform_key=any(seen) then raise exception 'Each release platform can appear once.' using errcode='23505'; end if;
    if not public.external_link_is_valid(platform_key,target_url,'item') then raise exception 'Use a valid HTTPS link for %.',platform_key using errcode='23514'; end if;
    seen:=array_append(seen,platform_key);
    insert into public.item_external_links(item_id,platform,label,url,sort_order)
    select target_item_id,p.key,p.label,target_url,position from public.external_link_platforms p where p.key=platform_key
    on conflict(item_id,platform) do update set label=excluded.label,url=excluded.url,sort_order=excluded.sort_order,updated_at=now();
    position:=position+1;
  end loop;
  delete from public.item_external_links where item_id=target_item_id and not(platform=any(seen));
end;
$$;

revoke insert,update,delete on public.profile_external_links from anon,authenticated;
revoke insert,update,delete on public.item_external_links from anon,authenticated;
revoke all on function public.replace_own_profile_external_links(jsonb) from public,anon;
revoke all on function public.replace_owned_item_external_links(uuid,jsonb) from public,anon;
grant execute on function public.replace_own_profile_external_links(jsonb) to authenticated,service_role;
grant execute on function public.replace_owned_item_external_links(uuid,jsonb) to authenticated,service_role;
grant execute on function public.external_link_host(text) to service_role;
grant execute on function public.validate_external_link_row() to service_role;

comment on function public.replace_own_profile_external_links(jsonb) is 'Atomic owner-only profile link sync with platform, host, HTTPS, duplicate, and order validation.';
comment on function public.replace_owned_item_external_links(uuid,jsonb) is 'Atomic Item-owner/editor link sync with platform, host, HTTPS, duplicate, and order validation.';
