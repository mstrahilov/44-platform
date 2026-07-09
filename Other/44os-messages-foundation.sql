-- 44OS Messages foundation
-- Review and run in Supabase SQL editor after backing up the project.
-- This enables the app's /inbox and /community/messages direct conversation UI.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversation members can read conversations" on public.conversations;
create policy "conversation members can read conversations"
on public.conversations
for select
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.profile_id = auth.uid()
  )
);

drop policy if exists "authenticated users can create conversations" on public.conversations;
create policy "authenticated users can create conversations"
on public.conversations
for insert
with check (created_by = auth.uid());

drop policy if exists "conversation members can update conversations" on public.conversations;
create policy "conversation members can update conversations"
on public.conversations
for update
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.profile_id = auth.uid()
  )
);

drop policy if exists "members can read memberships" on public.conversation_members;
create policy "members can read memberships"
on public.conversation_members
for select
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.profile_id = auth.uid()
  )
);

drop policy if exists "authenticated users can create memberships" on public.conversation_members;
create policy "authenticated users can create memberships"
on public.conversation_members
for insert
with check (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "members can update their membership" on public.conversation_members;
create policy "members can update their membership"
on public.conversation_members
for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "conversation members can read messages" on public.messages;
create policy "conversation members can read messages"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.profile_id = auth.uid()
  )
);

drop policy if exists "conversation members can send messages" on public.messages;
create policy "conversation members can send messages"
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.profile_id = auth.uid()
  )
);

create index if not exists conversations_updated_at_idx on public.conversations (updated_at desc);
create index if not exists conversation_members_profile_id_idx on public.conversation_members (profile_id);
create index if not exists conversation_members_conversation_id_idx on public.conversation_members (conversation_id);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);

notify pgrst, 'reload schema';
