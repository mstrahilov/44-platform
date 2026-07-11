--
-- PostgreSQL database dump
--

-- \restrict kxHLVzGwF122i08gl1eGFIF5XF6opTVqpbDOHFHHC6NycbuAY4hXYys4PUqOHL7

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: account_exists_for_email("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."account_exists_for_email"("lookup_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(lookup_email))
  );
$$;


ALTER FUNCTION "public"."account_exists_for_email"("lookup_email" "text") OWNER TO "postgres";

--
-- Name: can_manage_item("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."can_manage_item"("target_item_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.catalog_items i
    where i.id = target_item_id
      and i.author_id = auth.uid()
  ) or exists (
    select 1
    from public.item_members im
    where im.item_id = target_item_id
      and im.profile_id = auth.uid()
      and im.member_role in ('owner', 'editor')
  );
$$;


ALTER FUNCTION "public"."can_manage_item"("target_item_id" "uuid") OWNER TO "postgres";

--
-- Name: create_or_open_direct_conversation("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."create_or_open_direct_conversation"("other_profile_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_profile_id uuid := auth.uid();
  direct_key text;
  resolved_conversation_id uuid;
begin
  if current_profile_id is null then
    raise exception 'You must be signed in to start a conversation.' using errcode = '42501';
  end if;

  if other_profile_id is null or other_profile_id = current_profile_id then
    raise exception 'Choose another member to message.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = other_profile_id) then
    raise exception 'That member profile is unavailable.' using errcode = 'P0002';
  end if;

  direct_key := least(current_profile_id::text, other_profile_id::text)
    || ':' || greatest(current_profile_id::text, other_profile_id::text);

  insert into public.conversations (conversation_key, created_by)
  values (direct_key, current_profile_id)
  on conflict (conversation_key) do update
    set conversation_key = excluded.conversation_key
  returning id into resolved_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values
    (resolved_conversation_id, current_profile_id),
    (resolved_conversation_id, other_profile_id)
  on conflict on constraint conversation_members_pkey do nothing;

  return resolved_conversation_id;
end;
$$;


ALTER FUNCTION "public"."create_or_open_direct_conversation"("other_profile_id" "uuid") OWNER TO "postgres";

--
-- Name: handle_new_user_profile(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  requested_username text;
  fallback_username text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  fallback_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'));
  fallback_username := trim(both '_' from fallback_username);

  if requested_username !~ '^[a-z0-9_]{3,32}$' then
    requested_username := left(coalesce(nullif(fallback_username, ''), 'member'), 23) || '_' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1),
      '44 Member'
    ),
    requested_username
  )
  on conflict (id) do nothing;

  return new;
end;
$_$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";

--
-- Name: is_conversation_member("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_profile_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.profile_id = p_profile_id
  );
$$;


ALTER FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";

