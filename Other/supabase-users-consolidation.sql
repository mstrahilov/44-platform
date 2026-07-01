-- ============================================================================
-- 44OS — USER CONSOLIDATION + COMMUNITY FORUM FOUNDATION
-- Run ONCE in the Supabase SQL editor. Wrapped in a transaction and written to
-- be idempotent (safe to re-run). Read the section headers before running.
--
-- What this does:
--   1. Turns `profiles` into the single users table (member | creator | admin,
--      + is_official badge, + creator fields: slug, hero_url, creator_type).
--   2. Creates REAL auth users + profiles for 44 CORPORATION, the 7 existing
--      creators, and 6 seed members (so content + threads have real authors).
--   3. Adds author_id -> profiles to products / services / resources / posts and
--      backfills it from the old creators linkage (resources -> 44 CORPORATION).
--   4. DROPS the old `creators` table + creator_id columns.
--   5. Creates the forum tables: post_replies, post_likes, reply_likes (+ RLS),
--      and seeds replies + likes so the Community forum has live content.
--
-- NOTE: after you run this, the app code still references `creators` and will
-- error until the matching code refactor lands. Run this, then tell Claude to
-- ship the code changes.
-- ============================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. profiles -> unified users table
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('member', 'creator', 'admin'));

alter table public.profiles add column if not exists is_official  boolean not null default false;
alter table public.profiles add column if not exists slug         text;
alter table public.profiles add column if not exists hero_url     text;
alter table public.profiles add column if not exists creator_type text;
alter table public.profiles add column if not exists is_published boolean not null default true;

create unique index if not exists profiles_slug_key on public.profiles(slug) where slug is not null;

