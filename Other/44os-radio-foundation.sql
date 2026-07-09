-- 44OS Radio foundation (simple looping playlist)
-- Reviewed SQL only. Run manually after confirming backup/rollback.
-- This version uses existing uploaded music from public.tracks.

create extension if not exists pgcrypto;

create table if not exists public.radio_playlist_entries (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null unique references public.tracks(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists radio_playlist_entries_active_sort_idx
  on public.radio_playlist_entries (is_active, sort_order, added_at);

create or replace function public.set_radio_playlist_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_radio_playlist_entries_updated_at on public.radio_playlist_entries;
create trigger set_radio_playlist_entries_updated_at
before update on public.radio_playlist_entries
for each row execute function public.set_radio_playlist_updated_at();

alter table public.radio_playlist_entries enable row level security;

drop policy if exists "radio playlist public read" on public.radio_playlist_entries;
create policy "radio playlist public read"
on public.radio_playlist_entries
for select
using (true);

drop policy if exists "radio playlist admin write" on public.radio_playlist_entries;
create policy "radio playlist admin write"
on public.radio_playlist_entries
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Import current uploaded music into the Radio playlist.
-- This picks published music tracks that have a real audio URL and duration,
-- then randomizes the initial order for a more station-like feel.
insert into public.radio_playlist_entries (track_id, sort_order, is_active)
select
  candidate.track_id,
  row_number() over (order by random()),
  true
from (
  select distinct
    t.id as track_id
  from public.tracks t
  join public.products p on p.id = t.product_id
  where coalesce(t.audio_url, '') <> ''
    and coalesce(t.duration_seconds, 0) > 0
    and coalesce(p.is_published, false) = true
    and (
      lower(coalesce(p.experience_type, '')) = 'music'
      or lower(coalesce(p.category, '')) = 'music'
      or lower(coalesce(p.runtime_type, '')) = 'music'
      or lower(coalesce(p.product_type, '')) like any (array['%album%', '%ep%', '%single%', '%track%'])
    )
) as candidate
on conflict (track_id) do nothing;

-- Optional maintenance query for later:
-- Re-randomize the playlist order while keeping the same included tracks.
-- with shuffled as (
--   select id, row_number() over (order by random()) as next_sort
--   from public.radio_playlist_entries
--   where is_active = true
-- )
-- update public.radio_playlist_entries r
-- set sort_order = shuffled.next_sort
-- from shuffled
-- where r.id = shuffled.id;