--
-- Name: notification_actor_name("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."notification_actor_name"("actor" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Someone')
  from public.profiles p
  where p.id = actor;
$$;


ALTER FUNCTION "public"."notification_actor_name"("actor" "uuid") OWNER TO "postgres";

--
-- Name: notify_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."notify_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_message"() OWNER TO "postgres";

--
-- Name: notify_post_like(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."notify_post_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_post_like"() OWNER TO "postgres";

--
-- Name: notify_post_mentions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."notify_post_mentions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_post_mentions"() OWNER TO "postgres";

--
-- Name: notify_post_reply(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."notify_post_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_post_reply"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";

--
-- Name: send_direct_message("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."send_direct_message"("target_conversation_id" "uuid", "message_body" "text") RETURNS "public"."messages"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_profile_id uuid := auth.uid();
  clean_body text := trim(coalesce(message_body, ''));
  created_message public.messages;
begin
  if current_profile_id is null then
    raise exception 'You must be signed in to send a message.' using errcode = '42501';
  end if;

  if clean_body = '' then
    raise exception 'Write a message before sending.' using errcode = '22023';
  end if;

  if char_length(clean_body) > 4000 then
    raise exception 'Messages can be up to 4,000 characters.' using errcode = '22001';
  end if;

  if not public.is_conversation_member(target_conversation_id, current_profile_id) then
    raise exception 'You do not have access to this conversation.' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body, status)
  values (target_conversation_id, current_profile_id, clean_body, 'sent')
  returning * into created_message;

  update public.conversations
  set updated_at = created_message.created_at
  where id = target_conversation_id;

  return created_message;
end;
$$;


ALTER FUNCTION "public"."send_direct_message"("target_conversation_id" "uuid", "message_body" "text") OWNER TO "postgres";

--
-- Name: set_community_object_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_community_object_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_community_object_updated_at"() OWNER TO "postgres";

--
-- Name: set_merch_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_merch_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_merch_orders_updated_at"() OWNER TO "postgres";

--
-- Name: set_radio_playlist_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_radio_playlist_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_radio_playlist_updated_at"() OWNER TO "postgres";

--
-- Name: sync_catalog_item_capabilities(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."sync_catalog_item_capabilities"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.item_capabilities (item_id, capability_key)
  values (new.id, 'reviews'), (new.id, 'creator_updates')
  on conflict do nothing;

  if new.streaming_enabled then
    insert into public.item_capabilities (item_id, capability_key)
    values (new.id, 'streaming') on conflict do nothing;
  else
    delete from public.item_capabilities where item_id = new.id and capability_key = 'streaming';
  end if;

  if new.download_purchase_enabled or new.download_url is not null then
    insert into public.item_capabilities (item_id, capability_key)
    values (new.id, 'downloads') on conflict do nothing;
  else
    delete from public.item_capabilities where item_id = new.id and capability_key = 'downloads';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_catalog_item_capabilities"() OWNER TO "postgres";

--
-- Name: sync_item_achievement_capability(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."sync_item_achievement_capability"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_item_id uuid := coalesce(new.item_id, old.item_id);
begin
  if exists (select 1 from public.item_achievements where item_id = target_item_id) then
    insert into public.item_capabilities (item_id, capability_key)
    values (target_item_id, 'achievements') on conflict do nothing;
  else
    delete from public.item_capabilities
    where item_id = target_item_id and capability_key = 'achievements';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."sync_item_achievement_capability"() OWNER TO "postgres";

--
-- Name: sync_item_bonus_capability(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."sync_item_bonus_capability"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_item_id uuid := coalesce(new.item_id, old.item_id);
begin
  if exists (
    select 1 from public.item_assets
    where item_id = target_item_id and asset_type = 'bonus_content'
  ) then
    insert into public.item_capabilities (item_id, capability_key)
    values (target_item_id, 'bonus_content') on conflict do nothing;
  else
    delete from public.item_capabilities
    where item_id = target_item_id and capability_key = 'bonus_content';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."sync_item_bonus_capability"() OWNER TO "postgres";

--
-- Name: sync_question_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."sync_question_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.community_questions
  set
    answer_count = (
      select count(*)
      from public.community_question_answers
      where question_id = coalesce(new.question_id, old.question_id)
    ),
    has_accepted_answer = exists (
      select 1
      from public.community_question_answers
      where question_id = coalesce(new.question_id, old.question_id)
        and is_accepted = true
    )
  where id = coalesce(new.question_id, old.question_id);
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_question_counts"() OWNER TO "postgres";

--
-- Name: sync_question_vote_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."sync_question_vote_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.question_id is not null or old.question_id is not null then
    update public.community_questions
    set vote_count = (
      select count(*)
      from public.community_question_votes
      where question_id = coalesce(new.question_id, old.question_id)
    )
    where id = coalesce(new.question_id, old.question_id);
  end if;

  if new.answer_id is not null or old.answer_id is not null then
    update public.community_question_answers
    set vote_count = (
      select count(*)
      from public.community_question_votes
      where answer_id = coalesce(new.answer_id, old.answer_id)
    )
    where id = coalesce(new.answer_id, old.answer_id);
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_question_vote_counts"() OWNER TO "postgres";

--
-- Name: touch_item_foundation_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."touch_item_foundation_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_item_foundation_updated_at"() OWNER TO "postgres";

--
-- Name: unlock_signal_boost_from_share_visit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."unlock_signal_boost_from_share_visit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_achievement public.item_achievements%rowtype;
  v_overachiever public.item_achievements%rowtype;
  v_inserted integer := 0;
begin
  if new.referrer_id is null or new.item_id is null then
    return new;
  end if;

  select * into v_achievement
  from public.item_achievements
  where item_id = new.item_id and trigger_type = 'shared_link_opened'
  order by sort_order limit 1;

  if v_achievement.id is not null then
    insert into public.user_achievements (user_id, item_id, achievement_id)
    values (new.referrer_id, new.item_id, v_achievement.id)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      insert into public.achievement_events (user_id, item_id, achievement_id, event_type, metadata)
      values (
        new.referrer_id, new.item_id, v_achievement.id, 'achievement_unlocked',
        jsonb_build_object(
          'trigger_type', v_achievement.trigger_type,
          'achievement_code', v_achievement.code,
          'source', 'shared_item_link',
          'visitor_id', new.visitor_id,
          'share_visit_id', new.id
        )
      );
    end if;
  end if;

  select * into v_overachiever
  from public.item_achievements
  where item_id = new.item_id and code = 'overachiever'
  limit 1;

  if v_overachiever.id is not null
    and exists (
      select 1 from public.item_achievements required
      where required.item_id = new.item_id and required.code <> 'overachiever'
    )
    and not exists (
      select 1
      from public.item_achievements required
      where required.item_id = new.item_id
        and required.code <> 'overachiever'
        and not exists (
          select 1
          from public.user_achievements unlocked
          where unlocked.user_id = new.referrer_id
            and unlocked.item_id = new.item_id
            and unlocked.achievement_id = required.id
        )
    )
  then
    insert into public.user_achievements (user_id, item_id, achievement_id)
    values (new.referrer_id, new.item_id, v_overachiever.id)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      insert into public.achievement_events (user_id, item_id, achievement_id, event_type, metadata)
      values (
        new.referrer_id, new.item_id, v_overachiever.id, 'achievement_unlocked',
        jsonb_build_object(
          'trigger_type', v_overachiever.trigger_type,
          'achievement_code', v_overachiever.code,
          'source', 'overachiever_check',
          'completed_trigger', 'shared_link_opened'
        )
      );
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."unlock_signal_boost_from_share_visit"() OWNER TO "postgres";

--
-- Name: achievement_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."achievement_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid",
    "achievement_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."achievement_events" OWNER TO "postgres";

--
-- Name: TABLE "achievement_events"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."achievement_events" IS 'Achievement and points-related event audit log.';


--
-- Name: achievement_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."achievement_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "metric" "text" NOT NULL,
    "value" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."achievement_progress" OWNER TO "postgres";

--
-- Name: TABLE "achievement_progress"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."achievement_progress" IS 'Per-user counters and partial progress toward achievement unlocks.';


--
-- Name: achievement_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."achievement_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "trigger_type" "text" NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "points" integer DEFAULT 50 NOT NULL,
    "icon" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_secret" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "supported_experiences" "text"[] DEFAULT ARRAY['music'::"text"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."achievement_templates" OWNER TO "postgres";

--
-- Name: TABLE "achievement_templates"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."achievement_templates" IS '44-defined achievement catalog, grouped by supported experience type.';


--
-- Name: catalog_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."catalog_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_category_id" "uuid",
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "creator" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "is_free" boolean DEFAULT true NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "cover_url" "text",
    "hero_url" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year" integer,
    "feature_description" "text",
    "launch_url" "text",
    "read_url" "text",
    "download_url" "text",
    "author_id" "uuid",
    "short_description" "text",
    "long_description" "text",
    "market_mode" "text" DEFAULT 'global'::"text" NOT NULL,
    "local_price_cents" integer,
    "local_currency" "text",
    "available_locally_only" boolean DEFAULT false NOT NULL,
    "experience_type" "text" DEFAULT 'other'::"text" NOT NULL,
    "fulfillment_type" "text" DEFAULT 'digital'::"text" NOT NULL,
    "streaming_enabled" boolean DEFAULT true NOT NULL,
    "download_purchase_enabled" boolean DEFAULT true NOT NULL,
    "sort_order" bigint,
    "merch_fulfillment_mode" "text",
    "merch_shipping_scope" "text",
    CONSTRAINT "catalog_items_experience_type_check" CHECK (("experience_type" = ANY (ARRAY['music'::"text", 'book'::"text", 'asset'::"text", 'radio'::"text", 'video'::"text", 'game'::"text", 'merch'::"text", 'other'::"text"]))),
    CONSTRAINT "catalog_items_fulfillment_type_check" CHECK (("fulfillment_type" = ANY (ARRAY['digital'::"text", 'physical'::"text", 'hybrid'::"text"]))),
    CONSTRAINT "catalog_items_long_description_length_check" CHECK ((("long_description" IS NULL) OR (("char_length"("long_description") >= 0) AND ("char_length"("long_description") <= 5000)))),
    CONSTRAINT "catalog_items_market_mode_check" CHECK (("market_mode" = ANY (ARRAY['global'::"text", 'global_plus_local'::"text"]))),
    CONSTRAINT "catalog_items_merch_fulfillment_mode_check" CHECK ((("merch_fulfillment_mode" IS NULL) OR ("merch_fulfillment_mode" = ANY (ARRAY['ship'::"text", 'deliver'::"text"])))),
    CONSTRAINT "catalog_items_merch_shipping_scope_check" CHECK ((("merch_shipping_scope" IS NULL) OR ("merch_shipping_scope" = ANY (ARRAY['local'::"text", 'global'::"text"])))),
    CONSTRAINT "catalog_items_short_description_length_check" CHECK ((("short_description" IS NULL) OR (("char_length"("short_description") >= 1) AND ("char_length"("short_description") <= 220)))),
    CONSTRAINT "catalog_items_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."catalog_items" OWNER TO "postgres";

--
-- Name: TABLE "catalog_items"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."catalog_items" IS 'Canonical publishable Items. Store, Library, and Community are different faces of this stable identity; price and acquisition do not define an Item.';


--
-- Name: COLUMN "catalog_items"."item_category_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."catalog_items"."item_category_id" IS 'Optional top-level Store category. Runtime behavior is defined by experience_type and enabled capabilities.';


--
-- Name: COLUMN "catalog_items"."launch_url"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."catalog_items"."launch_url" IS 'Launch target for interactive products, Unity/WebGL experiences, games, or web apps.';


--
-- Name: COLUMN "catalog_items"."read_url"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."catalog_items"."read_url" IS 'Optional read/view target for books or readable products. Day-one Library behavior can still prefer download_url.';


--
-- Name: COLUMN "catalog_items"."download_url"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."catalog_items"."download_url" IS 'Download target for albums, books, sample packs, tools, and files.';


--
-- Name: community_collaboration_responses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."community_collaboration_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collaboration_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."community_collaboration_responses" OWNER TO "postgres";

--
-- Name: community_collaborations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."community_collaborations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "role_needed" "text",
    "project_type" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_collaborations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'filled'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."community_collaborations" OWNER TO "postgres";

--
-- Name: community_question_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."community_question_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "vote_count" integer DEFAULT 0 NOT NULL,
    "is_accepted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."community_question_answers" OWNER TO "postgres";

--
-- Name: community_question_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."community_question_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid",
    "answer_id" "uuid",
    "profile_id" "uuid" NOT NULL,
    "value" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_question_votes_check" CHECK (((("question_id" IS NOT NULL) AND ("answer_id" IS NULL)) OR (("question_id" IS NULL) AND ("answer_id" IS NOT NULL)))),
    CONSTRAINT "community_question_votes_value_check" CHECK (("value" = 1))
);


ALTER TABLE "public"."community_question_votes" OWNER TO "postgres";

--
-- Name: community_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."community_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "vote_count" integer DEFAULT 0 NOT NULL,
    "answer_count" integer DEFAULT 0 NOT NULL,
    "accepted_answer_id" "uuid",
    "has_accepted_answer" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_questions_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."community_questions" OWNER TO "postgres";

--
-- Name: conversation_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."conversation_members" (
    "conversation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_read_at" timestamp with time zone,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."conversation_members" OWNER TO "postgres";

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_key" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "currency" "text" NOT NULL,
    "usd_rate" numeric NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";

--
-- Name: item_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "trigger_type" "text" NOT NULL,
    "reward_item_id" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_secret" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reward_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "icon" "text",
    "template_id" "uuid"
);


ALTER TABLE "public"."item_achievements" OWNER TO "postgres";

--
-- Name: TABLE "item_achievements"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."item_achievements" IS 'Achievement templates enabled for one canonical Item.';


--
-- Name: item_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "asset_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "file_url" "text",
    "storage_path" "text",
    "is_downloadable" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_assets_asset_type_check" CHECK (("asset_type" = ANY (ARRAY['audio'::"text", 'book'::"text", 'sample_pack'::"text", 'gallery_image'::"text", 'bonus_content'::"text", 'commentary_audio'::"text", 'behind_the_scenes'::"text", 'image'::"text", 'webgl'::"text", 'template'::"text", 'music'::"text", 'merch'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."item_assets" OWNER TO "postgres";

--
-- Name: TABLE "item_assets"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."item_assets" IS 'Files and extras attached to an Item, including owned downloads, galleries, and release feature unlocks.';


--
-- Name: item_capabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_capabilities" (
    "item_id" "uuid" NOT NULL,
    "capability_key" "text" NOT NULL,
    "config_version" integer DEFAULT 1 NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_capabilities_config_version_check" CHECK (("config_version" > 0)),
    CONSTRAINT "item_capabilities_key_check" CHECK (("capability_key" = ANY (ARRAY['streaming'::"text", 'downloads'::"text", 'achievements'::"text", 'bonus_content'::"text", 'reviews'::"text", 'creator_updates'::"text", 'reader'::"text", 'sample_preview'::"text", 'commentary'::"text", 'behind_the_scenes'::"text", 'events'::"text", 'video'::"text", 'webgl'::"text"])))
);


ALTER TABLE "public"."item_capabilities" OWNER TO "postgres";

--
-- Name: item_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_categories" OWNER TO "postgres";

--
-- Name: TABLE "item_categories"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."item_categories" IS 'Top-level categories for canonical products, such as music, books, games, merch, and assets.';


--
-- Name: item_external_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_external_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "label" "text" NOT NULL,
    "url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_external_links_url_check" CHECK (("url" ~* '^https://'::"text"))
);


ALTER TABLE "public"."item_external_links" OWNER TO "postgres";

--
-- Name: item_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_members" (
    "item_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "member_role" "text" DEFAULT 'contributor'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_members_member_role_check" CHECK (("member_role" = ANY (ARRAY['owner'::"text", 'editor'::"text", 'contributor'::"text"])))
);


ALTER TABLE "public"."item_members" OWNER TO "postgres";

--
-- Name: item_share_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."item_share_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "visitor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_share_visits" OWNER TO "postgres";

--
-- Name: library_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."library_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "acquisition_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "acquired_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'visible'::"text" NOT NULL,
    CONSTRAINT "library_entries_acquisition_type_check" CHECK (("acquisition_type" = ANY (ARRAY['free'::"text", 'paid'::"text", 'grant'::"text", 'purchase'::"text"]))),
    CONSTRAINT "library_entries_status_check" CHECK (("status" = ANY (ARRAY['visible'::"text", 'hidden'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."library_entries" OWNER TO "postgres";

--
-- Name: TABLE "library_entries"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."library_entries" IS 'One visible Library relationship between a user and an Item. Future entitlements authorize access; this row owns Library display state.';


--
-- Name: merch_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."merch_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_cents" integer DEFAULT 0 NOT NULL,
    "line_total_cents" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "merch_order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."merch_order_items" OWNER TO "postgres";

--
-- Name: merch_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."merch_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "buyer_name" "text" NOT NULL,
    "buyer_email" "text" NOT NULL,
    "delivery_name" "text" NOT NULL,
    "delivery_address_1" "text" NOT NULL,
    "delivery_address_2" "text",
    "delivery_city" "text" NOT NULL,
    "delivery_region" "text" NOT NULL,
    "delivery_postal_code" "text" NOT NULL,
    "delivery_country" "text" NOT NULL,
    "delivery_notes" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "subtotal_cents" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "merch_orders_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'in_progress'::"text", 'completed'::"text", 'received'::"text"])))
);


ALTER TABLE "public"."merch_orders" OWNER TO "postgres";

--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";

--
-- Name: post_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."post_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "parent_reply_id" "uuid",
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_replies_status_check" CHECK (("status" = ANY (ARRAY['published'::"text", 'hidden'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."post_replies" OWNER TO "postgres";

--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid",
    "slug" "text",
    CONSTRAINT "posts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";

--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sentiment" "text" DEFAULT 'recommended'::"text" NOT NULL,
    "title" "text",
    "rating" integer,
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" IS NULL) OR (("rating" >= 1) AND ("rating" <= 5)))),
    CONSTRAINT "product_reviews_sentiment_check" CHECK (("sentiment" = ANY (ARRAY['recommended'::"text", 'not_recommended'::"text"]))),
    CONSTRAINT "product_reviews_status_check" CHECK (("status" = ANY (ARRAY['published'::"text", 'hidden'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";

--
-- Name: product_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."product_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "version_label" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_updates_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."product_updates" OWNER TO "postgres";

--
-- Name: profile_external_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."profile_external_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "label" "text" NOT NULL,
    "url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_external_links_url_check" CHECK (("url" ~* '^https://'::"text"))
);


ALTER TABLE "public"."profile_external_links" OWNER TO "postgres";

--
-- Name: profile_follows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."profile_follows" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_follows_no_self" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."profile_follows" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "username" "text",
    "avatar_url" "text",
    "bio" "text",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_official" boolean DEFAULT false NOT NULL,
    "slug" "text",
    "hero_url" "text",
    "creator_type" "text",
    "is_published" boolean DEFAULT true NOT NULL,
    "country_code" "text",
    "display_currency" "text",
    "home_country_code" "text",
    "home_currency" "text",
    "item_market_mode" "text" DEFAULT 'global'::"text" NOT NULL,
    "service_market_mode" "text" DEFAULT 'global'::"text" NOT NULL,
    CONSTRAINT "profiles_product_market_mode_check" CHECK (("item_market_mode" = ANY (ARRAY['global'::"text", 'global_plus_local'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'creator'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_service_market_mode_check" CHECK (("service_market_mode" = ANY (ARRAY['global'::"text", 'global_plus_local'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: radio_playlist_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."radio_playlist_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "track_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "added_by" "uuid",
    "added_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."radio_playlist_entries" OWNER TO "postgres";

--
-- Name: reply_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."reply_likes" (
    "reply_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reply_likes" OWNER TO "postgres";

--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."service_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_categories" OWNER TO "postgres";

--
-- Name: TABLE "service_categories"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."service_categories" IS 'Private categories for the dormant services placeholder catalog.';


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_category_id" "uuid",
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "starting_price_cents" integer DEFAULT 0 NOT NULL,
    "delivery_estimate" "text",
    "cover_url" "text",
    "featured" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feature_description" "text",
    "service_type" "text",
    "author_id" "uuid",
    "short_description" "text" NOT NULL,
    "long_description" "text" NOT NULL,
    "market_mode" "text" DEFAULT 'global'::"text" NOT NULL,
    "local_price_cents" integer,
    "local_currency" "text",
    "available_locally_only" boolean DEFAULT false NOT NULL,
    CONSTRAINT "services_long_description_length_check" CHECK ((("char_length"("long_description") >= 1) AND ("char_length"("long_description") <= 5000))),
    CONSTRAINT "services_market_mode_check" CHECK (("market_mode" = ANY (ARRAY['global'::"text", 'global_plus_local'::"text"]))),
    CONSTRAINT "services_short_description_length_check" CHECK ((("char_length"("short_description") >= 1) AND ("char_length"("short_description") <= 220))),
    CONSTRAINT "services_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";

--
-- Name: TABLE "services"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."services" IS 'Private placeholder catalog for future service offerings. Not a launch surface. Future services should migrate into the canonical products model with service fulfillment.';


--
-- Name: tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "number" integer NOT NULL,
    "title" "text" NOT NULL,
    "duration_seconds" integer,
    "audio_url" "text",
    "download_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tracks" OWNER TO "postgres";

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";

--
-- Name: TABLE "user_achievements"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."user_achievements" IS 'User achievement unlocks for Item-level and future platform-level achievements.';


--
-- Name: user_notification_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."user_notification_state" (
    "user_id" "uuid" NOT NULL,
    "seen_notification_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "hidden_notification_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notification_state" OWNER TO "postgres";

--
-- Name: TABLE "user_notification_state"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."user_notification_state" IS 'Per-account seen and dismissed state for notifications synthesized from achievement_events.';


--
-- Name: user_points_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."user_points_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "points" integer NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_points_ledger_points_nonzero" CHECK (("points" <> 0)),
    CONSTRAINT "user_points_ledger_source_type_check" CHECK (("source_type" = ANY (ARRAY['achievement'::"text", 'review'::"text", 'follow'::"text", 'publish'::"text", 'system'::"text", 'adjustment'::"text", 'redemption'::"text"])))
);


ALTER TABLE "public"."user_points_ledger" OWNER TO "postgres";

--
-- Name: TABLE "user_points_ledger"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."user_points_ledger" IS 'Append-only user points foundation for future achievements, platform activity, rewards, and redemptions.';


--
-- Name: user_theme_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."user_theme_preferences" (
    "user_id" "uuid" NOT NULL,
    "theme_mode" "text" DEFAULT 'dark'::"text" NOT NULL,
    "theme_accent" "text" DEFAULT 'ocean'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_theme_preferences_theme_accent_check" CHECK (("theme_accent" = ANY (ARRAY['amber'::"text", 'sage'::"text", 'ocean'::"text", 'violet'::"text", 'red'::"text", 'cyan'::"text"]))),
    CONSTRAINT "user_theme_preferences_theme_mode_check" CHECK (("theme_mode" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."user_theme_preferences" OWNER TO "postgres";

--
-- Name: achievement_events achievement_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_events"
    ADD CONSTRAINT "achievement_events_pkey" PRIMARY KEY ("id");


--
-- Name: achievement_progress achievement_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_pkey" PRIMARY KEY ("id");


--
-- Name: achievement_progress achievement_progress_user_id_product_id_metric_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_user_id_product_id_metric_key" UNIQUE ("user_id", "item_id", "metric");


--
-- Name: achievement_templates achievement_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_templates"
    ADD CONSTRAINT "achievement_templates_code_key" UNIQUE ("code");


--
-- Name: achievement_templates achievement_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_templates"
    ADD CONSTRAINT "achievement_templates_pkey" PRIMARY KEY ("id");


--
-- Name: catalog_items catalog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id");


--
-- Name: catalog_items catalog_items_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_slug_key" UNIQUE ("slug");


--
-- Name: community_collaboration_responses community_collaboration_response_collaboration_id_author_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_collaboration_responses"
    ADD CONSTRAINT "community_collaboration_response_collaboration_id_author_id_key" UNIQUE ("collaboration_id", "author_id");


--
-- Name: community_collaboration_responses community_collaboration_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_collaboration_responses"
    ADD CONSTRAINT "community_collaboration_responses_pkey" PRIMARY KEY ("id");


--
-- Name: community_collaborations community_collaborations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_collaborations"
    ADD CONSTRAINT "community_collaborations_pkey" PRIMARY KEY ("id");


--
-- Name: community_question_answers community_question_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_answers"
    ADD CONSTRAINT "community_question_answers_pkey" PRIMARY KEY ("id");


--
-- Name: community_question_votes community_question_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_votes"
    ADD CONSTRAINT "community_question_votes_pkey" PRIMARY KEY ("id");


--
-- Name: community_question_votes community_question_votes_question_id_answer_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_votes"
    ADD CONSTRAINT "community_question_votes_question_id_answer_id_profile_id_key" UNIQUE NULLS NOT DISTINCT ("question_id", "answer_id", "profile_id");


--
-- Name: community_questions community_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_questions"
    ADD CONSTRAINT "community_questions_pkey" PRIMARY KEY ("id");


--
-- Name: conversation_members conversation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id", "profile_id");


--
-- Name: conversations conversations_conversation_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_conversation_key_key" UNIQUE ("conversation_key");


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency");


--
-- Name: item_achievements item_achievements_item_id_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_achievements"
    ADD CONSTRAINT "item_achievements_item_id_code_key" UNIQUE ("item_id", "code");


--
-- Name: item_achievements item_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_achievements"
    ADD CONSTRAINT "item_achievements_pkey" PRIMARY KEY ("id");


--
-- Name: item_assets item_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_assets"
    ADD CONSTRAINT "item_assets_pkey" PRIMARY KEY ("id");


--
-- Name: item_capabilities item_capabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_capabilities"
    ADD CONSTRAINT "item_capabilities_pkey" PRIMARY KEY ("item_id", "capability_key");


--
-- Name: item_categories item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_categories"
    ADD CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id");


--
-- Name: item_categories item_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_categories"
    ADD CONSTRAINT "item_categories_slug_key" UNIQUE ("slug");


--
-- Name: item_external_links item_external_links_item_id_platform_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_external_links"
    ADD CONSTRAINT "item_external_links_item_id_platform_url_key" UNIQUE ("item_id", "platform", "url");


--
-- Name: item_external_links item_external_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_external_links"
    ADD CONSTRAINT "item_external_links_pkey" PRIMARY KEY ("id");


--
-- Name: item_members item_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_members"
    ADD CONSTRAINT "item_members_pkey" PRIMARY KEY ("item_id", "profile_id");


--
-- Name: item_share_visits item_share_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_share_visits"
    ADD CONSTRAINT "item_share_visits_pkey" PRIMARY KEY ("id");


--
-- Name: library_entries library_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."library_entries"
    ADD CONSTRAINT "library_entries_pkey" PRIMARY KEY ("id");


--
-- Name: library_entries library_entries_user_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."library_entries"
    ADD CONSTRAINT "library_entries_user_id_item_id_key" UNIQUE ("user_id", "item_id");


--
-- Name: merch_order_items merch_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."merch_order_items"
    ADD CONSTRAINT "merch_order_items_pkey" PRIMARY KEY ("id");


--
-- Name: merch_orders merch_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."merch_orders"
    ADD CONSTRAINT "merch_orders_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "profile_id");


--
-- Name: post_replies post_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_pkey" PRIMARY KEY ("id");


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");


--
-- Name: product_reviews product_reviews_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_product_id_key" UNIQUE ("user_id", "item_id");


--
-- Name: product_updates product_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_updates"
    ADD CONSTRAINT "product_updates_pkey" PRIMARY KEY ("id");


--
-- Name: profile_external_links profile_external_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profile_external_links"
    ADD CONSTRAINT "profile_external_links_pkey" PRIMARY KEY ("id");


--
-- Name: profile_external_links profile_external_links_profile_id_platform_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profile_external_links"
    ADD CONSTRAINT "profile_external_links_profile_id_platform_url_key" UNIQUE ("profile_id", "platform", "url");


--
-- Name: profile_follows profile_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profile_follows"
    ADD CONSTRAINT "profile_follows_pkey" PRIMARY KEY ("follower_id", "following_id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");


--
-- Name: radio_playlist_entries radio_playlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."radio_playlist_entries"
    ADD CONSTRAINT "radio_playlist_entries_pkey" PRIMARY KEY ("id");


--
-- Name: radio_playlist_entries radio_playlist_entries_track_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."radio_playlist_entries"
    ADD CONSTRAINT "radio_playlist_entries_track_id_key" UNIQUE ("track_id");


--
-- Name: reply_likes reply_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reply_likes"
    ADD CONSTRAINT "reply_likes_pkey" PRIMARY KEY ("reply_id", "profile_id");


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");


--
-- Name: service_categories service_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_slug_key" UNIQUE ("slug");


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");


--
-- Name: services services_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_slug_key" UNIQUE ("slug");


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("id");


--
-- Name: tracks tracks_product_id_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_product_id_number_key" UNIQUE ("item_id", "number");


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");


--
-- Name: user_notification_state user_notification_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_notification_state"
    ADD CONSTRAINT "user_notification_state_pkey" PRIMARY KEY ("user_id");


--
-- Name: user_points_ledger user_points_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_points_ledger"
    ADD CONSTRAINT "user_points_ledger_pkey" PRIMARY KEY ("id");


--
-- Name: user_theme_preferences user_theme_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_theme_preferences"
    ADD CONSTRAINT "user_theme_preferences_pkey" PRIMARY KEY ("user_id");


--
-- Name: achievement_events_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "achievement_events_product_idx" ON "public"."achievement_events" USING "btree" ("item_id", "created_at" DESC);


--
-- Name: achievement_events_user_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "achievement_events_user_type_idx" ON "public"."achievement_events" USING "btree" ("user_id", "event_type", "created_at" DESC);


--
-- Name: achievement_templates_code_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "achievement_templates_code_uidx" ON "public"."achievement_templates" USING "btree" ("code");


--
-- Name: catalog_items_category_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_category_type_idx" ON "public"."catalog_items" USING "btree" ("item_category_id", "item_type");


--
-- Name: catalog_items_experience_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_experience_type_idx" ON "public"."catalog_items" USING "btree" ("experience_type");


--
-- Name: catalog_items_fulfillment_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_fulfillment_type_idx" ON "public"."catalog_items" USING "btree" ("fulfillment_type");


--
-- Name: catalog_items_item_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_item_category_idx" ON "public"."catalog_items" USING "btree" ("item_category_id");


--
-- Name: catalog_items_long_description_fts_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_long_description_fts_idx" ON "public"."catalog_items" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("long_description", ''::"text")));


--
-- Name: catalog_items_market_mode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_market_mode_idx" ON "public"."catalog_items" USING "btree" ("market_mode");


--
-- Name: catalog_items_short_description_fts_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_short_description_fts_idx" ON "public"."catalog_items" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("short_description", ''::"text")));


--
-- Name: catalog_items_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "catalog_items_sort_order_idx" ON "public"."catalog_items" USING "btree" ("sort_order" DESC, "created_at" DESC);


--
-- Name: community_collaboration_responses_collab_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_collaboration_responses_collab_idx" ON "public"."community_collaboration_responses" USING "btree" ("collaboration_id", "created_at" DESC);


--
-- Name: community_collaborations_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_collaborations_created_idx" ON "public"."community_collaborations" USING "btree" ("created_at" DESC);


--
-- Name: community_collaborations_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_collaborations_status_idx" ON "public"."community_collaborations" USING "btree" ("status", "created_at" DESC);


--
-- Name: community_question_answers_question_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_question_answers_question_idx" ON "public"."community_question_answers" USING "btree" ("question_id", "created_at" DESC);


--
-- Name: community_questions_answer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_questions_answer_idx" ON "public"."community_questions" USING "btree" ("answer_count" DESC, "created_at" DESC);


--
-- Name: community_questions_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_questions_created_idx" ON "public"."community_questions" USING "btree" ("created_at" DESC);


--
-- Name: community_questions_vote_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "community_questions_vote_idx" ON "public"."community_questions" USING "btree" ("vote_count" DESC, "created_at" DESC);


--
-- Name: conversation_members_conversation_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "conversation_members_conversation_id_idx" ON "public"."conversation_members" USING "btree" ("conversation_id");


--
-- Name: conversation_members_profile_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "conversation_members_profile_id_idx" ON "public"."conversation_members" USING "btree" ("profile_id");


--
-- Name: conversation_members_profile_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "conversation_members_profile_idx" ON "public"."conversation_members" USING "btree" ("profile_id", "created_at" DESC);


--
-- Name: conversations_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "conversations_updated_at_idx" ON "public"."conversations" USING "btree" ("updated_at" DESC);


--
-- Name: idx_services_long_description; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_services_long_description" ON "public"."services" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("long_description", ''::"text")));


--
-- Name: idx_services_short_description; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_services_short_description" ON "public"."services" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("short_description", ''::"text")));


--
-- Name: item_achievements_item_code_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "item_achievements_item_code_uidx" ON "public"."item_achievements" USING "btree" ("item_id", "code");


--
-- Name: item_achievements_item_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "item_achievements_item_sort_idx" ON "public"."item_achievements" USING "btree" ("item_id", "sort_order");


--
-- Name: item_achievements_template_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "item_achievements_template_idx" ON "public"."item_achievements" USING "btree" ("template_id");


--
-- Name: item_achievements_trigger_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "item_achievements_trigger_type_idx" ON "public"."item_achievements" USING "btree" ("trigger_type");


--
-- Name: item_external_links_item_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "item_external_links_item_sort_idx" ON "public"."item_external_links" USING "btree" ("item_id", "sort_order", "created_at");


--
-- Name: item_members_one_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "item_members_one_owner_idx" ON "public"."item_members" USING "btree" ("item_id") WHERE ("member_role" = 'owner'::"text");


--
-- Name: item_members_profile_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "item_members_profile_idx" ON "public"."item_members" USING "btree" ("profile_id", "created_at" DESC);


--
-- Name: item_share_visits_item_referrer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "item_share_visits_item_referrer_idx" ON "public"."item_share_visits" USING "btree" ("item_id", "referrer_id", "created_at" DESC);


--
-- Name: library_entries_item_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "library_entries_item_id_idx" ON "public"."library_entries" USING "btree" ("item_id");


--
-- Name: library_entries_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "library_entries_user_id_idx" ON "public"."library_entries" USING "btree" ("user_id");


--
-- Name: merch_order_items_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "merch_order_items_order_idx" ON "public"."merch_order_items" USING "btree" ("order_id");


--
-- Name: merch_orders_buyer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "merch_orders_buyer_idx" ON "public"."merch_orders" USING "btree" ("buyer_id", "created_at" DESC);


--
-- Name: merch_orders_creator_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "merch_orders_creator_idx" ON "public"."merch_orders" USING "btree" ("creator_id", "created_at" DESC);


--
-- Name: messages_conversation_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_conversation_created_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at");


--
-- Name: messages_conversation_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_conversation_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at");


--
-- Name: post_replies_author_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "post_replies_author_idx" ON "public"."post_replies" USING "btree" ("author_id");


--
-- Name: post_replies_post_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "post_replies_post_idx" ON "public"."post_replies" USING "btree" ("post_id");


--
-- Name: posts_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "posts_slug_idx" ON "public"."posts" USING "btree" ("slug");


--
-- Name: product_reviews_item_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_reviews_item_created_idx" ON "public"."product_reviews" USING "btree" ("item_id", "created_at" DESC);


--
-- Name: product_reviews_item_sentiment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_reviews_item_sentiment_idx" ON "public"."product_reviews" USING "btree" ("item_id", "sentiment");


--
-- Name: product_updates_author_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_updates_author_id_idx" ON "public"."product_updates" USING "btree" ("author_id");


--
-- Name: product_updates_item_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_updates_item_id_idx" ON "public"."product_updates" USING "btree" ("item_id", "created_at" DESC);


--
-- Name: profile_external_links_profile_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profile_external_links_profile_sort_idx" ON "public"."profile_external_links" USING "btree" ("profile_id", "sort_order", "created_at");


--
-- Name: profile_follows_follower_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profile_follows_follower_idx" ON "public"."profile_follows" USING "btree" ("follower_id", "created_at" DESC);


--
-- Name: profile_follows_following_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profile_follows_following_idx" ON "public"."profile_follows" USING "btree" ("following_id", "created_at" DESC);


--
-- Name: profiles_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "profiles_slug_key" ON "public"."profiles" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);


--
-- Name: radio_playlist_entries_active_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "radio_playlist_entries_active_sort_idx" ON "public"."radio_playlist_entries" USING "btree" ("is_active", "sort_order", "added_at");


--
-- Name: services_market_mode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "services_market_mode_idx" ON "public"."services" USING "btree" ("market_mode");


--
-- Name: services_service_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "services_service_category_idx" ON "public"."services" USING "btree" ("service_category_id");


--
-- Name: services_service_category_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "services_service_category_type_idx" ON "public"."services" USING "btree" ("service_category_id", "service_type");


--
-- Name: user_points_ledger_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "user_points_ledger_user_created_idx" ON "public"."user_points_ledger" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: item_share_visits product_share_visits_signal_boost; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "product_share_visits_signal_boost" AFTER INSERT ON "public"."item_share_visits" FOR EACH ROW EXECUTE FUNCTION "public"."unlock_signal_boost_from_share_visit"();


--
-- Name: community_collaboration_responses set_community_collaboration_responses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_community_collaboration_responses_updated_at" BEFORE UPDATE ON "public"."community_collaboration_responses" FOR EACH ROW EXECUTE FUNCTION "public"."set_community_object_updated_at"();


--
-- Name: community_collaborations set_community_collaborations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_community_collaborations_updated_at" BEFORE UPDATE ON "public"."community_collaborations" FOR EACH ROW EXECUTE FUNCTION "public"."set_community_object_updated_at"();


--
-- Name: community_question_answers set_community_question_answers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_community_question_answers_updated_at" BEFORE UPDATE ON "public"."community_question_answers" FOR EACH ROW EXECUTE FUNCTION "public"."set_community_object_updated_at"();


--
-- Name: community_questions set_community_questions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_community_questions_updated_at" BEFORE UPDATE ON "public"."community_questions" FOR EACH ROW EXECUTE FUNCTION "public"."set_community_object_updated_at"();


--
-- Name: merch_orders set_merch_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_merch_orders_updated_at" BEFORE UPDATE ON "public"."merch_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_merch_orders_updated_at"();


--
-- Name: radio_playlist_entries set_radio_playlist_entries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_radio_playlist_entries_updated_at" BEFORE UPDATE ON "public"."radio_playlist_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_radio_playlist_updated_at"();


--
-- Name: catalog_items sync_catalog_item_capabilities; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync_catalog_item_capabilities" AFTER INSERT OR UPDATE OF "streaming_enabled", "download_purchase_enabled", "download_url" ON "public"."catalog_items" FOR EACH ROW EXECUTE FUNCTION "public"."sync_catalog_item_capabilities"();


--
-- Name: item_achievements sync_item_achievement_capability; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync_item_achievement_capability" AFTER INSERT OR DELETE OR UPDATE OF "item_id" ON "public"."item_achievements" FOR EACH ROW EXECUTE FUNCTION "public"."sync_item_achievement_capability"();


--
-- Name: item_assets sync_item_bonus_capability; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync_item_bonus_capability" AFTER INSERT OR DELETE OR UPDATE OF "item_id", "asset_type" ON "public"."item_assets" FOR EACH ROW EXECUTE FUNCTION "public"."sync_item_bonus_capability"();


--
-- Name: community_question_answers sync_question_counts_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync_question_counts_insert" AFTER INSERT OR DELETE OR UPDATE ON "public"."community_question_answers" FOR EACH ROW EXECUTE FUNCTION "public"."sync_question_counts"();


--
-- Name: community_question_votes sync_question_vote_counts_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync_question_vote_counts_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."community_question_votes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_question_vote_counts"();


--
-- Name: item_capabilities touch_item_capabilities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "touch_item_capabilities_updated_at" BEFORE UPDATE ON "public"."item_capabilities" FOR EACH ROW EXECUTE FUNCTION "public"."touch_item_foundation_updated_at"();


--
-- Name: item_external_links touch_item_external_links_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "touch_item_external_links_updated_at" BEFORE UPDATE ON "public"."item_external_links" FOR EACH ROW EXECUTE FUNCTION "public"."touch_item_foundation_updated_at"();


--
-- Name: item_members touch_item_members_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "touch_item_members_updated_at" BEFORE UPDATE ON "public"."item_members" FOR EACH ROW EXECUTE FUNCTION "public"."touch_item_foundation_updated_at"();


--
-- Name: profile_external_links touch_profile_external_links_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "touch_profile_external_links_updated_at" BEFORE UPDATE ON "public"."profile_external_links" FOR EACH ROW EXECUTE FUNCTION "public"."touch_item_foundation_updated_at"();


--
-- Name: messages trg_notify_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "trg_notify_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_message"();


--
-- Name: post_likes trg_notify_post_like; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "trg_notify_post_like" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_post_like"();


--
-- Name: posts trg_notify_post_mentions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "trg_notify_post_mentions" AFTER INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."notify_post_mentions"();


--
-- Name: post_replies trg_notify_post_reply; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "trg_notify_post_reply" AFTER INSERT ON "public"."post_replies" FOR EACH ROW EXECUTE FUNCTION "public"."notify_post_reply"();


--
-- Name: achievement_events achievement_events_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_events"
    ADD CONSTRAINT "achievement_events_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."item_achievements"("id") ON DELETE SET NULL;


--
-- Name: achievement_events achievement_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_events"
    ADD CONSTRAINT "achievement_events_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: achievement_events achievement_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_events"
    ADD CONSTRAINT "achievement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: catalog_items catalog_items_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: catalog_items catalog_items_item_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_item_category_id_fkey" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE SET NULL;


--
-- Name: community_collaboration_responses community_collaboration_responses_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_collaboration_responses"
    ADD CONSTRAINT "community_collaboration_responses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: community_collaboration_responses community_collaboration_responses_collaboration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_collaboration_responses"
    ADD CONSTRAINT "community_collaboration_responses_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "public"."community_collaborations"("id") ON DELETE CASCADE;


--
-- Name: community_collaborations community_collaborations_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_collaborations"
    ADD CONSTRAINT "community_collaborations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: community_question_answers community_question_answers_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_answers"
    ADD CONSTRAINT "community_question_answers_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: community_question_answers community_question_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_answers"
    ADD CONSTRAINT "community_question_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."community_questions"("id") ON DELETE CASCADE;


--
-- Name: community_question_votes community_question_votes_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_votes"
    ADD CONSTRAINT "community_question_votes_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "public"."community_question_answers"("id") ON DELETE CASCADE;


--
-- Name: community_question_votes community_question_votes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_votes"
    ADD CONSTRAINT "community_question_votes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: community_question_votes community_question_votes_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_question_votes"
    ADD CONSTRAINT "community_question_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."community_questions"("id") ON DELETE CASCADE;


--
-- Name: community_questions community_questions_accepted_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_questions"
    ADD CONSTRAINT "community_questions_accepted_answer_id_fkey" FOREIGN KEY ("accepted_answer_id") REFERENCES "public"."community_question_answers"("id") ON DELETE SET NULL;


--
-- Name: community_questions community_questions_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_questions"
    ADD CONSTRAINT "community_questions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: item_achievements item_achievements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_achievements"
    ADD CONSTRAINT "item_achievements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: item_achievements item_achievements_reward_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_achievements"
    ADD CONSTRAINT "item_achievements_reward_item_id_fkey" FOREIGN KEY ("reward_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE SET NULL;


--
-- Name: item_achievements item_achievements_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_achievements"
    ADD CONSTRAINT "item_achievements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."achievement_templates"("id") ON DELETE SET NULL;


--
-- Name: item_assets item_assets_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_assets"
    ADD CONSTRAINT "item_assets_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: item_capabilities item_capabilities_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_capabilities"
    ADD CONSTRAINT "item_capabilities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: item_external_links item_external_links_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_external_links"
    ADD CONSTRAINT "item_external_links_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: item_members item_members_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_members"
    ADD CONSTRAINT "item_members_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: item_members item_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_members"
    ADD CONSTRAINT "item_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: item_share_visits item_share_visits_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_share_visits"
    ADD CONSTRAINT "item_share_visits_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: item_share_visits item_share_visits_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_share_visits"
    ADD CONSTRAINT "item_share_visits_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: item_share_visits item_share_visits_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."item_share_visits"
    ADD CONSTRAINT "item_share_visits_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: library_entries library_entries_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."library_entries"
    ADD CONSTRAINT "library_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: library_entries library_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."library_entries"
    ADD CONSTRAINT "library_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: merch_order_items merch_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."merch_order_items"
    ADD CONSTRAINT "merch_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."merch_orders"("id") ON DELETE CASCADE;


--
-- Name: merch_order_items merch_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."merch_order_items"
    ADD CONSTRAINT "merch_order_items_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE RESTRICT;


--
-- Name: merch_orders merch_orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."merch_orders"
    ADD CONSTRAINT "merch_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: merch_orders merch_orders_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."merch_orders"
    ADD CONSTRAINT "merch_orders_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;


--
-- Name: post_likes post_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: post_replies post_replies_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: post_replies post_replies_parent_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "public"."post_replies"("id") ON DELETE CASCADE;


--
-- Name: post_replies post_replies_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: product_updates product_updates_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_updates"
    ADD CONSTRAINT "product_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: product_updates product_updates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_updates"
    ADD CONSTRAINT "product_updates_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: profile_external_links profile_external_links_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profile_external_links"
    ADD CONSTRAINT "profile_external_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profile_follows profile_follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profile_follows"
    ADD CONSTRAINT "profile_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profile_follows profile_follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profile_follows"
    ADD CONSTRAINT "profile_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: radio_playlist_entries radio_playlist_entries_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."radio_playlist_entries"
    ADD CONSTRAINT "radio_playlist_entries_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: radio_playlist_entries radio_playlist_entries_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."radio_playlist_entries"
    ADD CONSTRAINT "radio_playlist_entries_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;


--
-- Name: reply_likes reply_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reply_likes"
    ADD CONSTRAINT "reply_likes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: reply_likes reply_likes_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reply_likes"
    ADD CONSTRAINT "reply_likes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."post_replies"("id") ON DELETE CASCADE;


--
-- Name: services services_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: services services_service_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."service_categories"("id") ON DELETE SET NULL;


--
-- Name: tracks tracks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."item_achievements"("id") ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_product_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_notification_state user_notification_state_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_notification_state"
    ADD CONSTRAINT "user_notification_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_points_ledger user_points_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_points_ledger"
    ADD CONSTRAINT "user_points_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_theme_preferences user_theme_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_theme_preferences"
    ADD CONSTRAINT "user_theme_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: item_achievements Public can read product achievements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can read product achievements" ON "public"."item_achievements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items"
  WHERE (("catalog_items"."id" = "item_achievements"."item_id") AND ("catalog_items"."status" = 'published'::"text")))));


--
-- Name: tracks Public can read product tracks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can read product tracks" ON "public"."tracks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items"
  WHERE (("catalog_items"."id" = "tracks"."item_id") AND ("catalog_items"."status" = 'published'::"text")))));


--
-- Name: posts Public posts are readable; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public posts are readable" ON "public"."posts" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"text"));


--
-- Name: product_reviews Public product reviews are readable; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public product reviews are readable" ON "public"."product_reviews" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"text"));


--
-- Name: profiles Public profiles are readable; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public profiles are readable" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: library_entries Users can add items to their library; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can add items to their library" ON "public"."library_entries" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "library_entries"."item_id") AND ("p"."status" = 'published'::"text") AND (("library_entries"."acquisition_type" = 'purchase'::"text") OR "p"."is_free" OR (COALESCE("p"."price_cents", 0) = 0) OR (("p"."experience_type" = 'music'::"text") AND COALESCE("p"."streaming_enabled", true))))))));


--
-- Name: achievement_events Users can create own achievement events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own achievement events" ON "public"."achievement_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: product_reviews Users can create own product reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own product reviews" ON "public"."product_reviews" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_notification_state Users can create their notification state; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their notification state" ON "public"."user_notification_state" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: product_reviews Users can delete own product reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own product reviews" ON "public"."product_reviews" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_achievements Users can insert own achievements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own achievements" ON "public"."user_achievements" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: achievement_events Users can read own achievement events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own achievement events" ON "public"."achievement_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_achievements Users can read own achievements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own achievements" ON "public"."user_achievements" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: library_entries Users can read their library items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their library items" ON "public"."library_entries" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_notification_state Users can read their notification state; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their notification state" ON "public"."user_notification_state" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: library_entries Users can remove free library products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can remove free library products" ON "public"."library_entries" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("acquisition_type" = 'free'::"text")));


--
-- Name: library_entries Users can update own library item status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own library item status" ON "public"."library_entries" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: product_reviews Users can update own product reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own product reviews" ON "public"."product_reviews" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: library_entries Users can update their library items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their library items" ON "public"."library_entries" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_notification_state Users can update their notification state; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their notification state" ON "public"."user_notification_state" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: achievement_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."achievement_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_progress; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."achievement_progress" ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_progress achievement_progress_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "achievement_progress_insert_own" ON "public"."achievement_progress" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: achievement_progress achievement_progress_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "achievement_progress_read_own" ON "public"."achievement_progress" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: achievement_progress achievement_progress_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "achievement_progress_update_own" ON "public"."achievement_progress" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: achievement_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."achievement_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_templates achievement_templates_read_active; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "achievement_templates_read_active" ON "public"."achievement_templates" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));


