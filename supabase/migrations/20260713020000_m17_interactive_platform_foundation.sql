-- M17 Interactive Platform foundation. Unity/WebGL exports remain external build
-- artifacts; this migration defines their launch, compatibility, progress, and
-- trusted-achievement boundaries without storing a generic executable blob.

create table public.interactive_origins (
  origin text primary key,
  label text not null check (char_length(label) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint interactive_origins_https_check check (
    origin ~ '^https://[a-z0-9.-]+(:[0-9]{2,5})?$' and origin !~ '/$'
  )
);

insert into public.interactive_origins(origin,label)
values ('https://interactive.44os.com','44OS isolated interactive runtime');

create table public.interactive_builds (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.catalog_items(id) on delete cascade,
  runtime text not null default 'unity_webgl' check (runtime in ('unity_webgl','webgl')),
  manifest_version integer not null default 1 check (manifest_version > 0),
  build_version text not null check (char_length(build_version) between 1 and 80),
  unity_version text check (unity_version is null or char_length(unity_version) between 1 and 40),
  status text not null default 'inactive' check (status in ('inactive','ready','retired')),
  entry_url text,
  compression text not null default 'brotli' check (compression in ('none','gzip','brotli')),
  decompression_fallback boolean not null default false,
  webgl_version smallint not null default 2 check (webgl_version in (1,2)),
  wasm_required boolean not null default true,
  requires_cross_origin_isolation boolean not null default false,
  supports_desktop boolean not null default true,
  supports_mobile boolean not null default false,
  supported_browsers text[] not null default array['chrome','edge','firefox','safari']::text[],
  supported_inputs text[] not null default array['keyboard','mouse','touch']::text[],
  preferred_orientation text not null default 'any' check (preferred_orientation in ('any','portrait','landscape')),
  minimum_device_memory_mb integer check (minimum_device_memory_mb is null or minimum_device_memory_mb between 256 and 65536),
  maximum_heap_memory_mb integer check (maximum_heap_memory_mb is null or maximum_heap_memory_mb between 64 and 4096),
  download_size_mb numeric(10,2) check (download_size_mb is null or download_size_mb between 0.01 and 2048),
  max_session_minutes integer not null default 240 check (max_session_minutes between 15 and 480),
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interactive_builds_entry_check check (
    (status <> 'ready') or (entry_url is not null and entry_url ~ '^https://')
  ),
  constraint interactive_builds_browser_check check (
    cardinality(supported_browsers) > 0 and
    supported_browsers <@ array['chrome','edge','firefox','safari']::text[]
  ),
  constraint interactive_builds_input_check check (
    cardinality(supported_inputs) > 0 and
    supported_inputs <@ array['keyboard','mouse','touch','gamepad']::text[]
  )
);

create table public.interactive_event_definitions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  event_key text not null check (event_key ~ '^[a-z][a-z0-9_.-]{0,79}$'),
  event_kind text not null check (event_kind in ('progress','achievement')),
  schema_version integer not null default 1 check (schema_version > 0),
  achievement_id uuid references public.item_achievements(id) on delete restrict,
  max_per_session integer not null default 100 check (max_per_session between 1 and 1000),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id,event_key),
  constraint interactive_event_definition_achievement_check check (
    (event_kind='achievement' and achievement_id is not null)
    or (event_kind='progress' and achievement_id is null)
  )
);

create table public.interactive_launch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  build_id uuid not null references public.interactive_builds(id) on delete restrict,
  token_hash bytea not null unique,
  status text not null default 'active' check (status in ('active','ended','expired','revoked')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  client_context jsonb not null default '{}',
  constraint interactive_launch_context_check check (
    jsonb_typeof(client_context)='object' and octet_length(client_context::text) <= 8192
  ),
  constraint interactive_launch_expiry_check check (expires_at > started_at)
);

create table public.interactive_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interactive_launch_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  definition_id uuid not null references public.interactive_event_definitions(id) on delete restrict,
  sequence_number integer,
  external_event_id uuid,
  event_key text not null,
  event_kind text not null check (event_kind in ('progress','achievement')),
  trust_level text not null check (trust_level in ('client','signed')),
  payload jsonb not null default '{}',
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  signing_key_id text,
  replay_nonce text,
  signature_sha256 text,
  constraint interactive_event_payload_check check (
    jsonb_typeof(payload)='object' and octet_length(payload::text) <= 16384
  ),
  constraint interactive_event_source_check check (
    (trust_level='client' and sequence_number is not null and external_event_id is null and signing_key_id is null and replay_nonce is null and signature_sha256 is null)
    or
    (trust_level='signed' and sequence_number is null and external_event_id is not null and signing_key_id is not null and replay_nonce is not null and signature_sha256 ~ '^[a-f0-9]{64}$')
  )
);

