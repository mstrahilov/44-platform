-- 44OS functional sweep (2026-07-04)
-- 1. library_items insert policy matches the Steam-style model:
--    free saves for free items and streamable music, purchases for any published item.
-- 2. product_reviews.user_id now references profiles so the reviewer embed works.
-- 3. Notification events are created by triggers (likes, replies, mentions, messages)
--    so recipients get rows in achievement_events without violating RLS.

-- ---------------------------------------------------------------------------
-- 1. Library inserts
-- ---------------------------------------------------------------------------

drop policy if exists "Users can add free products to library" on public.library_items;
drop policy if exists "Users can add items to their library" on public.library_items;

create policy "Users can add items to their library"
on public.library_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.products p
    where p.id = library_items.product_id
      and p.is_published = true
      and (
        library_items.acquisition_type = 'purchase'
        or p.is_free = true
        or coalesce(p.price_cents, 0) = 0
        or (p.experience_type = 'music' and coalesce(p.streaming_enabled, true))
      )
  )
);

-- The app writes acquisition_type 'purchase' (checkout + download unlock);
-- the original check constraint only allowed free/paid/grant.
alter table public.library_items
  drop constraint if exists library_items_acquisition_type_check;

alter table public.library_items
  add constraint library_items_acquisition_type_check
  check (acquisition_type = any (array['free'::text, 'paid'::text, 'grant'::text, 'purchase'::text]));

-- ---------------------------------------------------------------------------
-- 2. Reviews: reviewer profile embed
-- ---------------------------------------------------------------------------

alter table public.product_reviews
  drop constraint if exists product_reviews_user_id_fkey;

alter table public.product_reviews
  add constraint product_reviews_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Notification triggers (security definer, bypass RLS for recipients)
-- ---------------------------------------------------------------------------

create or replace function public.notification_actor_name(actor uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Someone')
  from public.profiles p
  where p.id = actor;
$$;

-- Post likes → like_received for the post author
create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
begin
  select id, author_id, slug, title into v_post from public.posts where id = new.post_id;
  if v_post.author_id is null or v_post.author_id = new.profile_id then
    return new;
  end if;

  insert into public.achievement_events (user_id, event_type, metadata)
  values (
    v_post.author_id,
    'like_received',
    jsonb_build_object(
      'actor_user_id', new.profile_id,
      'actor_name', coalesce(public.notification_actor_name(new.profile_id), 'Someone'),
      'post_id', v_post.id,
      'post_slug', v_post.slug,
      'post_title', v_post.title
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_post_like on public.post_likes;
create trigger trg_notify_post_like
after insert on public.post_likes
for each row execute function public.notify_post_like();

-- Replies → reply_received for the post author (or parent reply author),
-- plus mention_received for @usernames in the reply body.
create or replace function public.notify_post_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
  v_recipient uuid;
  v_actor_name text;
begin
  select id, author_id, slug, title into v_post from public.posts where id = new.post_id;
  v_actor_name := coalesce(public.notification_actor_name(new.author_id), 'Someone');

  if new.parent_reply_id is not null then
    select author_id into v_recipient from public.post_replies where id = new.parent_reply_id;
  end if;
  if v_recipient is null then
    v_recipient := v_post.author_id;
  end if;

  if v_recipient is not null and v_recipient <> new.author_id then
    insert into public.achievement_events (user_id, event_type, metadata)
    values (
      v_recipient,
      'reply_received',
      jsonb_build_object(
        'actor_user_id', new.author_id,
        'actor_name', v_actor_name,
        'post_id', v_post.id,
        'post_slug', v_post.slug,
        'post_title', v_post.title,
        'reply_id', new.id,
        'reply_body', left(coalesce(new.body, ''), 280),
        'parent_reply_id', new.parent_reply_id
      )
    );
  end if;

  -- Mentions inside the reply body
  insert into public.achievement_events (user_id, event_type, metadata)
  select
    p.id,
    'mention_received',
    jsonb_build_object(
      'actor_user_id', new.author_id,
      'actor_name', v_actor_name,
      'username', p.username,
      'post_id', v_post.id,
      'post_slug', v_post.slug,
      'post_title', v_post.title,
      'post_body', left(coalesce(new.body, ''), 280)
    )
  from public.profiles p
  where lower(p.username) in (
      select distinct lower(m[2])
      from regexp_matches(coalesce(new.body, ''), '(^|\s)@([a-zA-Z0-9_]{2,32})', 'g') m
    )
    and p.id <> new.author_id
    and p.id is distinct from v_recipient;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_reply on public.post_replies;
create trigger trg_notify_post_reply
after insert on public.post_replies
for each row execute function public.notify_post_reply();

-- New posts → mention_received for @usernames in the post body
create or replace function public.notify_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  v_actor_name := coalesce(public.notification_actor_name(new.author_id), 'Someone');

  insert into public.achievement_events (user_id, event_type, metadata)
  select
    p.id,
    'mention_received',
    jsonb_build_object(
      'actor_user_id', new.author_id,
      'actor_name', v_actor_name,
      'username', p.username,
      'post_id', new.id,
      'post_slug', new.slug,
      'post_title', new.title,
      'post_body', left(coalesce(new.body, ''), 280)
    )
  from public.profiles p
  where lower(p.username) in (
      select distinct lower(m[2])
      from regexp_matches(coalesce(new.body, '') || ' ' || coalesce(new.title, ''), '(^|\s)@([a-zA-Z0-9_]{2,32})', 'g') m
    )
    and p.id <> new.author_id;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_mentions on public.posts;
create trigger trg_notify_post_mentions
after insert on public.posts
for each row execute function public.notify_post_mentions();

-- Messages → message_received for every other conversation member
create or replace function public.notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  v_actor_name := coalesce(public.notification_actor_name(new.sender_id), 'Someone');

  insert into public.achievement_events (user_id, event_type, metadata)
  select
    cm.profile_id,
    'message_received',
    jsonb_build_object(
      'actor_user_id', new.sender_id,
      'actor_name', v_actor_name,
      'conversation_id', new.conversation_id,
      'message_body', left(coalesce(new.body, ''), 140)
    )
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.profile_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
after insert on public.messages
for each row execute function public.notify_message();

-- Refresh PostgREST schema cache so the new FK embed is available immediately
notify pgrst, 'reload schema';