--
-- Name: catalog_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."catalog_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_collaboration_responses community collaboration responses auth insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaboration responses auth insert" ON "public"."community_collaboration_responses" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_collaboration_responses community collaboration responses owner delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaboration responses owner delete" ON "public"."community_collaboration_responses" FOR DELETE USING (("author_id" = "auth"."uid"()));


--
-- Name: community_collaboration_responses community collaboration responses owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaboration responses owner update" ON "public"."community_collaboration_responses" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_collaboration_responses community collaboration responses public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaboration responses public read" ON "public"."community_collaboration_responses" FOR SELECT USING (true);


--
-- Name: community_collaborations community collaborations auth insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaborations auth insert" ON "public"."community_collaborations" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_collaborations community collaborations owner delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaborations owner delete" ON "public"."community_collaborations" FOR DELETE USING (("author_id" = "auth"."uid"()));


--
-- Name: community_collaborations community collaborations owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaborations owner update" ON "public"."community_collaborations" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_collaborations community collaborations public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community collaborations public read" ON "public"."community_collaborations" FOR SELECT USING (true);


--
-- Name: community_question_answers community question answers auth insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community question answers auth insert" ON "public"."community_question_answers" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_question_answers community question answers owner delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community question answers owner delete" ON "public"."community_question_answers" FOR DELETE USING (("author_id" = "auth"."uid"()));


