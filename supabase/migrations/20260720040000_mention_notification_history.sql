begin;

-- Mention delivery is keyed by the referenced post or reply so publishing and
-- later edits cannot create duplicates. Punctuation before @handles is valid,
-- and edits that publish a draft or add a mention are covered as well.
create or replace function public.notify_content_discussion_mentions()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor_name text;
begin
  if new.content_type <> 'discussion'
     or new.publication_status <> 'published'
     or new.moderation_status <> 'visible' then return new; end if;
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
    from regexp_matches(
      coalesce(new.body,'')||' '||coalesce(new.title,''),
      '(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,32})','g'
    ) match
  )
    and profile.id <> new.author_id
    and not exists (
      select 1 from public.achievement_events event
      where event.user_id=profile.id and event.event_type='mention_received'
        and event.metadata->>'post_id'=new.id::text
        and event.metadata->>'reply_id' is null
    );
  return new;
end;
$$;

create or replace function public.notify_content_discussion_reply()
returns trigger language plpgsql security definer set search_path=public as $$
declare discussion record; recipient_id uuid; actor_name text;
begin
  if new.reply_type <> 'comment'
     or new.publication_status <> 'published'
     or new.moderation_status <> 'visible' then return new; end if;
  select id,author_id,slug,title into discussion
  from public.content_entries
  where id=new.entry_id and content_type='discussion'
    and publication_status='published' and moderation_status='visible';
  if discussion.id is null then return new; end if;
  actor_name := coalesce(public.notification_actor_name(new.author_id),'Someone');
  if new.parent_reply_id is not null then
    select author_id into recipient_id from public.content_replies where id=new.parent_reply_id;
  end if;
  recipient_id := coalesce(recipient_id,discussion.author_id);
  if recipient_id is not null and recipient_id <> new.author_id and not exists (
    select 1 from public.achievement_events event
    where event.user_id=recipient_id and event.event_type='reply_received'
      and event.metadata->>'reply_id'=new.id::text
  ) then
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
    'post_body',left(coalesce(new.body,''),280),'reply_id',new.id
  )
  from public.profiles profile
  where lower(profile.username) in (
    select distinct lower(match[2])
    from regexp_matches(
      coalesce(new.body,''),'(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,32})','g'
    ) match
  )
    and profile.id <> new.author_id
    and profile.id is distinct from recipient_id
    and not exists (
      select 1 from public.achievement_events event
      where event.user_id=profile.id and event.event_type='mention_received'
        and event.metadata->>'reply_id'=new.id::text
    );
  return new;
end;
$$;

drop trigger if exists content_entries_notify_discussion_mentions on public.content_entries;
create trigger content_entries_notify_discussion_mentions
after insert or update of body,title,publication_status,moderation_status on public.content_entries
for each row execute function public.notify_content_discussion_mentions();

drop trigger if exists content_replies_notify_discussion_reply on public.content_replies;
create trigger content_replies_notify_discussion_reply
after insert or update of body,publication_status,moderation_status on public.content_replies
for each row execute function public.notify_content_discussion_reply();

-- Historical rows belong in notification history, but must not generate a
-- burst of stale native pushes when this migration is deployed.
create or replace function public.queue_web_push_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.event_type not in('reply_received','mention_received','message_received','creator_access_granted')
     or new.metadata->>'backfilled'='true' then return new; end if;
  insert into public.web_push_deliveries(achievement_event_id,subscription_id)
  select new.id,subscription.id
  from public.web_push_subscriptions subscription
  where subscription.user_id=new.user_id
  on conflict(achievement_event_id,subscription_id) do nothing;
  return new;
end;
$$;

insert into public.achievement_events(user_id,event_type,metadata,created_at)
select profile.id,'mention_received',jsonb_build_object(
  'actor_user_id',entry.author_id,
  'actor_name',coalesce(public.notification_actor_name(entry.author_id),'Someone'),
  'username',profile.username,'post_id',entry.id,'post_slug',entry.slug,
  'post_title',entry.title,'post_body',left(coalesce(entry.body,''),280),
  'backfilled',true
),entry.created_at
from public.content_entries entry
join public.profiles profile on lower(profile.username) in (
  select distinct lower(match[2])
  from regexp_matches(
    coalesce(entry.body,'')||' '||coalesce(entry.title,''),
    '(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,32})','g'
  ) match
)
where entry.content_type='discussion'
  and entry.publication_status='published'
  and entry.moderation_status='visible'
  and profile.id <> entry.author_id
  and not exists (
    select 1 from public.achievement_events event
    where event.user_id=profile.id and event.event_type='mention_received'
      and event.metadata->>'post_id'=entry.id::text
      and event.metadata->>'reply_id' is null
  );

insert into public.achievement_events(user_id,event_type,metadata,created_at)
select profile.id,'mention_received',jsonb_build_object(
  'actor_user_id',reply.author_id,
  'actor_name',coalesce(public.notification_actor_name(reply.author_id),'Someone'),
  'username',profile.username,'post_id',entry.id,'post_slug',entry.slug,
  'post_title',entry.title,'post_body',left(coalesce(reply.body,''),280),
  'reply_id',reply.id,'backfilled',true
),reply.created_at
from public.content_replies reply
join public.content_entries entry on entry.id=reply.entry_id and entry.content_type='discussion'
join public.profiles profile on lower(profile.username) in (
  select distinct lower(match[2])
  from regexp_matches(
    coalesce(reply.body,''),'(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,32})','g'
  ) match
)
where reply.reply_type='comment'
  and reply.publication_status='published'
  and reply.moderation_status='visible'
  and entry.publication_status='published'
  and entry.moderation_status='visible'
  and profile.id <> reply.author_id
  and not exists (
    select 1 from public.achievement_events event
    where event.user_id=profile.id and event.event_type='mention_received'
      and event.metadata->>'reply_id'=reply.id::text
  );

commit;
