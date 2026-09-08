begin;

-- Achievement unlocks now also queue a push, alongside the social events
-- already covered (reply/mention/like/message/creator_access_granted).
create or replace function public.queue_apns_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.event_type not in('reply_received','mention_received','like_received','message_received','creator_access_granted','achievement_unlocked') then return new; end if;
  insert into public.apns_deliveries(achievement_event_id,device_token_id)
  select new.id,device_token.id from public.apns_device_tokens device_token where device_token.user_id=new.user_id
  on conflict(achievement_event_id,device_token_id) do nothing;
  return new;
end;
$$;

-- `achievement_unlocked` events only carry the achievement's code/trigger
-- type in metadata, not a human-readable name — join item_achievements so
-- the send path has a real title without every achievement-issuing call
-- site needing to duplicate it into metadata. The column list is changing
-- (adding achievement_title), which Postgres won't allow via CREATE OR
-- REPLACE on a function with OUT parameters — drop it first.
drop function if exists public.claim_apns_deliveries(integer,uuid);
create function public.claim_apns_deliveries(target_limit integer,target_claim_token uuid)
returns table(
  delivery_id uuid,achievement_event_id uuid,device_token_id uuid,event_type text,metadata jsonb,
  device_token text,environment text,attempt_count integer,achievement_title text
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
    device_token.device_token,device_token.environment,claimed.attempt_count,achievement.title
  from claimed join public.achievement_events event on event.id=claimed.achievement_event_id
  join public.apns_device_tokens device_token on device_token.id=claimed.device_token_id
  left join public.item_achievements achievement on achievement.id=event.achievement_id;
end;
$$;

-- Dropping the function reset its grants — restore them.
revoke all on function public.claim_apns_deliveries(integer,uuid) from public,anon,authenticated;
grant execute on function public.claim_apns_deliveries(integer,uuid) to service_role;

commit;