--
-- Name: community_question_answers community question answers owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community question answers owner update" ON "public"."community_question_answers" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_question_answers community question answers public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community question answers public read" ON "public"."community_question_answers" FOR SELECT USING (true);


--
-- Name: community_question_votes community question votes auth insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community question votes auth insert" ON "public"."community_question_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));


--
-- Name: community_question_votes community question votes public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community question votes public read" ON "public"."community_question_votes" FOR SELECT USING (true);


--
-- Name: community_questions community questions auth insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community questions auth insert" ON "public"."community_questions" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_questions community questions owner delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community questions owner delete" ON "public"."community_questions" FOR DELETE USING (("author_id" = "auth"."uid"()));


--
-- Name: community_questions community questions owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community questions owner update" ON "public"."community_questions" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));


--
-- Name: community_questions community questions public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community questions public read" ON "public"."community_questions" FOR SELECT USING (true);


--
-- Name: community_collaboration_responses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_collaboration_responses" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_collaborations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_collaborations" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_question_answers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_question_answers" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_question_votes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_question_votes" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_questions" ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_members conversation_members_insert_self_or_creator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conversation_members_insert_self_or_creator" ON "public"."conversation_members" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_members"."conversation_id") AND ("c"."created_by" = "auth"."uid"()))))));