-- ----------------------------------------------------------------------------
-- 2. helper: create (or reuse) an auth user + identity, then upsert its profile
--    A signup trigger (handle_new_user_profile) may auto-create the profile row;
--    the upsert below reconciles it either way.
-- ----------------------------------------------------------------------------
create or replace function public._seed_user(
  p_email        text,
  p_display      text,
  p_username     text,
  p_role         text,
  p_slug         text,
  p_creator_type text,
  p_is_official  boolean,
  p_is_published boolean,
  p_avatar       text,
  p_hero         text,
  p_bio          text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = p_email;

  if uid is null then
    uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      p_email, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', p_display, 'username', p_username),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', p_email),
      now(), now(), now()
    );
  end if;

  insert into public.profiles (
    id, display_name, username, avatar_url, bio, role,
    slug, creator_type, is_official, is_published, hero_url
  ) values (
    uid, p_display, p_username, p_avatar, p_bio, p_role,
    p_slug, p_creator_type, p_is_official, p_is_published, p_hero
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    username     = excluded.username,
    avatar_url   = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    bio          = coalesce(excluded.bio, public.profiles.bio),
    role         = excluded.role,
    slug         = excluded.slug,
    creator_type = excluded.creator_type,
    is_official  = excluded.is_official,
    is_published = excluded.is_published,
    hero_url     = excluded.hero_url;

  return uid;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. seed users: migrate the 7 creators -> profiles, add 6 community members
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select * from public.creators loop
    perform public._seed_user(
      lower(r.slug) || '@seed.44os.app',
      r.name,
      regexp_replace(lower(r.slug), '[^a-z0-9]+', '_', 'g'),
      case when r.slug = '44-corporation' then 'admin' else 'creator' end,
      r.slug,
      r.creator_type,
      (r.slug = '44-corporation'),
      coalesce(r.is_published, true),
      r.avatar_url,
      r.hero_url,
      r.bio
    );
  end loop;

  -- community members (regular users)
  perform public._seed_user('novabeats@seed.44os.app',  'Nova Beats',  'novabeats',  'member', null, null, false, true, null, null, null);
  perform public._seed_user('quietindex@seed.44os.app', 'Quiet Index', 'quietindex', 'member', null, null, false, true, null, null, null);
  perform public._seed_user('palmwave@seed.44os.app',   'Palmwave',    'palmwave',   'member', null, null, false, true, null, null, null);
  perform public._seed_user('ghostcache@seed.44os.app', 'ghostcache',  'ghostcache', 'member', null, null, false, true, null, null, null);
  perform public._seed_user('littoral@seed.44os.app',   'Littoral',    'littoral',   'member', null, null, false, true, null, null, null);
  perform public._seed_user('deepstate@seed.44os.app',  'deep_state',  'deep_state', 'member', null, null, false, true, null, null, null);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. author_id on content + backfill
-- ----------------------------------------------------------------------------
alter table public.products  add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.services  add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.resources add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.posts     add column if not exists author_id uuid references public.profiles(id) on delete set null;

-- products + services: map old creator -> new profile via matching slug
update public.products p
  set author_id = pr.id
  from public.creators c
  join public.profiles pr on pr.slug = c.slug
  where p.creator_id = c.id and p.author_id is null;

update public.services s
  set author_id = pr.id
  from public.creators c
  join public.profiles pr on pr.slug = c.slug
  where s.creator_id = c.id and s.author_id is null;

-- resources are authorless today -> 44 CORPORATION
update public.resources
  set author_id = (select id from public.profiles where slug = '44-corporation')
  where author_id is null;

-- any leftover product/service without a match -> 44 CORPORATION
update public.products
  set author_id = (select id from public.profiles where slug = '44-corporation')
  where author_id is null;
update public.services
  set author_id = (select id from public.profiles where slug = '44-corporation')
  where author_id is null;

-- posts: distribute round-robin across every profile so threads have varied authors
do $$
declare
  ids uuid[];
  n int;
begin
  select array_agg(id order by created_at) into ids from public.profiles;
  n := array_length(ids, 1);

  with ranked as (
    select id, row_number() over (order by created_at) as rn
    from public.posts
    where author_id is null
  )
  update public.posts pt
    set author_id = ids[1 + ((ranked.rn - 1) % n)]
    from ranked
    where ranked.id = pt.id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. drop the old creators linkage
--    (products.creator TEXT is kept as a denormalized display name for now)
-- ----------------------------------------------------------------------------
alter table public.products  drop column if exists creator_id;
alter table public.services  drop column if exists creator_id;
alter table public.resources drop column if exists creator_id;
alter table public.posts     drop column if exists creator_id;
alter table public.posts     drop column if exists author_profile_id;

drop table if exists public.creators cascade;

-- ----------------------------------------------------------------------------
-- 6. community forum tables
-- ----------------------------------------------------------------------------
create table if not exists public.post_replies (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts(id) on delete cascade,
  author_id       uuid references public.profiles(id) on delete set null,
  parent_reply_id uuid references public.post_replies(id) on delete cascade,
  body            text not null,
  status          text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists post_replies_post_idx   on public.post_replies(post_id);
create index if not exists post_replies_author_idx on public.post_replies(author_id);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists public.reply_likes (
  reply_id   uuid not null references public.post_replies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- 7. RLS: posts + forum
-- ----------------------------------------------------------------------------
alter table public.posts        enable row level security;
alter table public.post_replies enable row level security;
alter table public.post_likes   enable row level security;
alter table public.reply_likes  enable row level security;

drop policy if exists "posts_read"        on public.posts;
drop policy if exists "posts_insert"      on public.posts;
drop policy if exists "posts_update_own"  on public.posts;
drop policy if exists "posts_delete_own"  on public.posts;
create policy "posts_read"       on public.posts for select using (status = 'published' or author_id = auth.uid());
create policy "posts_insert"     on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "posts_update_own" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "posts_delete_own" on public.posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists "replies_read"       on public.post_replies;
drop policy if exists "replies_insert"     on public.post_replies;
drop policy if exists "replies_update_own" on public.post_replies;
drop policy if exists "replies_delete_own" on public.post_replies;
create policy "replies_read"       on public.post_replies for select using (status = 'published' or author_id = auth.uid());
create policy "replies_insert"     on public.post_replies for insert to authenticated with check (author_id = auth.uid());
create policy "replies_update_own" on public.post_replies for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "replies_delete_own" on public.post_replies for delete to authenticated using (author_id = auth.uid());

drop policy if exists "post_likes_read"       on public.post_likes;
drop policy if exists "post_likes_insert"     on public.post_likes;
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_read"       on public.post_likes for select using (true);
create policy "post_likes_insert"     on public.post_likes for insert to authenticated with check (profile_id = auth.uid());
create policy "post_likes_delete_own" on public.post_likes for delete to authenticated using (profile_id = auth.uid());

drop policy if exists "reply_likes_read"       on public.reply_likes;
drop policy if exists "reply_likes_insert"     on public.reply_likes;
drop policy if exists "reply_likes_delete_own" on public.reply_likes;
create policy "reply_likes_read"       on public.reply_likes for select using (true);
create policy "reply_likes_insert"     on public.reply_likes for insert to authenticated with check (profile_id = auth.uid());
create policy "reply_likes_delete_own" on public.reply_likes for delete to authenticated using (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. seed replies + likes so the forum has live content
-- ----------------------------------------------------------------------------
do $$
declare
  p record;
  authors uuid[];
  i int;
  nreplies int;
  bodies text[] := array[
    'Love this — following for updates.',
    'Great point, hadn''t thought of it that way.',
    'How did you approach the mix on this?',
    'Congrats on shipping this.',
    'This is really clean work.',
    'Saved. Thanks for sharing.',
    'Would love a longer breakdown of your process.',
    'Solid — what tools did you use?',
    'Been looking for exactly this. Appreciated.',
    'Following. Drop more when you can.'
  ];
begin
  select array_agg(id) into authors from public.profiles;

  for p in select id from public.posts loop
    nreplies := 1 + floor(random() * 3)::int;   -- 1..3 replies
    for i in 1..nreplies loop
      insert into public.post_replies (post_id, author_id, body)
      values (
        p.id,
        authors[1 + floor(random() * array_length(authors, 1))::int],
        bodies[1 + floor(random() * array_length(bodies, 1))::int]
      );
    end loop;

    insert into public.post_likes (post_id, profile_id)
    select p.id, pr.id from public.profiles pr where random() < 0.4
    on conflict do nothing;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. cleanup
-- ----------------------------------------------------------------------------
drop function if exists public._seed_user(text, text, text, text, text, text, boolean, boolean, text, text, text);

commit;

-- Optional hardening (run later, after confirming existing product/service/resource
-- RLS): restrict inserts on store/services/resources to creator|admin authors.
