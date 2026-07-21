begin;

-- Team access is an audited capability. It deliberately does not alter the
-- member, creator, or admin role that controls publishing and platform duties.
create table public.team_access_grants (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  check(
    (is_active and revoked_by is null and revoked_at is null)
    or (not is_active and revoked_by is not null and revoked_at is not null)
  )
);

create table public.team_access_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  previous_active boolean not null,
  new_active boolean not null,
  reason text not null check(char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check(previous_active <> new_active)
);
create index team_access_events_profile_time_idx
  on public.team_access_events(profile_id,created_at desc,id desc);

create table public.team_brand_kits (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check(char_length(btrim(version)) between 1 and 40),
  filename text not null check(filename ~ '^[A-Za-z0-9][A-Za-z0-9._-]*[.]zip$'),
  storage_path text not null unique check(storage_path ~ '^[A-Za-z0-9][A-Za-z0-9/._-]*[.]zip$'),
  checksum_sha256 text not null check(checksum_sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check(byte_size > 0),
  contents jsonb not null default '[]'::jsonb check(jsonb_typeof(contents)='array'),
  is_current boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index team_brand_kits_one_current_idx on public.team_brand_kits(is_current) where is_current;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('team-brand','team-brand',false,52428800,array['application/zip'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

alter table public.team_access_grants enable row level security;
alter table public.team_access_events enable row level security;
alter table public.team_brand_kits enable row level security;

revoke all on public.team_access_grants,public.team_access_events,public.team_brand_kits from public,anon,authenticated;
grant all on public.team_access_grants,public.team_access_events,public.team_brand_kits to service_role;

create or replace function public.has_team_access()
returns boolean language sql security definer stable set search_path=public as $$
  select auth.uid() is not null and (
    public.is_platform_admin()
    or exists(
      select 1 from public.team_access_grants grant_row
      where grant_row.profile_id=auth.uid() and grant_row.is_active
    )
  );
$$;

create or replace function public.get_my_team_access()
returns jsonb language sql security definer stable set search_path=public as $$
  select case
    when auth.uid() is null then jsonb_build_object('authorized',false,'source','none')
    when public.is_platform_admin() then jsonb_build_object(
      'authorized',true,'source','admin','profileId',auth.uid(),'grantedAt',null
    )
    else coalesce((
      select jsonb_build_object(
        'authorized',grant_row.is_active,
        'source',case when grant_row.is_active then 'grant' else 'none' end,
        'profileId',grant_row.profile_id,
        'grantedAt',grant_row.granted_at,
        'revokedAt',grant_row.revoked_at
      ) from public.team_access_grants grant_row where grant_row.profile_id=auth.uid()
    ),jsonb_build_object('authorized',false,'source','none','profileId',auth.uid()))
  end;
$$;

create or replace function public.protect_team_access_events()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Team access history is immutable.' using errcode='42501';
end;
$$;
create trigger team_access_events_immutable before update or delete on public.team_access_events
for each row execute function public.protect_team_access_events();

create or replace function public.set_admin_team_access(
  target_profile_id uuid,
  target_enabled boolean,
  target_reason text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  actor_id uuid:=auth.uid();
  normalized_reason text:=btrim(target_reason);
  target_role text;
  previous_active boolean:=false;
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then
    raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023';
  end if;
  select role into target_role from public.profiles where id=target_profile_id for update;
  if target_role is null then raise exception 'Profile not found.' using errcode='P0002'; end if;
  if target_role='admin' then
    raise exception 'Administrators already inherit Team access.' using errcode='22023';
  end if;
  select is_active into previous_active from public.team_access_grants where profile_id=target_profile_id for update;
  previous_active:=coalesce(previous_active,false);
  if previous_active=target_enabled then
    raise exception 'Team access is already in the requested state.' using errcode='55000';
  end if;

  insert into public.team_access_grants(
    profile_id,is_active,granted_by,granted_at,revoked_by,revoked_at,updated_at
  ) values(
    target_profile_id,target_enabled,actor_id,now(),
    case when target_enabled then null else actor_id end,
    case when target_enabled then null else now() end,now()
  ) on conflict(profile_id) do update set
    is_active=excluded.is_active,
    granted_by=case when excluded.is_active then excluded.granted_by else public.team_access_grants.granted_by end,
    granted_at=case when excluded.is_active then now() else public.team_access_grants.granted_at end,
    revoked_by=excluded.revoked_by,
    revoked_at=excluded.revoked_at,
    updated_at=now();

  insert into public.team_access_events(profile_id,changed_by,previous_active,new_active,reason)
  values(target_profile_id,actor_id,previous_active,target_enabled,normalized_reason);

  select jsonb_build_object(
    'profileId',grant_row.profile_id,
    'authorized',grant_row.is_active,
    'source',case when grant_row.is_active then 'grant' else 'none' end,
    'grantedAt',grant_row.granted_at,
    'revokedAt',grant_row.revoked_at
  ) into result from public.team_access_grants grant_row where grant_row.profile_id=target_profile_id;
  return result;
end;
$$;

create or replace function public.get_admin_team_access(target_profile_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=target_profile_id) then
    raise exception 'Profile not found.' using errcode='P0002';
  end if;
  select jsonb_build_object(
    'authorized',profile.role='admin' or coalesce(grant_row.is_active,false),
    'source',case when profile.role='admin' then 'admin' when grant_row.is_active then 'grant' else 'none' end,
    'profileId',profile.id,
    'grantedAt',grant_row.granted_at,
    'revokedAt',grant_row.revoked_at,
    'history',coalesce((select jsonb_agg(jsonb_build_object(
      'id',event.id,'previousActive',event.previous_active,'newActive',event.new_active,
      'reason',event.reason,'createdAt',event.created_at,
      'changedBy',coalesce(actor.display_name,actor.username,'44 Admin')
    ) order by event.created_at desc,event.id desc)
      from public.team_access_events event
      left join public.profiles actor on actor.id=event.changed_by
      where event.profile_id=profile.id),'[]'::jsonb)
  ) into result
  from public.profiles profile
  left join public.team_access_grants grant_row on grant_row.profile_id=profile.id
  where profile.id=target_profile_id;
  return result;
end;
$$;

create or replace function public.list_team_creators(
  target_query text default null,
  target_creator_type text default null,
  target_sort text default 'joined_desc',
  target_limit integer default 24,
  target_offset integer default 0
)
returns table(
  profile_id uuid,display_name text,username text,avatar_url text,bio text,creator_type text,
  public_links jsonb,joined_at timestamptz,published_item_count bigint,profile_url text,total_count bigint
)
language plpgsql security definer stable set search_path=public as $$
declare
  normalized_query text:=nullif(btrim(target_query),'');
  normalized_type text:=nullif(btrim(target_creator_type),'');
  normalized_sort text:=lower(btrim(coalesce(target_sort,'joined_desc')));
begin
  if not public.has_team_access() then raise exception 'Team access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid Team paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_sort not in('joined_desc','name','releases_desc') then raise exception 'Invalid Creator sort.' using errcode='22023'; end if;
  return query
  with eligible as (
    select profile.id,profile.display_name,profile.username,profile.avatar_url,profile.bio,profile.creator_type,
      profile.created_at,
      (select count(*) from public.catalog_items item where item.author_id=profile.id and item.status='published') item_count,
      coalesce((select jsonb_agg(jsonb_build_object(
        'platform',link.platform,'label',link.label,'url',link.url
      ) order by link.sort_order,link.created_at,link.id)
        from public.profile_external_links link where link.profile_id=profile.id),'[]'::jsonb) links
    from public.profiles profile
    where profile.role in('creator','admin') and profile.is_published
      and (normalized_type is null or profile.creator_type=normalized_type)
      and (normalized_query is null
        or coalesce(profile.display_name,'') ilike '%'||normalized_query||'%'
        or coalesce(profile.username,'') ilike '%'||normalized_query||'%'
        or coalesce(profile.bio,'') ilike '%'||normalized_query||'%')
  )
  select eligible.id,eligible.display_name,eligible.username,eligible.avatar_url,eligible.bio,eligible.creator_type,
    eligible.links,eligible.created_at,eligible.item_count,
    '/profile/'||coalesce(nullif(eligible.username,''),eligible.id::text),count(*) over()
  from eligible
  order by
    case when normalized_sort='name' then lower(coalesce(eligible.display_name,eligible.username,'')) end asc,
    case when normalized_sort='releases_desc' then eligible.item_count end desc,
    case when normalized_sort='joined_desc' then eligible.created_at end desc,
    eligible.id desc
  limit target_limit offset target_offset;
end;
$$;

create or replace function public.list_team_releases(
  target_query text default null,
  target_creator uuid default null,
  target_category text default null,
  target_sort text default 'added_desc',
  target_limit integer default 24,
  target_offset integer default 0
)
returns table(
  item_id uuid,title text,artwork_url text,creator_id uuid,creator_name text,creator_username text,
  category text,item_type text,release_date date,platform_added_at timestamptz,item_url text,total_count bigint
)
language plpgsql security definer stable set search_path=public as $$
declare
  normalized_query text:=nullif(btrim(target_query),'');
  normalized_category text:=nullif(lower(btrim(target_category)),'');
  normalized_sort text:=lower(btrim(coalesce(target_sort,'added_desc')));
begin
  if not public.has_team_access() then raise exception 'Team access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid Team paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_sort not in('added_desc','release_date_desc','title') then raise exception 'Invalid release sort.' using errcode='22023'; end if;
  return query
  select item.id,item.title,item.cover_url,item.author_id,
    coalesce(profile.display_name,profile.username,item.creator),profile.username,
    item.experience_type,item.item_type,item.release_date,item.created_at,
    '/store/item/'||item.slug,count(*) over()
  from public.catalog_items item
  left join public.profiles profile on profile.id=item.author_id
  where item.status='published'
    and (target_creator is null or item.author_id=target_creator)
    and (normalized_category is null or item.experience_type=normalized_category)
    and (normalized_query is null
      or item.title ilike '%'||normalized_query||'%'
      or item.creator ilike '%'||normalized_query||'%'
      or coalesce(profile.display_name,'') ilike '%'||normalized_query||'%'
      or coalesce(profile.username,'') ilike '%'||normalized_query||'%')
  order by
    case when normalized_sort='title' then lower(item.title) end asc,
    case when normalized_sort='release_date_desc' then item.release_date end desc nulls last,
    case when normalized_sort='added_desc' then item.created_at end desc,
    item.id desc
  limit target_limit offset target_offset;
end;
$$;

-- Add the Team-only filter and badge fact to the existing Admin directory.
drop function public.list_admin_people(text,text,integer,integer);
create function public.list_admin_people(
  target_query text default null,
  target_role text default null,
  target_limit integer default 8,
  target_offset integer default 0
)
returns table(
  profile_id uuid,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,
  signed_up_at timestamptz,display_name text,username text,avatar_url text,profile_role text,
  creator_type text,item_count bigint,profile_missing boolean,creator_request_status text,
  creator_request_requested_at timestamptz,team_access boolean,total_count bigint
)
language plpgsql security definer stable set search_path=public,auth as $$
declare normalized_query text:=nullif(btrim(target_query),''); normalized_role text:=nullif(lower(btrim(target_role)),'');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid people paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_role is not null and normalized_role not in('member','creator','admin','creator_request','team') then raise exception 'Invalid profile role.' using errcode='22023'; end if;
  return query
    select account.id,account.email::text,account.email_confirmed_at,account.last_sign_in_at,account.created_at,
      profile.display_name,profile.username,profile.avatar_url,coalesce(profile.role,'member'),profile.creator_type,
      (select count(*) from public.catalog_items item where item.author_id=account.id),profile.id is null,
      request.status,request.requested_at,
      (coalesce(profile.role,'member')='admin' or coalesce(team_grant.is_active,false)),count(*) over()
    from auth.users account
    left join public.profiles profile on profile.id=account.id
    left join public.creator_access_requests request on request.profile_id=account.id
    left join public.team_access_grants team_grant on team_grant.profile_id=account.id
    where (
      normalized_role is null
      or (normalized_role='creator_request' and request.status='pending')
      or (normalized_role='team' and (coalesce(profile.role,'member')='admin' or coalesce(team_grant.is_active,false)))
      or (normalized_role not in('creator_request','team') and coalesce(profile.role,'member')=normalized_role)
    ) and (normalized_query is null
      or coalesce(account.email,'') ilike '%'||normalized_query||'%'
      or coalesce(profile.display_name,'') ilike '%'||normalized_query||'%'
      or coalesce(profile.username,'') ilike '%'||normalized_query||'%')
    order by case when request.status='pending' then 0 else 1 end,account.created_at desc,account.id desc
    limit target_limit offset target_offset;
end;
$$;

alter table public.email_outbox_events drop constraint if exists email_outbox_events_template_key_check;
alter table public.email_outbox_events add constraint email_outbox_events_template_key_check
  check(template_key in(
    'welcome','purchase_confirmation','refund_cancellation','fulfillment_tracking','support_acknowledgement',
    'admin_signup_notification','admin_release_notification','creator_access_granted','team_access_granted'
  ));

create or replace function public.queue_team_access_granted()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare account_email text; account_name text;
begin
  if not new.new_active then return new; end if;
  select account.email,coalesce(nullif(profile.display_name,''),nullif(profile.username,''),'Team member')
  into account_email,account_name from auth.users account
  left join public.profiles profile on profile.id=account.id where account.id=new.profile_id;
  if account_email is null then return new; end if;
  insert into public.email_outbox_events(
    event_key,template_key,template_version,recipient_user_id,recipient_email,source_kind,source_id,payload
  ) values(
    'team-access-granted/'||new.id,'team_access_granted',1,new.profile_id,account_email,'account',new.profile_id,
    jsonb_build_object('displayName',account_name,'teamUrl','https://app.44os.com/team')
  ) on conflict(event_key) do nothing;
  insert into public.achievement_events(user_id,event_type,metadata)
  values(new.profile_id,'team_access_granted',jsonb_build_object('team_url','/team'));
  return new;
end;
$$;
create trigger team_access_events_queue_grant_notification after insert on public.team_access_events
for each row execute function public.queue_team_access_granted();

revoke all on function public.has_team_access(),public.get_my_team_access(),
  public.set_admin_team_access(uuid,boolean,text),public.get_admin_team_access(uuid),
  public.list_team_creators(text,text,text,integer,integer),
  public.list_team_releases(text,uuid,text,text,integer,integer),
  public.list_admin_people(text,text,integer,integer),public.protect_team_access_events(),
  public.queue_team_access_granted() from public,anon,authenticated;
grant execute on function public.has_team_access(),public.get_my_team_access(),
  public.set_admin_team_access(uuid,boolean,text),public.get_admin_team_access(uuid),
  public.list_team_creators(text,text,text,integer,integer),
  public.list_team_releases(text,uuid,text,text,integer,integer),
  public.list_admin_people(text,text,integer,integer) to authenticated,service_role;

comment on table public.team_access_grants is 'Current Team workspace permission. This capability never changes a profile role.';
comment on table public.team_access_events is 'Immutable administrator audit of Team workspace grants and revocations.';
comment on table public.team_brand_kits is 'Private version and checksum registry for owner-approved Team Brand Kit archives.';
comment on function public.list_team_creators(text,text,text,integer,integer) is 'Team-only directory containing published public Creator facts and no account email or private metadata.';
comment on function public.list_team_releases(text,uuid,text,text,integer,integer) is 'Team-only directory containing published Item facts and no drafts, files, sales, or payout data.';

commit;