--
-- Name: conversation_members conversation_members_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conversation_members_read_member" ON "public"."conversation_members" FOR SELECT TO "authenticated" USING ((("profile_id" = "auth"."uid"()) OR "public"."is_conversation_member"("conversation_id", "auth"."uid"())));


--
-- Name: conversation_members conversation_members_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conversation_members_update_own" ON "public"."conversation_members" FOR UPDATE TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));


--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations conversations_insert_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conversations_insert_auth" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: conversations conversations_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conversations_read_member" ON "public"."conversations" FOR SELECT TO "authenticated" USING ("public"."is_conversation_member"("id", "auth"."uid"()));


--
-- Name: conversations conversations_update_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conversations_update_member" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ("public"."is_conversation_member"("id", "auth"."uid"())) WITH CHECK ("public"."is_conversation_member"("id", "auth"."uid"()));


--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates exchange_rates_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "exchange_rates_read" ON "public"."exchange_rates" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: item_achievements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_achievements" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_capabilities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_capabilities" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_capabilities item_capabilities_manage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "item_capabilities_manage" ON "public"."item_capabilities" TO "authenticated" USING ("public"."can_manage_item"("item_id")) WITH CHECK ("public"."can_manage_item"("item_id"));


--
-- Name: item_capabilities item_capabilities_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "item_capabilities_read" ON "public"."item_capabilities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "i"
  WHERE (("i"."id" = "item_capabilities"."item_id") AND (("i"."status" = 'published'::"text") OR ("i"."author_id" = "auth"."uid"()))))));


