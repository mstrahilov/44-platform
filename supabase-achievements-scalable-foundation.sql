-- 44 Platform scalable achievement foundation
-- Run this once before seeding achievements.
-- This keeps achievements flexible for music, books, games, Unity/WebGL events,
-- hidden unlocks, creator-specific achievements, and future reward logic.

begin;

-- Do not lock achievement triggers to a tiny fixed list.
-- The app can understand known triggers now, while future products can add new trigger keys later.
alter table public.product_achievements
  drop constraint if exists product_achievements_trigger_type_check;

alter table public.product_achievements
  add column if not exists trigger_config jsonb not null default '{}'::jsonb,
  add column if not exists reward_config jsonb not null default '{}'::jsonb,
  add column if not exists points integer not null default 0,
  add column if not exists icon text;

create index if not exists product_achievements_product_sort_idx
  on public.product_achievements(product_id, sort_order);

create index if not exists product_achievements_trigger_type_idx
  on public.product_achievements(trigger_type);

-- Generic event log for future achievement automation.
-- Examples: track_completed, album_completed_no_skip, book_finished,
-- unity_item_found, resource_downloaded, review_created.
create table if not exists public.achievement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  achievement_id uuid references public.product_achievements(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.achievement_events enable row level security;

drop policy if exists "Users can read own achievement events" on public.achievement_events;
create policy "Users can read own achievement events"
on public.achievement_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own achievement events" on public.achievement_events;
create policy "Users can create own achievement events"
on public.achievement_events
for insert
to authenticated
with check (auth.uid() = user_id);

create index if not exists achievement_events_user_type_idx
  on public.achievement_events(user_id, event_type, created_at desc);

create index if not exists achievement_events_product_idx
  on public.achievement_events(product_id, created_at desc);

commit;
