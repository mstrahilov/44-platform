-- 44OS achievement tracking foundation (2026-07-05)
-- Additive only: progress counters, share referrals, and v1 achievement seeds.

create table if not exists public.achievement_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  metric text not null,
  value integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, metric)
);

alter table public.achievement_progress enable row level security;

drop policy if exists achievement_progress_read_own on public.achievement_progress;
create policy achievement_progress_read_own
on public.achievement_progress for select
to authenticated
using (user_id = auth.uid());

drop policy if exists achievement_progress_insert_own on public.achievement_progress;
create policy achievement_progress_insert_own
on public.achievement_progress for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists achievement_progress_update_own on public.achievement_progress;
create policy achievement_progress_update_own
on public.achievement_progress for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.product_share_visits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  visitor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_share_visits_product_referrer_idx
on public.product_share_visits (product_id, referrer_id, created_at desc);

alter table public.product_share_visits enable row level security;

drop policy if exists product_share_visits_insert_auth on public.product_share_visits;
create policy product_share_visits_insert_auth
on public.product_share_visits for insert
to authenticated
with check (visitor_id is null or visitor_id = auth.uid() or referrer_id = auth.uid());

drop policy if exists product_share_visits_read_participant on public.product_share_visits;
create policy product_share_visits_read_participant
on public.product_share_visits for select
to authenticated
using (referrer_id = auth.uid() or visitor_id = auth.uid());

create unique index if not exists product_achievements_product_code_uidx
on public.product_achievements (product_id, code);

with music_defaults(code, title, description, trigger_type, points, is_secret, sort_order) as (
  values
    ('front_to_back', 'Front to Back', 'Listen to every track on this release.', 'all_tracks_listened', 50, false, 0),
    ('no_skips', 'No Skips', 'Listen from the first track to the last without skipping.', 'album_no_skips', 75, false, 1),
    ('nightbird', 'Nightbird', 'Listen to the release between 10 PM and 4 AM.', 'release_completed_at_night', 50, true, 2),
    ('heavy_rotation', 'Heavy Rotation', 'Listen to the full release three times.', 'release_completed_three_sessions', 75, false, 3),
    ('first_wave', 'First Wave', 'Listen to the full release within two weeks of launch.', 'release_completed_launch_window', 50, false, 4),
    ('directors_cut', 'Director''s Cut', 'Listen to the full release in Commentary Mode.', 'commentary_album_completed', 75, false, 5),
    ('joined_the_orbit', 'Joined the Orbit', 'Follow the creator from this release.', 'creator_followed_from_product', 50, false, 6),
    ('left_your_mark', 'Left Your Mark', 'Write a review for this release.', 'review_created', 50, false, 7),
    ('signal_boost', 'Signal Boost', 'Get someone to open this release from your shared link.', 'shared_link_opened', 75, true, 8),
    ('overachiever', 'Overachiever', 'Unlock every other enabled achievement to claim the creator''s final reward.', 'all_achievements_unlocked', 100, false, 9)
),
music_targets as (
  select p.id
  from public.products p
  where (p.status = 'published' or p.is_published = true)
    and (
      p.experience_type = 'music'
      or lower(coalesce(p.runtime_type, '')) = 'music'
      or lower(coalesce(p.category, '')) = 'music'
      or lower(coalesce(p.product_type, '')) like any (array['%album%', '%ep%', '%single%', '%track%'])
    )
)
insert into public.product_achievements (
  product_id,
  code,
  title,
  description,
  trigger_type,
  trigger_config,
  reward_product_id,
  reward_config,
  points,
  icon,
  sort_order,
  is_secret
)
select
  mt.id,
  md.code,
  md.title,
  md.description,
  md.trigger_type,
  '{}'::jsonb,
  null,
  case when md.code = 'overachiever' then '{"final_reward_required": true}'::jsonb else '{}'::jsonb end,
  md.points,
  null,
  md.sort_order,
  md.is_secret
from music_targets mt
cross join music_defaults md
on conflict (product_id, code) do update
set title = excluded.title,
    description = excluded.description,
    trigger_type = excluded.trigger_type,
    points = excluded.points,
    sort_order = excluded.sort_order,
    is_secret = case when excluded.code = 'overachiever' then false else excluded.is_secret end,
    reward_config = case when excluded.code = 'overachiever' then '{"final_reward_required": true}'::jsonb else public.product_achievements.reward_config end;

with book_defaults(code, title, description, trigger_type, points, is_secret, sort_order) as (
  values
    ('cover_to_cover', 'Cover to Cover', 'Read the entire book.', 'book_completed', 50, false, 0),
    ('page_turner', 'Page-Turner', 'Read 25 percent of the book in one session.', 'book_quarter_single_session', 50, false, 1),
    ('no_bookmark_needed', 'No Bookmark Needed', 'Finish the book in a single reading session.', 'book_completed_single_session', 75, false, 2),
    ('night_owl', 'Night Owl', 'Read between 10 PM and 4 AM.', 'book_read_at_night', 50, true, 3),
    ('back_for_more', 'Back for More', 'Return on another day and keep reading.', 'book_progress_on_second_day', 50, false, 4),
    ('first_edition', 'First Edition', 'Finish the book within two weeks of launch.', 'book_completed_launch_window', 50, false, 5),
    ('joined_the_orbit', 'Joined the Orbit', 'Follow the creator from this book.', 'creator_followed_from_product', 50, false, 6),
    ('left_your_mark', 'Left Your Mark', 'Write a review for this book.', 'review_created', 50, false, 7),
    ('signal_boost', 'Signal Boost', 'Get someone to open this book from your shared link.', 'shared_link_opened', 75, true, 8),
    ('overachiever', 'Overachiever', 'Unlock every other enabled achievement to claim the creator''s final reward.', 'all_achievements_unlocked', 100, false, 9)
),
book_targets as (
  select p.id
  from public.products p
  where (p.status = 'published' or p.is_published = true)
    and (
      p.experience_type = 'book'
      or lower(coalesce(p.runtime_type, '')) = 'book'
      or lower(coalesce(p.category, '')) in ('book', 'books')
      or lower(coalesce(p.product_type, '')) like any (array['%book%', '%artbook%', '%novel%'])
    )
)
insert into public.product_achievements (
  product_id,
  code,
  title,
  description,
  trigger_type,
  trigger_config,
  reward_product_id,
  reward_config,
  points,
  icon,
  sort_order,
  is_secret
)
select
  bt.id,
  bd.code,
  bd.title,
  bd.description,
  bd.trigger_type,
  '{}'::jsonb,
  null,
  case when bd.code = 'overachiever' then '{"final_reward_required": true}'::jsonb else '{}'::jsonb end,
  bd.points,
  null,
  bd.sort_order,
  bd.is_secret
from book_targets bt
cross join book_defaults bd
on conflict (product_id, code) do update
set title = excluded.title,
    description = excluded.description,
    trigger_type = excluded.trigger_type,
    points = excluded.points,
    sort_order = excluded.sort_order,
    is_secret = case when excluded.code = 'overachiever' then false else excluded.is_secret end,
    reward_config = case when excluded.code = 'overachiever' then '{"final_reward_required": true}'::jsonb else public.product_achievements.reward_config end;

update public.product_achievements
set is_secret = false,
    reward_config = coalesce(reward_config, '{}'::jsonb) || '{"final_reward_required": true}'::jsonb
where code = 'overachiever';