--
-- Name: item_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_categories" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_external_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_external_links" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_external_links item_external_links_manage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "item_external_links_manage" ON "public"."item_external_links" TO "authenticated" USING ("public"."can_manage_item"("item_id")) WITH CHECK ("public"."can_manage_item"("item_id"));


--
-- Name: item_external_links item_external_links_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "item_external_links_read" ON "public"."item_external_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "i"
  WHERE (("i"."id" = "item_external_links"."item_id") AND (("i"."status" = 'published'::"text") OR ("i"."author_id" = "auth"."uid"()))))));


--
-- Name: item_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_members item_members_manage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "item_members_manage" ON "public"."item_members" TO "authenticated" USING ("public"."can_manage_item"("item_id")) WITH CHECK ("public"."can_manage_item"("item_id"));


--
-- Name: item_members item_members_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "item_members_read" ON "public"."item_members" FOR SELECT USING ((("profile_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."catalog_items" "i"
  WHERE (("i"."id" = "item_members"."item_id") AND (("i"."status" = 'published'::"text") OR ("i"."author_id" = "auth"."uid"())))))));


--
-- Name: item_share_visits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."item_share_visits" ENABLE ROW LEVEL SECURITY;

--
-- Name: library_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."library_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: merch_order_items merch order items buyer creator read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "merch order items buyer creator read" ON "public"."merch_order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."merch_orders"
  WHERE (("merch_orders"."id" = "merch_order_items"."order_id") AND (("merch_orders"."buyer_id" = "auth"."uid"()) OR ("merch_orders"."creator_id" = "auth"."uid"()))))));


--
-- Name: merch_order_items merch order items buyer insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "merch order items buyer insert" ON "public"."merch_order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."merch_orders"
  WHERE (("merch_orders"."id" = "merch_order_items"."order_id") AND ("merch_orders"."buyer_id" = "auth"."uid"())))));


