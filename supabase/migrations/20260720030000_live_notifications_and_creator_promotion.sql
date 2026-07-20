begin;

-- Community now writes to the canonical content spine. The original notification
-- triggers remain on the legacy tables for rollback compatibility, while these
-- functions cover every write made by the current application.
create or replace function public.notify_content_discussion_mentions()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor_name text;
begin
  if new.content_type <> 'discussion' or new.publication_status <> 'published' then return new; end if;
  actor_name := coalesce(public.notification_actor_name(new.author_id),'Someone');
  insert into public.achievement_events(user_id,event_type,metadata)
  select profile.id,'mention_received',jsonb_build_object(
    'actor_user_id',new.author_id,'actor_name',actor_name,'username',profile.username,
    'post_id',new.id,'post_slug',new.slug,'post_title',new.title,
    'post_body',left(coalesce(new.body,''),280)
  )
  from public.profiles profile
  where lower(profile.username) in (
    select distinct lower(match[2])
    from regexp_matches(coalesce(new.body,'')||' '||coalesce(new.title,''),'(^|\s)@([a-zA-Z0-9_]{2,32})','g') match
  ) and profile.id <> new.author_id;
  return new;
end;
$$;

create or replace function public.notify_content_discussion_reply()
returns trigger language plpgsql security definer set search_path=public as $$
declare discussion record; recipient_id uuid; actor_name text;
begin
  if new.reply_type <> 'comment' or new.publication_status <> 'published' then return new; end if;
  select id,author_id,slug,title into discussion
  from public.content_entries where id=new.entry_id and content_type='discussion';
  if discussion.id is null then return new; end if;
  actor_name := coalesce(public.notification_actor_name(new.author_id),'Someone');
  if new.parent_reply_id is not null then
    select author_id into recipient_id from public.content_replies where id=new.parent_reply_id;
  end if;
  recipient_id := coalesce(recipient_id,discussion.author_id);
  if recipient_id is not null and recipient_id <> new.author_id then
    insert into public.achievement_events(user_id,event_type,metadata) values(
      recipient_id,'reply_received',jsonb_build_object(
        'actor_user_id',new.author_id,'actor_name',actor_name,'post_id',discussion.id,
        'post_slug',discussion.slug,'post_title',discussion.title,'reply_id',new.id,
        'reply_body',left(coalesce(new.body,''),280),'parent_reply_id',new.parent_reply_id
      )
    );
  end if;
  insert into public.achievement_events(user_id,event_type,metadata)
  select profile.id,'mention_received',jsonb_build_object(
    'actor_user_id',new.author_id,'actor_name',actor_name,'username',profile.username,
    'post_id',discussion.id,'post_slug',discussion.slug,'post_title',discussion.title,
    'post_body',left(coalesce(new.body,''),280)
  )
  from public.profiles profile
  where lower(profile.username) in (
    select distinct lower(match[2])
    from regexp_matches(coalesce(new.body,''),'(^|\s)@([a-zA-Z0-9_]{2,32})','g') match
  ) and profile.id <> new.author_id and profile.id is distinct from recipient_id;
  return new;
end;
$$;

create or replace function public.notify_content_discussion_like()
returns trigger language plpgsql security definer set search_path=public as $$
declare discussion record;
begin
  if new.reaction_type <> 'like' then return new; end if;
  select id,author_id,slug,title into discussion
  from public.content_entries where id=new.entry_id and content_type='discussion';
  if discussion.id is null or discussion.author_id is null or discussion.author_id=new.profile_id then return new; end if;
  insert into public.achievement_events(user_id,event_type,metadata) values(
    discussion.author_id,'like_received',jsonb_build_object(
      'actor_user_id',new.profile_id,
      'actor_name',coalesce(public.notification_actor_name(new.profile_id),'Someone'),
      'post_id',discussion.id,'post_slug',discussion.slug,'post_title',discussion.title
    )
  );
  return new;
end;
$$;

