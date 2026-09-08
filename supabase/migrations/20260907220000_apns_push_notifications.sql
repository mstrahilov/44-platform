begin;

-- Native iOS device tokens and a durable delivery outbox for Apple Push
-- Notification service, mirroring the existing web_push_subscriptions /
-- web_push_deliveries pattern exactly (see
-- 20260720030000_live_notifications_and_creator_promotion.sql) so the two
-- channels share one proven claim/complete/fail lifecycle rather than
-- inventing a second one.
create table public.apns_device_tokens(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_token text not null unique check(char_length(device_token) between 32 and 200),
  environment text not null check(environment in('sandbox','production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index apns_device_tokens_user_idx on public.apns_device_tokens(user_id,updated_at desc);

create table public.apns_deliveries(
  id uuid primary key default gen_random_uuid(),
  achievement_event_id uuid not null references public.achievement_events(id) on delete cascade,
  device_token_id uuid not null references public.apns_device_tokens(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','claimed','sent','failed')),
  attempt_count integer not null default 0 check(attempt_count>=0),
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(achievement_event_id,device_token_id),
  check((status='claimed')=(claim_token is not null and claimed_at is not null))
);
create index apns_deliveries_claim_idx on public.apns_deliveries(status,next_attempt_at,created_at);

alter table public.apns_device_tokens enable row level security;
alter table public.apns_deliveries enable row level security;
revoke all on public.apns_device_tokens,public.apns_deliveries from public,anon,authenticated;
grant all on public.apns_device_tokens,public.apns_deliveries to service_role;

-- `like_received` is included here (unlike queue_web_push_delivery, which
-- omits it) — a Like is exactly the kind of activity a member expects a
-- Lock Screen notification for on iOS, per explicit product direction.
create or replace function public.queue_apns_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.event_type not in('reply_received','mention_received','like_received','message_received','creator_access_granted') then return new; end if;
  insert into public.apns_deliveries(achievement_event_id,device_token_id)
  select new.id,device_token.id from public.apns_device_tokens device_token where device_token.user_id=new.user_id
  on conflict(achievement_event_id,device_token_id) do nothing;
  return new;
end;
$$;
drop trigger if exists achievement_events_queue_apns on public.achievement_events;
create trigger achievement_events_queue_apns after insert on public.achievement_events
for each row execute function public.queue_apns_delivery();

create function public.claim_apns_deliveries(target_limit integer,target_claim_token uuid)
returns table(
  delivery_id uuid,achievement_event_id uuid,device_token_id uuid,event_type text,metadata jsonb,
  device_token text,environment text,attempt_count integer
) language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>50 or target_claim_token is null then raise exception 'Invalid push claim.' using errcode='22023'; end if;
  update public.apns_deliveries set status='pending',claim_token=null,claimed_at=null,
    last_error_code='stale_claim_recovered',next_attempt_at=now(),updated_at=now()
  where status='claimed' and claimed_at<now()-interval '10 minutes';
  return query
  with candidates as (
    select delivery.id from public.apns_deliveries delivery
    where delivery.status='pending' and delivery.next_attempt_at<=now()
    order by delivery.created_at,delivery.id limit target_limit for update skip locked
  ), claimed as (
    update public.apns_deliveries delivery set status='claimed',claim_token=target_claim_token,
      claimed_at=now(),attempt_count=delivery.attempt_count+1,updated_at=now()
    where delivery.id in(select id from candidates)
    returning delivery.*
  )
  select claimed.id,claimed.achievement_event_id,claimed.device_token_id,event.event_type,event.metadata,
    device_token.device_token,device_token.environment,claimed.attempt_count
  from claimed join public.achievement_events event on event.id=claimed.achievement_event_id
  join public.apns_device_tokens device_token on device_token.id=claimed.device_token_id;
end;
$$;

create or replace function public.complete_apns_delivery(target_delivery_id uuid,target_claim_token uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.apns_deliveries set status='sent',sent_at=now(),claim_token=null,claimed_at=null,
    last_error_code=null,updated_at=now()
  where id=target_delivery_id and status='claimed' and claim_token=target_claim_token;
end;
$$;

create or replace function public.fail_apns_delivery(
  target_delivery_id uuid,target_claim_token uuid,target_error_code text,target_retryable boolean
) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.apns_deliveries set
    status=case when target_retryable and attempt_count<5 then 'pending' else 'failed' end,
    next_attempt_at=case when target_retryable and attempt_count<5 then now()+make_interval(secs=>least(3600,30*(2^attempt_count)::integer)) else 'infinity'::timestamptz end,
    claim_token=null,claimed_at=null,last_error_code=left(coalesce(target_error_code,'apns_delivery_failed'),160),updated_at=now()
  where id=target_delivery_id and status='claimed' and claim_token=target_claim_token;
end;
$$;

revoke all on function public.claim_apns_deliveries(integer,uuid),public.complete_apns_delivery(uuid,uuid),
  public.fail_apns_delivery(uuid,uuid,text,boolean),public.queue_apns_delivery() from public,anon,authenticated;
grant execute on function public.claim_apns_deliveries(integer,uuid),public.complete_apns_delivery(uuid,uuid),
  public.fail_apns_delivery(uuid,uuid,text,boolean) to service_role;

commit;