create unique index interactive_events_client_sequence_key
  on public.interactive_events(session_id,sequence_number) where trust_level='client';
create unique index interactive_events_external_event_key
  on public.interactive_events(external_event_id) where external_event_id is not null;
create unique index interactive_events_replay_nonce_key
  on public.interactive_events(signing_key_id,replay_nonce) where replay_nonce is not null;
create index interactive_events_user_item_received_idx
  on public.interactive_events(user_id,item_id,received_at desc);

create table public.interactive_progress_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  definition_id uuid not null references public.interactive_event_definitions(id) on delete cascade,
  payload jsonb not null default '{}',
  trust_level text not null check (trust_level in ('client','signed')),
  source_event_id uuid not null references public.interactive_events(id) on delete cascade,
  occurred_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key(user_id,definition_id),
  constraint interactive_progress_payload_check check (
    jsonb_typeof(payload)='object' and octet_length(payload::text) <= 16384
  )
);

create or replace function public.is_allowed_interactive_url(target_url text)
returns boolean language sql stable security definer set search_path=public as $$
  select target_url is not null and target_url !~ '[[:cntrl:][:space:]]'
    and exists(
      select 1 from public.interactive_origins allowed
      where allowed.is_active and (target_url=allowed.origin or target_url like allowed.origin || '/%')
    );
$$;