--
-- Name: merch_orders merch orders buyer insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "merch orders buyer insert" ON "public"."merch_orders" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));


--
-- Name: merch_orders merch orders buyer read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "merch orders buyer read" ON "public"."merch_orders" FOR SELECT USING (("auth"."uid"() = "buyer_id"));


--
-- Name: merch_orders merch orders creator read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "merch orders creator read" ON "public"."merch_orders" FOR SELECT USING (("auth"."uid"() = "creator_id"));


--
-- Name: merch_orders merch orders creator update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "merch orders creator update" ON "public"."merch_orders" FOR UPDATE USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));


--
-- Name: merch_order_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."merch_order_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: merch_orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."merch_orders" ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: messages messages_insert_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "messages_insert_member" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."is_conversation_member"("conversation_id", "auth"."uid"())));


--
-- Name: messages messages_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "messages_read_member" ON "public"."messages" FOR SELECT TO "authenticated" USING ("public"."is_conversation_member"("conversation_id", "auth"."uid"()));


--
-- Name: post_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes post_likes_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "post_likes_delete_own" ON "public"."post_likes" FOR DELETE TO "authenticated" USING (("profile_id" = "auth"."uid"()));


--
-- Name: post_likes post_likes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "post_likes_insert" ON "public"."post_likes" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = "auth"."uid"()));


--
-- Name: post_likes post_likes_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "post_likes_read" ON "public"."post_likes" FOR SELECT USING (true);


--
-- Name: post_replies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."post_replies" ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;

--
-- Name: posts posts_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_delete_own" ON "public"."posts" FOR DELETE TO "authenticated" USING (("author_id" = "auth"."uid"()));


--
-- Name: posts posts_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_insert" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));


--
-- Name: posts posts_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_read" ON "public"."posts" FOR SELECT USING ((("status" = 'published'::"text") OR ("author_id" = "auth"."uid"())));


--
-- Name: posts posts_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_update_own" ON "public"."posts" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));


--
-- Name: item_assets product_assets_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_assets_delete_own" ON "public"."item_assets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "item_assets"."item_id") AND ("p"."author_id" = "auth"."uid"())))));


--
-- Name: item_assets product_assets_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_assets_insert_own" ON "public"."item_assets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "item_assets"."item_id") AND ("p"."author_id" = "auth"."uid"())))));


--
-- Name: item_assets product_assets_read_creator_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_assets_read_creator_or_owner" ON "public"."item_assets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "item_assets"."item_id") AND (("p"."author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."library_entries" "li"
          WHERE (("li"."item_id" = "p"."id") AND ("li"."user_id" = "auth"."uid"()) AND ("li"."status" <> 'hidden'::"text")))))))));


--
-- Name: item_assets product_assets_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_assets_update_own" ON "public"."item_assets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "item_assets"."item_id") AND ("p"."author_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "item_assets"."item_id") AND ("p"."author_id" = "auth"."uid"())))));


--
-- Name: item_categories product_categories_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_categories_read" ON "public"."item_categories" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: product_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;

--
-- Name: item_share_visits product_share_visits_insert_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_share_visits_insert_auth" ON "public"."item_share_visits" FOR INSERT TO "authenticated" WITH CHECK ((("visitor_id" IS NULL) OR ("visitor_id" = "auth"."uid"()) OR ("referrer_id" = "auth"."uid"())));


--
-- Name: item_share_visits product_share_visits_read_participant; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_share_visits_read_participant" ON "public"."item_share_visits" FOR SELECT TO "authenticated" USING ((("referrer_id" = "auth"."uid"()) OR ("visitor_id" = "auth"."uid"())));


--
-- Name: product_updates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."product_updates" ENABLE ROW LEVEL SECURITY;

--
-- Name: product_updates product_updates_delete_own_product; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_updates_delete_own_product" ON "public"."product_updates" FOR DELETE TO "authenticated" USING (("author_id" = "auth"."uid"()));


--
-- Name: product_updates product_updates_insert_own_product; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_updates_insert_own_product" ON "public"."product_updates" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "product_updates"."item_id") AND ("p"."author_id" = "auth"."uid"()))))));


--
-- Name: product_updates product_updates_read_creator_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_updates_read_creator_or_owner" ON "public"."product_updates" FOR SELECT TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR (("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."library_entries" "li"
  WHERE (("li"."item_id" = "product_updates"."item_id") AND ("li"."user_id" = "auth"."uid"()) AND ("li"."status" <> 'hidden'::"text")))))));


--
-- Name: product_updates product_updates_update_own_product; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_updates_update_own_product" ON "public"."product_updates" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "product_updates"."item_id") AND ("p"."author_id" = "auth"."uid"()))))));


--
-- Name: catalog_items products_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "products_delete_own" ON "public"."catalog_items" FOR DELETE TO "authenticated" USING (("author_id" = "auth"."uid"()));


--
-- Name: catalog_items products_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "products_insert_own" ON "public"."catalog_items" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));


--
-- Name: catalog_items products_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "products_read" ON "public"."catalog_items" FOR SELECT USING ((("author_id" = "auth"."uid"()) OR ("status" = 'published'::"text")));


--
-- Name: catalog_items products_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "products_update_own" ON "public"."catalog_items" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));


--
-- Name: profile_external_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profile_external_links" ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_external_links profile_external_links_manage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profile_external_links_manage" ON "public"."profile_external_links" TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));


--
-- Name: profile_external_links profile_external_links_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profile_external_links_read" ON "public"."profile_external_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "profile_external_links"."profile_id") AND ("p"."is_published" OR ("p"."id" = "auth"."uid"()))))));


--
-- Name: profile_follows; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profile_follows" ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_follows profile_follows_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profile_follows_delete_own" ON "public"."profile_follows" FOR DELETE TO "authenticated" USING (("follower_id" = "auth"."uid"()));


--
-- Name: profile_follows profile_follows_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profile_follows_insert_own" ON "public"."profile_follows" FOR INSERT TO "authenticated" WITH CHECK (("follower_id" = "auth"."uid"()));


--
-- Name: profile_follows profile_follows_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profile_follows_read" ON "public"."profile_follows" FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: radio_playlist_entries radio playlist admin write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "radio playlist admin write" ON "public"."radio_playlist_entries" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));


--
-- Name: radio_playlist_entries radio playlist public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "radio playlist public read" ON "public"."radio_playlist_entries" FOR SELECT USING (true);


--
-- Name: radio_playlist_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."radio_playlist_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: post_replies replies_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "replies_delete_own" ON "public"."post_replies" FOR DELETE TO "authenticated" USING (("author_id" = "auth"."uid"()));


--
-- Name: post_replies replies_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "replies_insert" ON "public"."post_replies" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));


--
-- Name: post_replies replies_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "replies_read" ON "public"."post_replies" FOR SELECT USING ((("status" = 'published'::"text") OR ("author_id" = "auth"."uid"())));


--
-- Name: post_replies replies_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "replies_update_own" ON "public"."post_replies" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));


--
-- Name: reply_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."reply_likes" ENABLE ROW LEVEL SECURITY;

--
-- Name: reply_likes reply_likes_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reply_likes_delete_own" ON "public"."reply_likes" FOR DELETE TO "authenticated" USING (("profile_id" = "auth"."uid"()));


--
-- Name: reply_likes reply_likes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reply_likes_insert" ON "public"."reply_likes" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = "auth"."uid"()));


--
-- Name: reply_likes reply_likes_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reply_likes_read" ON "public"."reply_likes" FOR SELECT USING (true);


--
-- Name: service_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."service_categories" ENABLE ROW LEVEL SECURITY;

--
-- Name: service_categories service_categories_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "service_categories_admin_all" ON "public"."service_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));


--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;

--
-- Name: services services_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "services_admin_all" ON "public"."services" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));


--
-- Name: tracks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."tracks" ENABLE ROW LEVEL SECURITY;

--
-- Name: tracks tracks_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tracks_delete_own" ON "public"."tracks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "tracks"."item_id") AND ("p"."author_id" = "auth"."uid"())))));


--
-- Name: tracks tracks_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tracks_insert_own" ON "public"."tracks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "tracks"."item_id") AND ("p"."author_id" = "auth"."uid"())))));


--
-- Name: tracks tracks_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tracks_read" ON "public"."tracks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "tracks"."item_id") AND (("p"."author_id" = "auth"."uid"()) OR ("p"."status" = 'published'::"text"))))));


--
-- Name: tracks tracks_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tracks_update_own" ON "public"."tracks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "tracks"."item_id") AND ("p"."author_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."catalog_items" "p"
  WHERE (("p"."id" = "tracks"."item_id") AND ("p"."author_id" = "auth"."uid"())))));


