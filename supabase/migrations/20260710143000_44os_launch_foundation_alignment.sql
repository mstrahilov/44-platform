-- 44OS launch foundation alignment.
-- Staging-safe cleanup: align app-supported asset types, repair messaging RLS,
-- and add a quiet points ledger for future rewards.

begin;

-- Product assets are the file/extras table for canonical catalog items.
-- Keep existing legacy-compatible values while adding the launch feature vocabulary.
update public.product_assets
set asset_type = 'bonus_content'
where asset_type in ('bonus_achievement', 'bonus_free');

alter table public.product_assets
  drop constraint if exists product_assets_asset_type_check;

alter table public.product_assets
  add constraint product_assets_asset_type_check
  check (
    asset_type in (
      'audio',
      'book',
      'sample_pack',
      'gallery_image',
      'bonus_content',
      'commentary_audio',
      'behind_the_scenes',
      'image',
      'webgl',
      'template',
      'music',
      'merch',
      'other'
    )
  );

comment on table public.products is
'Canonical catalog items. UI may call this Browse, Store, releases, merch, books, or Library items; library_items stores each user relationship to the same product row.';

comment on table public.library_items is
'User-owned, saved, purchased, or added relationship to a canonical products row.';

comment on table public.product_assets is
'Files and extras attached to a product, including owned downloads, galleries, and release feature unlocks.';

comment on table public.achievement_templates is
'44-defined achievement catalog, grouped by supported experience type.';

comment on table public.product_achievements is
'Achievement templates enabled for one canonical product item.';

comment on table public.user_achievements is
'User achievement unlocks for product-level and future platform-level achievements.';

comment on table public.achievement_events is
'Achievement and points-related event audit log.';

comment on table public.achievement_progress is
'Per-user counters and partial progress toward achievement unlocks.';

-- Messaging: remove duplicate recursive policies and keep one security-definer path.
create or replace function public.is_conversation_member(
  p_conversation_id uuid,
  p_profile_id uuid
)
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

drop policy if exists "authenticated users can create conversations" on public.conversations;
drop policy if exists "conversation members can read conversations" on public.conversations;
drop policy if exists "conversation members can update conversations" on public.conversations;
drop policy if exists conversations_insert_auth on public.conversations;
drop policy if exists conversations_read_member on public.conversations;
drop policy if exists conversations_update_member on public.conversations;

drop policy if exists "authenticated users can create memberships" on public.conversation_members;
drop policy if exists "members can read memberships" on public.conversation_members;
drop policy if exists "members can update their membership" on public.conversation_members;
drop policy if exists conversation_members_insert_self_or_creator on public.conversation_members;
drop policy if exists conversation_members_read_own_conversations on public.conversation_members;
drop policy if exists conversation_members_update_own on public.conversation_members;

drop policy if exists "conversation members can read messages" on public.messages;
drop policy if exists "conversation members can send messages" on public.messages;
drop policy if exists messages_insert_member on public.messages;
drop policy if exists messages_read_member on public.messages;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy conversations_insert_auth
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid());

create policy conversations_read_member
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id, auth.uid()));

create policy conversations_update_member
on public.conversations
for update
to authenticated
using (public.is_conversation_member(id, auth.uid()))
with check (public.is_conversation_member(id, auth.uid()));

create policy conversation_members_insert_self_or_creator
on public.conversation_members
for insert
to authenticated
with check (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
  )
);

create policy conversation_members_read_member
on public.conversation_members
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_conversation_member(conversation_id, auth.uid())
);

create policy conversation_members_update_own
on public.conversation_members
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy messages_read_member
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

create policy messages_insert_member
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

-- Quiet points ledger: not exposed in UI yet, but ready for achievements,
-- reviews, platform milestones, and future reward/redemption systems.
create table if not exists public.user_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  points integer not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint user_points_ledger_points_nonzero check (points <> 0),
  constraint user_points_ledger_source_type_check check (
    source_type in (
      'achievement',
      'review',
      'follow',
      'publish',
      'system',
      'adjustment',
      'redemption'
    )
  )
);

create index if not exists user_points_ledger_user_created_idx
on public.user_points_ledger (user_id, created_at desc);

alter table public.user_points_ledger enable row level security;

drop policy if exists user_points_ledger_read_own on public.user_points_ledger;
create policy user_points_ledger_read_own
on public.user_points_ledger
for select
to authenticated
using (user_id = auth.uid());

comment on table public.user_points_ledger is
'Append-only user points foundation for future achievements, platform activity, rewards, and redemptions.';

commit;