drop trigger if exists content_entries_notify_discussion_mentions on public.content_entries;
create trigger content_entries_notify_discussion_mentions after insert on public.content_entries
for each row execute function public.notify_content_discussion_mentions();
drop trigger if exists content_replies_notify_discussion_reply on public.content_replies;
create trigger content_replies_notify_discussion_reply after insert on public.content_replies
for each row execute function public.notify_content_discussion_reply();
drop trigger if exists content_entry_reactions_notify_discussion_like on public.content_entry_reactions;
create trigger content_entry_reactions_notify_discussion_like after insert on public.content_entry_reactions
for each row execute function public.notify_content_discussion_like();

-- Legacy writes are mirrored into the canonical tables above. Removing only
-- their old notification triggers prevents a rollback client from notifying
-- twice while keeping the legacy write compatibility itself intact.
drop trigger if exists trg_notify_post_mentions on public.posts;
drop trigger if exists trg_notify_post_reply on public.post_replies;
drop trigger if exists trg_notify_post_like on public.post_likes;

-- Private browser subscriptions and a durable delivery queue. Subscription
-- endpoints and encryption keys are never readable by browser clients.
create table public.web_push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check(char_length(endpoint) between 20 and 4096),
  p256dh text not null check(char_length(p256dh) between 20 and 512),
  auth text not null check(char_length(auth) between 8 and 256),
  user_agent text check(user_agent is null or char_length(user_agent)<=512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index web_push_subscriptions_user_idx on public.web_push_subscriptions(user_id,updated_at desc);

create table public.web_push_deliveries(
  id uuid primary key default gen_random_uuid(),
  achievement_event_id uuid not null references public.achievement_events(id) on delete cascade,
  subscription_id uuid not null references public.web_push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','claimed','sent','failed')),
  attempt_count integer not null default 0 check(attempt_count>=0),
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(achievement_event_id,subscription_id),
  check((status='claimed')=(claim_token is not null and claimed_at is not null))
);
create index web_push_deliveries_claim_idx on public.web_push_deliveries(status,next_attempt_at,created_at);

alter table public.web_push_subscriptions enable row level security;
alter table public.web_push_deliveries enable row level security;
revoke all on public.web_push_subscriptions,public.web_push_deliveries from public,anon,authenticated;
grant all on public.web_push_subscriptions,public.web_push_deliveries to service_role;

create or replace function public.queue_web_push_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.event_type not in('reply_received','mention_received','message_received','creator_access_granted') then return new; end if;
  insert into public.web_push_deliveries(achievement_event_id,subscription_id)
  select new.id,subscription.id from public.web_push_subscriptions subscription where subscription.user_id=new.user_id
  on conflict(achievement_event_id,subscription_id) do nothing;
  return new;
end;
$$;
drop trigger if exists achievement_events_queue_web_push on public.achievement_events;
create trigger achievement_events_queue_web_push after insert on public.achievement_events
for each row execute function public.queue_web_push_delivery();

create function public.claim_web_push_deliveries(target_limit integer,target_claim_token uuid)
returns table(
  delivery_id uuid,achievement_event_id uuid,subscription_id uuid,event_type text,metadata jsonb,
  endpoint text,p256dh text,auth text,attempt_count integer
) language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>50 or target_claim_token is null then raise exception 'Invalid push claim.' using errcode='22023'; end if;
  update public.web_push_deliveries set status='pending',claim_token=null,claimed_at=null,
    last_error_code='stale_claim_recovered',next_attempt_at=now(),updated_at=now()
  where status='claimed' and claimed_at<now()-interval '10 minutes';
  return query
  with candidates as (
    select delivery.id from public.web_push_deliveries delivery
    where delivery.status='pending' and delivery.next_attempt_at<=now()
    order by delivery.created_at,delivery.id limit target_limit for update skip locked
  ), claimed as (
    update public.web_push_deliveries delivery set status='claimed',claim_token=target_claim_token,
      claimed_at=now(),attempt_count=delivery.attempt_count+1,updated_at=now()
    where delivery.id in(select id from candidates)
    returning delivery.*
  )
  select claimed.id,claimed.achievement_event_id,claimed.subscription_id,event.event_type,event.metadata,
    subscription.endpoint,subscription.p256dh,subscription.auth,claimed.attempt_count
  from claimed join public.achievement_events event on event.id=claimed.achievement_event_id
  join public.web_push_subscriptions subscription on subscription.id=claimed.subscription_id;
end;
$$;

create or replace function public.complete_web_push_delivery(target_delivery_id uuid,target_claim_token uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.web_push_deliveries set status='sent',sent_at=now(),claim_token=null,claimed_at=null,
    last_error_code=null,updated_at=now()
  where id=target_delivery_id and status='claimed' and claim_token=target_claim_token;
end;
$$;

create or replace function public.fail_web_push_delivery(
  target_delivery_id uuid,target_claim_token uuid,target_error_code text,target_retryable boolean
) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.web_push_deliveries set
    status=case when target_retryable and attempt_count<5 then 'pending' else 'failed' end,
    next_attempt_at=case when target_retryable and attempt_count<5 then now()+make_interval(secs=>least(3600,30*(2^attempt_count)::integer)) else 'infinity'::timestamptz end,
    claim_token=null,claimed_at=null,last_error_code=left(coalesce(target_error_code,'push_delivery_failed'),160),updated_at=now()
  where id=target_delivery_id and status='claimed' and claim_token=target_claim_token;
end;
$$;

revoke all on function public.claim_web_push_deliveries(integer,uuid),public.complete_web_push_delivery(uuid,uuid),
  public.fail_web_push_delivery(uuid,uuid,text,boolean),public.queue_web_push_delivery() from public,anon,authenticated;
grant execute on function public.claim_web_push_deliveries(integer,uuid),public.complete_web_push_delivery(uuid,uuid),
  public.fail_web_push_delivery(uuid,uuid,text,boolean) to service_role;

-- Realtime makes the bell update while the recipient is actively using 44OS.
do $$ begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='achievement_events'
  ) then alter publication supabase_realtime add table public.achievement_events; end if;
end $$;

-- Both manual Admin promotion and Creator-request approval write this immutable
-- audit row, so one trigger covers the two paths without sending duplicates.
alter table public.email_outbox_events drop constraint if exists email_outbox_events_template_key_check;
alter table public.email_outbox_events add constraint email_outbox_events_template_key_check
  check(template_key in(
    'welcome','purchase_confirmation','refund_cancellation','fulfillment_tracking','support_acknowledgement',
    'admin_signup_notification','admin_release_notification','creator_access_granted'
  ));

create or replace function public.queue_creator_access_granted()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare account_email text; account_name text;
begin
  if new.new_role<>'creator' then return new; end if;
  select account.email,coalesce(nullif(profile.display_name,''),nullif(profile.username,''),'Creator')
  into account_email,account_name from auth.users account
  left join public.profiles profile on profile.id=account.id where account.id=new.profile_id;
  if account_email is null then return new; end if;
  insert into public.email_outbox_events(
    event_key,template_key,template_version,recipient_user_id,recipient_email,source_kind,source_id,payload
  ) values(
    'creator-access-granted/'||new.id,'creator_access_granted',1,new.profile_id,account_email,'account',new.profile_id,
    jsonb_build_object('displayName',account_name,'studioUrl','https://44os.com/studio')
  ) on conflict(event_key) do nothing;
  insert into public.achievement_events(user_id,event_type,metadata)
  values(new.profile_id,'creator_access_granted',jsonb_build_object('studio_url','/studio'));
  return new;
end;
$$;
drop trigger if exists admin_profile_role_events_queue_creator_email on public.admin_profile_role_events;
create trigger admin_profile_role_events_queue_creator_email after insert on public.admin_profile_role_events
for each row execute function public.queue_creator_access_granted();
revoke all on function public.queue_creator_access_granted(),public.notify_content_discussion_mentions(),
  public.notify_content_discussion_reply(),public.notify_content_discussion_like() from public,anon,authenticated;

commit;
