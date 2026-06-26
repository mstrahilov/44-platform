-- 44 Platform user library setup
-- Run this in the Supabase SQL Editor after your existing content tables exist.

alter table public.library_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists acquisition_type text not null default 'free',
  add column if not exists acquired_at timestamptz not null default now();

drop index if exists public.library_items_user_release_unique;

alter table public.library_items
  drop constraint if exists library_items_user_release_unique;

alter table public.library_items
  add constraint library_items_user_release_unique
  unique (user_id, release_id);

alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.achievements enable row level security;
alter table public.extras enable row level security;
alter table public.library_items enable row level security;

drop policy if exists "Public releases are readable" on public.releases;
create policy "Public releases are readable"
on public.releases
for select
to anon, authenticated
using (true);

drop policy if exists "Public tracks are readable" on public.tracks;
create policy "Public tracks are readable"
on public.tracks
for select
to anon, authenticated
using (true);

drop policy if exists "Public achievements are readable" on public.achievements;
create policy "Public achievements are readable"
on public.achievements
for select
to anon, authenticated
using (true);

drop policy if exists "Public extras are readable" on public.extras;
create policy "Public extras are readable"
on public.extras
for select
to anon, authenticated
using (true);

drop policy if exists "Users can read their own library items" on public.library_items;
create policy "Users can read their own library items"
on public.library_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can add free items to their library" on public.library_items;
create policy "Users can add free items to their library"
on public.library_items
for insert
to authenticated
with check (auth.uid() = user_id and acquisition_type = 'free');

drop policy if exists "Users can update their own library items" on public.library_items;
create policy "Users can update their own library items"
on public.library_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);