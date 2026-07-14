-- M13/M14/M17 operations contracts.
-- Read-side administration, sanitized incident lookup, disabled notification
-- delivery, and a neutral registry for attachable Item capabilities.

create table public.ops_error_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  release text not null check (char_length(release) between 1 and 200),
  runtime text not null check (runtime in ('nodejs','edge','browser','unknown')),
  method text not null check (method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS','UNKNOWN')),
  path text not null check (char_length(path) between 1 and 500),
  error_name text not null check (char_length(error_name) between 1 and 160),
  error_digest text,
  error_code text,
  safe_message text check (safe_message is null or char_length(safe_message) <= 500),
  framework_context jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index ops_error_events_lookup_idx on public.ops_error_events(occurred_at desc, release, path);
create index ops_error_events_digest_idx on public.ops_error_events(error_digest) where error_digest is not null;
alter table public.ops_error_events enable row level security;
revoke all on public.ops_error_events from anon, authenticated;
grant select on public.ops_error_events to service_role;
grant all on public.ops_error_events to service_role;

create or replace function public.record_sanitized_error_event(
  target_occurred_at timestamptz,
  target_release text,
  target_runtime text,
  target_method text,
  target_path text,
  target_error_name text,
  target_error_digest text default null,
  target_error_code text default null,
  target_safe_message text default null,
  target_framework_context jsonb default '{}'
)
returns uuid language plpgsql security definer set search_path=public as $$
declare event_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  insert into public.ops_error_events(occurred_at,release,runtime,method,path,error_name,error_digest,error_code,safe_message,framework_context)
  values (
    coalesce(target_occurred_at,now()),
    left(coalesce(nullif(btrim(target_release),''),'unknown'),200),
    case when target_runtime in ('nodejs','edge','browser','unknown') then target_runtime else 'unknown' end,
    case when target_method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS') then target_method else 'UNKNOWN' end,
    left(coalesce(nullif(btrim(target_path),''),'/unknown'),500),
    left(coalesce(nullif(btrim(target_error_name),''),'UnknownError'),160),
    left(nullif(btrim(target_error_digest),''),200),
    left(nullif(btrim(target_error_code),''),120),
    left(nullif(btrim(target_safe_message),''),500),
    coalesce(target_framework_context,'{}') - 'headers' - 'query' - 'body' - 'user' - 'token'
  ) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.list_admin_error_events(
  target_release text default null,
  target_path text default null,
  target_since timestamptz default null,
  target_limit integer default 50,
  target_offset integer default 0
)
returns table(id uuid, occurred_at timestamptz, release text, runtime text, method text, path text, error_name text, error_digest text, error_code text, safe_message text, framework_context jsonb)
language plpgsql security definer stable set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit < 1 or target_limit > 100 or target_offset < 0 then raise exception 'Invalid error-event paging.' using errcode='22023'; end if;
  return query
    select e.id,e.occurred_at,e.release,e.runtime,e.method,e.path,e.error_name,e.error_digest,e.error_code,e.safe_message,e.framework_context
    from public.ops_error_events e
    where (target_release is null or e.release=target_release)
      and (target_path is null or e.path=target_path)
      and (target_since is null or e.occurred_at>=target_since)
    order by e.occurred_at desc, e.id desc
    limit target_limit offset target_offset;
end;
$$;

alter table public.item_submission_notification_events add column if not exists delivery_attempts integer not null default 0;
alter table public.item_submission_notification_events add column if not exists delivery_claimed_at timestamptz;
alter table public.item_submission_notification_events add column if not exists delivery_last_error text;

create or replace function public.reject_item_submission_notification_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.role() = 'service_role'
     and new.submission_id=old.submission_id and new.recipient_id is not distinct from old.recipient_id
     and new.event_type=old.event_type and new.payload=old.payload and new.created_at=old.created_at
     and new.id=old.id then
    return new;
  end if;
  raise exception 'Submission notification event metadata is immutable.';
end;
$$;

create or replace function public.complete_item_submission_notification_event(target_event_id uuid, target_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.item_submission_notification_events
  set delivered_at=case when target_error is null then now() else delivered_at end,
      delivery_last_error=left(nullif(btrim(target_error),''),500),
      delivery_claimed_at=case when target_error is null then delivery_claimed_at else null end
  where id=target_event_id;
  if not found then raise exception 'Notification event not found.' using errcode='P0002'; end if;
end;
$$;

create table public.notification_delivery_controls (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (not enabled or approved_at is not null)
);
insert into public.notification_delivery_controls(singleton) values(true);
alter table public.notification_delivery_controls enable row level security;
create policy notification_delivery_controls_admin_read on public.notification_delivery_controls for select to authenticated using (public.is_platform_admin());
revoke all on public.notification_delivery_controls from anon,authenticated;
grant select on public.notification_delivery_controls to authenticated;
grant all on public.notification_delivery_controls to service_role;

create or replace function public.claim_item_submission_notification_events(target_limit integer default 25)
returns table(id uuid, submission_id uuid, recipient_id uuid, event_type text, payload jsonb, created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if not (select enabled from public.notification_delivery_controls where singleton) then raise exception 'Notification delivery is disabled.' using errcode='55000'; end if;
  if target_limit < 1 or target_limit > 100 then raise exception 'Invalid notification batch size.' using errcode='22023'; end if;
  return query
    update public.item_submission_notification_events e
    set delivery_claimed_at=now(), delivery_attempts=e.delivery_attempts+1
    where e.id in (select candidate.id from public.item_submission_notification_events candidate where candidate.delivered_at is null and candidate.delivery_claimed_at is null order by candidate.created_at limit target_limit for update skip locked)
    returning e.id,e.submission_id,e.recipient_id,e.event_type,e.payload,e.created_at;
end;
$$;

create or replace function public.list_admin_submission_queue(target_status text default 'pending', target_limit integer default 50, target_offset integer default 0)
returns table(submission_id uuid,item_id uuid,submitter_id uuid,status text,submission_kind text,submitted_at timestamptz,decided_at timestamptz,decision_reason text,item_title text,item_slug text,creator_name text,pending_notification_count bigint)
language plpgsql security definer stable set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_status is not null and target_status not in ('pending','withdrawn','approved','rejected') then raise exception 'Invalid submission status.' using errcode='22023'; end if;
  if target_limit < 1 or target_limit > 100 or target_offset < 0 then raise exception 'Invalid submission paging.' using errcode='22023'; end if;
  return query
    select s.id,s.item_id,s.submitter_id,s.status,s.submission_kind,s.submitted_at,s.decided_at,s.decision_reason,i.title,i.slug,p.display_name,
      (select count(*) from public.item_submission_notification_events n where n.submission_id=s.id and n.delivered_at is null)
    from public.item_submissions s join public.item_submission_items i on i.submission_id=s.id join public.profiles p on p.id=s.submitter_id
    where target_status is null or s.status=target_status
    order by s.submitted_at desc,s.id desc limit target_limit offset target_offset;
end;
$$;

create or replace function public.get_admin_submission_detail(target_submission_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  return jsonb_build_object(
    'submission',(select to_jsonb(s) from public.item_submissions s where s.id=target_submission_id),
    'item',(select to_jsonb(i) from public.item_submission_items i where i.submission_id=target_submission_id),
    'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by d.decided_at desc) from public.item_submission_decisions d where d.submission_id=target_submission_id),'[]'::jsonb),
    'tombstones',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.item_submission_child_tombstones t where t.submission_id=target_submission_id),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.item_submission_notification_events n where n.submission_id=target_submission_id),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.record_sanitized_error_event(timestamptz,text,text,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_sanitized_error_event(timestamptz,text,text,text,text,text,text,text,text,jsonb) to service_role;
revoke all on function public.list_admin_error_events(text,text,timestamptz,integer,integer),public.list_admin_submission_queue(text,integer,integer),public.get_admin_submission_detail(uuid),public.claim_item_submission_notification_events(integer) from public,anon,authenticated;
grant execute on function public.list_admin_error_events(text,text,timestamptz,integer,integer),public.list_admin_submission_queue(text,integer,integer),public.get_admin_submission_detail(uuid) to authenticated;
grant execute on function public.claim_item_submission_notification_events(integer),public.complete_item_submission_notification_event(uuid,text) to service_role;

comment on table public.ops_error_events is 'Sanitized operational error index. Raw request content, headers, query values, tokens, and user content are excluded.';
comment on table public.notification_delivery_controls is 'Fail-closed notification adapter gate; outbox delivery remains disabled until explicitly approved.';