--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_state; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_notification_state" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_points_ledger; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_points_ledger" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_points_ledger user_points_ledger_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_points_ledger_read_own" ON "public"."user_points_ledger" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: user_theme_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_theme_preferences" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_theme_preferences user_theme_preferences_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_theme_preferences_owner_insert" ON "public"."user_theme_preferences" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_theme_preferences user_theme_preferences_owner_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_theme_preferences_owner_select" ON "public"."user_theme_preferences" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_theme_preferences user_theme_preferences_owner_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_theme_preferences_owner_update" ON "public"."user_theme_preferences" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "account_exists_for_email"("lookup_email" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."account_exists_for_email"("lookup_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."account_exists_for_email"("lookup_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."account_exists_for_email"("lookup_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."account_exists_for_email"("lookup_email" "text") TO "service_role";


--
-- Name: FUNCTION "can_manage_item"("target_item_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."can_manage_item"("target_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_item"("target_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_item"("target_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_item"("target_item_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "create_or_open_direct_conversation"("other_profile_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."create_or_open_direct_conversation"("other_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_or_open_direct_conversation"("other_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_or_open_direct_conversation"("other_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_or_open_direct_conversation"("other_profile_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "handle_new_user_profile"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";


--
-- Name: FUNCTION "is_conversation_member"("p_conversation_id" "uuid", "p_profile_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_profile_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "notification_actor_name"("actor" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."notification_actor_name"("actor" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notification_actor_name"("actor" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notification_actor_name"("actor" "uuid") TO "service_role";


--
-- Name: FUNCTION "notify_message"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."notify_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_message"() TO "service_role";


--
-- Name: FUNCTION "notify_post_like"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "service_role";


--
-- Name: FUNCTION "notify_post_mentions"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."notify_post_mentions"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_mentions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_mentions"() TO "service_role";


--
-- Name: FUNCTION "notify_post_reply"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."notify_post_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_reply"() TO "service_role";


--
-- Name: TABLE "messages"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";


--
-- Name: FUNCTION "send_direct_message"("target_conversation_id" "uuid", "message_body" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."send_direct_message"("target_conversation_id" "uuid", "message_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."send_direct_message"("target_conversation_id" "uuid", "message_body" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_direct_message"("target_conversation_id" "uuid", "message_body" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_direct_message"("target_conversation_id" "uuid", "message_body" "text") TO "service_role";


--
-- Name: FUNCTION "set_community_object_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_community_object_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_community_object_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_community_object_updated_at"() TO "service_role";


--
-- Name: FUNCTION "set_merch_orders_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_merch_orders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_merch_orders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_merch_orders_updated_at"() TO "service_role";


--
-- Name: FUNCTION "set_radio_playlist_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_radio_playlist_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_radio_playlist_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_radio_playlist_updated_at"() TO "service_role";


--
-- Name: FUNCTION "sync_catalog_item_capabilities"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_catalog_item_capabilities"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_catalog_item_capabilities"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_catalog_item_capabilities"() TO "service_role";


--
-- Name: FUNCTION "sync_item_achievement_capability"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_item_achievement_capability"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_item_achievement_capability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_item_achievement_capability"() TO "service_role";


--
-- Name: FUNCTION "sync_item_bonus_capability"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_item_bonus_capability"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_item_bonus_capability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_item_bonus_capability"() TO "service_role";


--
-- Name: FUNCTION "sync_question_counts"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_question_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_question_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_question_counts"() TO "service_role";


--
-- Name: FUNCTION "sync_question_vote_counts"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_question_vote_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_question_vote_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_question_vote_counts"() TO "service_role";


--
-- Name: FUNCTION "touch_item_foundation_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."touch_item_foundation_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_item_foundation_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_item_foundation_updated_at"() TO "service_role";


--
-- Name: FUNCTION "unlock_signal_boost_from_share_visit"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."unlock_signal_boost_from_share_visit"() TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_signal_boost_from_share_visit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_signal_boost_from_share_visit"() TO "service_role";


--
-- Name: TABLE "achievement_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."achievement_events" TO "anon";
GRANT ALL ON TABLE "public"."achievement_events" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_events" TO "service_role";


--
-- Name: TABLE "achievement_progress"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."achievement_progress" TO "anon";
GRANT ALL ON TABLE "public"."achievement_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_progress" TO "service_role";


--
-- Name: TABLE "achievement_templates"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."achievement_templates" TO "anon";
GRANT ALL ON TABLE "public"."achievement_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_templates" TO "service_role";


--
-- Name: TABLE "catalog_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."catalog_items" TO "anon";
GRANT ALL ON TABLE "public"."catalog_items" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_items" TO "service_role";


--
-- Name: TABLE "community_collaboration_responses"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_collaboration_responses" TO "anon";
GRANT ALL ON TABLE "public"."community_collaboration_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."community_collaboration_responses" TO "service_role";


--
-- Name: TABLE "community_collaborations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_collaborations" TO "anon";
GRANT ALL ON TABLE "public"."community_collaborations" TO "authenticated";
GRANT ALL ON TABLE "public"."community_collaborations" TO "service_role";


--
-- Name: TABLE "community_question_answers"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_question_answers" TO "anon";
GRANT ALL ON TABLE "public"."community_question_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."community_question_answers" TO "service_role";


--
-- Name: TABLE "community_question_votes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_question_votes" TO "anon";
GRANT ALL ON TABLE "public"."community_question_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."community_question_votes" TO "service_role";


--
-- Name: TABLE "community_questions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_questions" TO "anon";
GRANT ALL ON TABLE "public"."community_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."community_questions" TO "service_role";


--
-- Name: TABLE "conversation_members"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."conversation_members" TO "anon";
GRANT ALL ON TABLE "public"."conversation_members" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_members" TO "service_role";


--
-- Name: TABLE "conversations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";


--
-- Name: TABLE "exchange_rates"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";


--
-- Name: TABLE "item_achievements"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_achievements" TO "anon";
GRANT ALL ON TABLE "public"."item_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."item_achievements" TO "service_role";


--
-- Name: TABLE "item_assets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_assets" TO "anon";
GRANT ALL ON TABLE "public"."item_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."item_assets" TO "service_role";


--
-- Name: TABLE "item_capabilities"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_capabilities" TO "anon";
GRANT ALL ON TABLE "public"."item_capabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."item_capabilities" TO "service_role";


--
-- Name: TABLE "item_categories"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_categories" TO "anon";
GRANT ALL ON TABLE "public"."item_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."item_categories" TO "service_role";


--
-- Name: TABLE "item_external_links"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_external_links" TO "anon";
GRANT ALL ON TABLE "public"."item_external_links" TO "authenticated";
GRANT ALL ON TABLE "public"."item_external_links" TO "service_role";


--
-- Name: TABLE "item_members"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_members" TO "anon";
GRANT ALL ON TABLE "public"."item_members" TO "authenticated";
GRANT ALL ON TABLE "public"."item_members" TO "service_role";


--
-- Name: TABLE "item_share_visits"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."item_share_visits" TO "anon";
GRANT ALL ON TABLE "public"."item_share_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."item_share_visits" TO "service_role";


--
-- Name: TABLE "library_entries"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."library_entries" TO "anon";
GRANT ALL ON TABLE "public"."library_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."library_entries" TO "service_role";


--
-- Name: TABLE "merch_order_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."merch_order_items" TO "anon";
GRANT ALL ON TABLE "public"."merch_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."merch_order_items" TO "service_role";


--
-- Name: TABLE "merch_orders"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."merch_orders" TO "anon";
GRANT ALL ON TABLE "public"."merch_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."merch_orders" TO "service_role";


--
-- Name: TABLE "post_likes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";


--
-- Name: TABLE "post_replies"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."post_replies" TO "anon";
GRANT ALL ON TABLE "public"."post_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."post_replies" TO "service_role";


--
-- Name: TABLE "posts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";


--
-- Name: TABLE "product_reviews"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";


--
-- Name: TABLE "product_updates"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."product_updates" TO "anon";
GRANT ALL ON TABLE "public"."product_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."product_updates" TO "service_role";


--
-- Name: TABLE "profile_external_links"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profile_external_links" TO "anon";
GRANT ALL ON TABLE "public"."profile_external_links" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_external_links" TO "service_role";


--
-- Name: TABLE "profile_follows"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profile_follows" TO "anon";
GRANT ALL ON TABLE "public"."profile_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_follows" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "radio_playlist_entries"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."radio_playlist_entries" TO "anon";
GRANT ALL ON TABLE "public"."radio_playlist_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."radio_playlist_entries" TO "service_role";


--
-- Name: TABLE "reply_likes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."reply_likes" TO "anon";
GRANT ALL ON TABLE "public"."reply_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."reply_likes" TO "service_role";


--
-- Name: TABLE "service_categories"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."service_categories" TO "anon";
GRANT ALL ON TABLE "public"."service_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."service_categories" TO "service_role";


--
-- Name: TABLE "services"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";


--
-- Name: TABLE "tracks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."tracks" TO "anon";
GRANT ALL ON TABLE "public"."tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."tracks" TO "service_role";


--
-- Name: TABLE "user_achievements"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";


--
-- Name: TABLE "user_notification_state"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_notification_state" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_state" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_state" TO "service_role";


--
-- Name: TABLE "user_points_ledger"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_points_ledger" TO "anon";
GRANT ALL ON TABLE "public"."user_points_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."user_points_ledger" TO "service_role";


--
-- Name: TABLE "user_theme_preferences"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_theme_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_theme_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_theme_preferences" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

-- \unrestrict kxHLVzGwF122i08gl1eGFIF5XF6opTVqpbDOHFHHC6NycbuAY4hXYys4PUqOHL7

-- ---------------------------------------------------------------------------
-- Cross-schema application objects intentionally omitted by the public-schema
-- dump. Keep these here so a fresh local reset matches linked staging.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS "on_auth_user_created_profile" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created_profile"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_profile"();

INSERT INTO "storage"."buckets" ("id", "name", "public", "type")
VALUES
  ('media', 'media', true, 'STANDARD'),
  ('uploads', 'uploads', true, 'STANDARD')
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "public" = EXCLUDED."public",
    "type" = EXCLUDED."type";

DROP POLICY IF EXISTS "Authenticated users can delete their uploads" ON "storage"."objects";
CREATE POLICY "Authenticated users can delete their uploads"
ON "storage"."objects" FOR DELETE TO "authenticated"
USING (("bucket_id" = 'uploads'::text));

DROP POLICY IF EXISTS "Authenticated users can update their uploads" ON "storage"."objects";
CREATE POLICY "Authenticated users can update their uploads"
ON "storage"."objects" FOR UPDATE TO "authenticated"
USING (("bucket_id" = 'uploads'::text))
WITH CHECK (("bucket_id" = 'uploads'::text));

DROP POLICY IF EXISTS "Authenticated users can upload files" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload files"
ON "storage"."objects" FOR INSERT TO "authenticated"
WITH CHECK (("bucket_id" = 'uploads'::text));

DROP POLICY IF EXISTS "Public can view uploads" ON "storage"."objects";
CREATE POLICY "Public can view uploads"
ON "storage"."objects" FOR SELECT
USING (("bucket_id" = 'uploads'::text));
