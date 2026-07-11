-- Persistent, cross-device read and dismissal state for synthesized notifications.

create table if not exists public.user_notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_notification_ids text[] not null default '{}'::text[],
  hidden_notification_ids text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

alter table public.user_notification_state enable row level security;

drop policy if exists "Users can read their notification state" on public.user_notification_state;
create policy "Users can read their notification state"
  on public.user_notification_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their notification state" on public.user_notification_state;
create policy "Users can create their notification state"
  on public.user_notification_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their notification state" on public.user_notification_state;
create policy "Users can update their notification state"
  on public.user_notification_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_notification_state to authenticated;

comment on table public.user_notification_state is
  'Per-account seen and dismissed state for notifications synthesized from achievement_events.';