create or replace function public.save_interactive_build(target_item_id uuid,payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid(); existing public.interactive_builds; saved_id uuid;
declare requested_status text := coalesce(payload->>'status','inactive');
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not public.can_manage_item(target_item_id) then raise exception 'Item management required' using errcode='42501'; end if;
  if jsonb_typeof(payload) <> 'object' or octet_length(payload::text)>16384 then raise exception 'invalid build payload' using errcode='22023'; end if;
  select * into existing from public.interactive_builds where item_id=target_item_id;
  -- Any creator-side manifest change requires a fresh 44 review.
  if not public.is_platform_admin() then requested_status := 'inactive'; end if;
  if requested_status='ready' and not public.is_allowed_interactive_url(payload->>'entry_url') then
    raise exception 'Interactive entry URL must use an approved isolated origin.' using errcode='23514';
  end if;
  insert into public.interactive_builds(
    item_id,runtime,manifest_version,build_version,unity_version,status,entry_url,compression,
    decompression_fallback,webgl_version,wasm_required,requires_cross_origin_isolation,
    supports_desktop,supports_mobile,supported_browsers,supported_inputs,preferred_orientation,
    minimum_device_memory_mb,maximum_heap_memory_mb,download_size_mb,max_session_minutes,
    created_by,reviewed_by,reviewed_at,updated_at
  ) values (
    target_item_id,coalesce(payload->>'runtime','unity_webgl'),coalesce((payload->>'manifest_version')::integer,1),
    payload->>'build_version',nullif(payload->>'unity_version',''),requested_status,nullif(payload->>'entry_url',''),
    coalesce(payload->>'compression','brotli'),coalesce((payload->>'decompression_fallback')::boolean,false),
    coalesce((payload->>'webgl_version')::smallint,2),coalesce((payload->>'wasm_required')::boolean,true),
    coalesce((payload->>'requires_cross_origin_isolation')::boolean,false),coalesce((payload->>'supports_desktop')::boolean,true),
    coalesce((payload->>'supports_mobile')::boolean,false),
    case when jsonb_typeof(payload->'supported_browsers')='array' then array(select jsonb_array_elements_text(payload->'supported_browsers')) else array['chrome','edge','firefox','safari'] end,
    case when jsonb_typeof(payload->'supported_inputs')='array' then array(select jsonb_array_elements_text(payload->'supported_inputs')) else array['keyboard','mouse','touch'] end,
    coalesce(payload->>'preferred_orientation','any'),
    (payload->>'minimum_device_memory_mb')::integer,(payload->>'maximum_heap_memory_mb')::integer,(payload->>'download_size_mb')::numeric,
    coalesce((payload->>'max_session_minutes')::integer,240),active_user,
    case when public.is_platform_admin() and requested_status='ready' then active_user else null end,
    case when public.is_platform_admin() and requested_status='ready' then now() else null end,now()
  ) on conflict(item_id) do update set
    runtime=excluded.runtime,manifest_version=excluded.manifest_version,build_version=excluded.build_version,
    unity_version=excluded.unity_version,status=excluded.status,entry_url=excluded.entry_url,compression=excluded.compression,
    decompression_fallback=excluded.decompression_fallback,webgl_version=excluded.webgl_version,wasm_required=excluded.wasm_required,
    requires_cross_origin_isolation=excluded.requires_cross_origin_isolation,supports_desktop=excluded.supports_desktop,
    supports_mobile=excluded.supports_mobile,supported_browsers=excluded.supported_browsers,supported_inputs=excluded.supported_inputs,
    preferred_orientation=excluded.preferred_orientation,minimum_device_memory_mb=excluded.minimum_device_memory_mb,
    maximum_heap_memory_mb=excluded.maximum_heap_memory_mb,download_size_mb=excluded.download_size_mb,
    max_session_minutes=excluded.max_session_minutes,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,updated_at=now()
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.save_interactive_event_definition(target_item_id uuid,payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid(); saved_id uuid; target_achievement uuid := nullif(payload->>'achievement_id','')::uuid;
declare requested_enabled boolean := coalesce((payload->>'is_enabled')::boolean,false);
begin
  if active_user is null or not public.can_manage_item(target_item_id) then raise exception 'Item management required' using errcode='42501'; end if;
  -- Definitions that can influence trusted state also require 44 review.
  if not public.is_platform_admin() then requested_enabled := false; end if;
  if payload->>'event_kind'='achievement' and not exists(
    select 1 from public.item_achievements where id=target_achievement and item_id=target_item_id
  ) then raise exception 'Achievement must belong to the same Item.' using errcode='23514'; end if;
  insert into public.interactive_event_definitions(item_id,event_key,event_kind,schema_version,achievement_id,max_per_session,is_enabled,updated_at)
  values(target_item_id,payload->>'event_key',payload->>'event_kind',coalesce((payload->>'schema_version')::integer,1),target_achievement,
    coalesce((payload->>'max_per_session')::integer,100),requested_enabled,now())
  on conflict(item_id,event_key) do update set event_kind=excluded.event_kind,schema_version=excluded.schema_version,
    achievement_id=excluded.achievement_id,max_per_session=excluded.max_per_session,is_enabled=excluded.is_enabled,updated_at=now()
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.begin_interactive_launch(target_item_id uuid,client_context jsonb default '{}')
returns table(session_id uuid,session_token uuid,entry_url text,expires_at timestamptz,manifest jsonb)
language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid(); build public.interactive_builds; raw_token uuid := gen_random_uuid(); new_session uuid; expiry timestamptz;
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not (public.can_manage_item(target_item_id) or public.has_item_entitlement(active_user,target_item_id,'library_access')) then
    raise exception 'Library access required' using errcode='42501';
  end if;
  select b.* into build from public.interactive_builds b join public.catalog_items i on i.id=b.item_id
  where b.item_id=target_item_id and b.status='ready' and public.is_allowed_interactive_url(b.entry_url)
    and (public.can_manage_item(target_item_id) or i.status='published');
  if build.id is null then raise exception 'Interactive experience is not available.' using errcode='P0002'; end if;
  if jsonb_typeof(client_context)<>'object' or octet_length(client_context::text)>8192 then raise exception 'invalid client context' using errcode='22023'; end if;
  expiry := now()+make_interval(mins=>build.max_session_minutes);
  insert into public.interactive_launch_sessions(user_id,item_id,build_id,token_hash,expires_at,client_context)
  values(active_user,target_item_id,build.id,extensions.digest(raw_token::text,'sha256'),expiry,client_context) returning id into new_session;
  return query select new_session,raw_token,build.entry_url,expiry,jsonb_build_object(
    'manifestVersion',build.manifest_version,'runtime',build.runtime,'buildVersion',build.build_version,
    'unityVersion',build.unity_version,'compression',build.compression,'decompressionFallback',build.decompression_fallback,
    'webglVersion',build.webgl_version,'wasmRequired',build.wasm_required,'requiresCrossOriginIsolation',build.requires_cross_origin_isolation,
    'supportsDesktop',build.supports_desktop,'supportsMobile',build.supports_mobile,'supportedBrowsers',build.supported_browsers,
    'supportedInputs',build.supported_inputs,'preferredOrientation',build.preferred_orientation,
    'minimumDeviceMemoryMb',build.minimum_device_memory_mb,'maximumHeapMemoryMb',build.maximum_heap_memory_mb,
    'downloadSizeMb',build.download_size_mb
  );
end;
$$;

create or replace function public.record_interactive_progress(
  target_session_id uuid,target_session_token uuid,target_sequence_number integer,
  target_event_key text,event_payload jsonb,target_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid(); session_row public.interactive_launch_sessions; definition public.interactive_event_definitions; event_id uuid;
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into session_row from public.interactive_launch_sessions where id=target_session_id for update;
  if session_row.id is null or session_row.user_id<>active_user or session_row.status<>'active'
    or session_row.expires_at<=now() or session_row.token_hash<>extensions.digest(target_session_token::text,'sha256') then
    raise exception 'invalid or expired interactive session' using errcode='42501';
  end if;
  select * into definition from public.interactive_event_definitions
  where item_id=session_row.item_id and event_key=target_event_key and event_kind='progress' and is_enabled;
  if definition.id is null then raise exception 'unknown progress event' using errcode='22023'; end if;
  if jsonb_typeof(event_payload)<>'object' or octet_length(event_payload::text)>16384 or target_sequence_number<1 then
    raise exception 'invalid progress event' using errcode='22023';
  end if;
  if (select count(*) from public.interactive_events where session_id=target_session_id and definition_id=definition.id)>=definition.max_per_session then
    raise exception 'progress event limit reached' using errcode='54000';
  end if;
  insert into public.interactive_events(session_id,user_id,item_id,definition_id,sequence_number,event_key,event_kind,trust_level,payload,occurred_at)
  values(session_row.id,active_user,session_row.item_id,definition.id,target_sequence_number,definition.event_key,'progress','client',event_payload,
    greatest(session_row.started_at,least(target_occurred_at,now()+interval '5 minutes'))) returning id into event_id;
  insert into public.interactive_progress_state(user_id,item_id,definition_id,payload,trust_level,source_event_id,occurred_at,updated_at)
  values(active_user,session_row.item_id,definition.id,event_payload,'client',event_id,target_occurred_at,now())
  on conflict(user_id,definition_id) do update set payload=excluded.payload,trust_level=excluded.trust_level,
    source_event_id=excluded.source_event_id,occurred_at=excluded.occurred_at,updated_at=now()
  where public.interactive_progress_state.trust_level='client';
  update public.interactive_launch_sessions set last_seen_at=now() where id=session_row.id;
  return event_id;
end;
$$;

create or replace function public.record_trusted_interactive_event(
  target_external_event_id uuid,target_replay_nonce text,target_signing_key_id text,target_signature_sha256 text,
  target_session_id uuid,target_user_id uuid,target_item_id uuid,target_event_key text,event_payload jsonb,target_occurred_at timestamptz
) returns table(event_id uuid,achievement_issued boolean)
language plpgsql security definer set search_path=public as $$
declare session_row public.interactive_launch_sessions; definition public.interactive_event_definitions; inserted_id uuid; issued boolean := false;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if target_replay_nonce !~ '^[A-Za-z0-9_-]{16,128}$' or target_signing_key_id !~ '^[A-Za-z0-9_.-]{1,64}$'
    or target_signature_sha256 !~ '^[a-f0-9]{64}$' or jsonb_typeof(event_payload)<>'object' or octet_length(event_payload::text)>16384 then
    raise exception 'invalid trusted event envelope' using errcode='22023';
  end if;
  select * into session_row from public.interactive_launch_sessions where id=target_session_id for update;
  if session_row.id is null or session_row.user_id<>target_user_id or session_row.item_id<>target_item_id
    or session_row.status<>'active' or session_row.expires_at<=now() then raise exception 'invalid or expired interactive session' using errcode='42501'; end if;
  if target_occurred_at<session_row.started_at-interval '5 minutes' or target_occurred_at>now()+interval '5 minutes' then
    raise exception 'trusted event time outside session window' using errcode='22023';
  end if;
  select * into definition from public.interactive_event_definitions
  where item_id=target_item_id and event_key=target_event_key and is_enabled;
  if definition.id is null then raise exception 'unknown interactive event' using errcode='22023'; end if;
  if (select count(*) from public.interactive_events where session_id=target_session_id and definition_id=definition.id)>=definition.max_per_session then
    raise exception 'interactive event limit reached' using errcode='54000';
  end if;
  insert into public.interactive_events(session_id,user_id,item_id,definition_id,external_event_id,event_key,event_kind,trust_level,payload,
    occurred_at,signing_key_id,replay_nonce,signature_sha256)
  values(target_session_id,target_user_id,target_item_id,definition.id,target_external_event_id,definition.event_key,definition.event_kind,'signed',event_payload,
    target_occurred_at,target_signing_key_id,target_replay_nonce,target_signature_sha256) returning id into inserted_id;
  if definition.event_kind='progress' then
    insert into public.interactive_progress_state(user_id,item_id,definition_id,payload,trust_level,source_event_id,occurred_at,updated_at)
    values(target_user_id,target_item_id,definition.id,event_payload,'signed',inserted_id,target_occurred_at,now())
    on conflict(user_id,definition_id) do update set payload=excluded.payload,trust_level='signed',source_event_id=excluded.source_event_id,
      occurred_at=excluded.occurred_at,updated_at=now()
    where public.interactive_progress_state.occurred_at<=excluded.occurred_at;
  else
    issued := public.issue_item_achievement(target_user_id,target_item_id,definition.achievement_id,
      jsonb_build_object('source','signed_interactive_event','interactive_event_id',inserted_id,'external_event_id',target_external_event_id));
  end if;
  update public.interactive_launch_sessions set last_seen_at=now() where id=target_session_id;
  return query select inserted_id,issued;
end;
$$;

create or replace function public.end_interactive_launch(target_session_id uuid,target_session_token uuid)
returns void language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid();
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  update public.interactive_launch_sessions
  set status='ended',ended_at=now(),last_seen_at=now()
  where id=target_session_id and user_id=active_user and status='active'
    and token_hash=extensions.digest(target_session_token::text,'sha256');
  if not found then raise exception 'invalid interactive session' using errcode='42501'; end if;
end;
$$;

alter table public.interactive_origins enable row level security;
alter table public.interactive_builds enable row level security;
alter table public.interactive_event_definitions enable row level security;
alter table public.interactive_launch_sessions enable row level security;
alter table public.interactive_events enable row level security;
alter table public.interactive_progress_state enable row level security;

create policy interactive_builds_read on public.interactive_builds for select to anon,authenticated using (
  public.can_manage_item(item_id) or (status='ready' and exists(select 1 from public.catalog_items item where item.id=interactive_builds.item_id and item.status='published'))
);
create policy interactive_definitions_read on public.interactive_event_definitions for select to authenticated using (
  public.can_manage_item(item_id) or (is_enabled and exists(select 1 from public.catalog_items item where item.id=interactive_event_definitions.item_id and item.status='published'))
);
create policy interactive_sessions_owner_read on public.interactive_launch_sessions for select to authenticated using (user_id=auth.uid() or public.is_platform_admin());
create policy interactive_events_owner_read on public.interactive_events for select to authenticated using (user_id=auth.uid() or public.is_platform_admin());
create policy interactive_progress_owner_read on public.interactive_progress_state for select to authenticated using (user_id=auth.uid() or public.is_platform_admin());

revoke all on public.interactive_origins,public.interactive_builds,public.interactive_event_definitions,
  public.interactive_launch_sessions,public.interactive_events,public.interactive_progress_state from anon,authenticated;
grant select on public.interactive_builds to anon,authenticated;
grant select on public.interactive_event_definitions,public.interactive_launch_sessions,public.interactive_events,public.interactive_progress_state to authenticated;
grant all on public.interactive_origins,public.interactive_builds,public.interactive_event_definitions,
  public.interactive_launch_sessions,public.interactive_events,public.interactive_progress_state to service_role;

revoke execute on function public.is_allowed_interactive_url(text) from public,anon,authenticated;
revoke execute on function public.save_interactive_build(uuid,jsonb) from public,anon;
revoke execute on function public.save_interactive_event_definition(uuid,jsonb) from public,anon;
revoke execute on function public.begin_interactive_launch(uuid,jsonb) from public,anon;
revoke execute on function public.record_interactive_progress(uuid,uuid,integer,text,jsonb,timestamptz) from public,anon;
revoke execute on function public.end_interactive_launch(uuid,uuid) from public,anon;
revoke execute on function public.record_trusted_interactive_event(uuid,text,text,text,uuid,uuid,uuid,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_interactive_build(uuid,jsonb),public.save_interactive_event_definition(uuid,jsonb),
  public.begin_interactive_launch(uuid,jsonb),public.record_interactive_progress(uuid,uuid,integer,text,jsonb,timestamptz) to authenticated;
grant execute on function public.end_interactive_launch(uuid,uuid) to authenticated;
grant execute on function public.record_trusted_interactive_event(uuid,text,text,text,uuid,uuid,uuid,text,jsonb,timestamptz) to service_role;

comment on table public.interactive_builds is 'Reviewed manifest for an isolated Unity/WebGL Item build. Executable files remain build artifacts on an approved origin.';
comment on table public.interactive_events is 'Append-only interactive event evidence. Client progress is explicitly untrusted; signed events arrive only through the 44 server boundary.';
comment on function public.record_trusted_interactive_event(uuid,text,text,text,uuid,uuid,uuid,text,jsonb,timestamptz) is 'Service-only persistence after the application server verifies an HMAC envelope; replay nonce and external event ID are unique.';
