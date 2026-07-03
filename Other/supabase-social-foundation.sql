-- ============================================================================
-- 44OS — SOCIAL FOUNDATION: follows + direct messages
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- Follows / friends graph
-- ----------------------------------------------------------------------------
create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self check (follower_id <> following_id)
);

create index if not exists profile_follows_follower_idx on public.profile_follows(follower_id, created_at desc);
create index if not exists profile_follows_following_idx on public.profile_follows(following_id, created_at desc);

alter table public.profile_follows enable row level security;

drop policy if exists "profile_follows_read" on public.profile_follows;
drop policy if exists "profile_follows_insert_own" on public.profile_follows;
drop policy if exists "profile_follows_delete_own" on public.profile_follows;
create policy "profile_follows_read" on public.profile_follows for select using (true);
create policy "profile_follows_insert_own" on public.profile_follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "profile_follows_delete_own" on public.profile_follows
  for delete to authenticated using (follower_id = auth.uid());

-- ----------------------------------------------------------------------------
-- One-to-one conversations
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_read_at timestamptz,
  archived_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'deleted')),
  created_at timestamptz not null default now()
);

create index if not exists conversation_members_profile_idx on public.conversation_members(profile_id, created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at asc);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(p_conversation_id uuid, p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.profile_id = p_profile_id
  );
$$;

drop policy if exists "conversations_read_member" on public.conversations;
drop policy if exists "conversations_insert_auth" on public.conversations;
drop policy if exists "conversations_update_member" on public.conversations;
create policy "conversations_read_member" on public.conversations for select to authenticated using (
  public.is_conversation_member(id, auth.uid())
);
create policy "conversations_insert_auth" on public.conversations
  for insert to authenticated with check (created_by = auth.uid());
create policy "conversations_update_member" on public.conversations for update to authenticated using (
  public.is_conversation_member(id, auth.uid())
);

drop policy if exists "conversation_members_read_own_conversations" on public.conversation_members;
drop policy if exists "conversation_members_insert_self_or_creator" on public.conversation_members;
drop policy if exists "conversation_members_update_own" on public.conversation_members;
create policy "conversation_members_read_own_conversations" on public.conversation_members for select to authenticated using (
  profile_id = auth.uid()
  or public.is_conversation_member(conversation_id, auth.uid())
);
create policy "conversation_members_insert_self_or_creator" on public.conversation_members for insert to authenticated with check (
  profile_id = auth.uid()
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = auth.uid()
  )
);
create policy "conversation_members_update_own" on public.conversation_members for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "messages_read_member" on public.messages;
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_read_member" on public.messages for select to authenticated using (
  public.is_conversation_member(conversation_id, auth.uid())
);
create policy "messages_insert_member" on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

commit;
