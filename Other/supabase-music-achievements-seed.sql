-- 44 Platform music achievement seed
-- Run after supabase-achievements-scalable-foundation.sql.
-- Safe to run more than once.

begin;

insert into public.product_achievements (
  product_id,
  code,
  title,
  description,
  trigger_type,
  trigger_config,
  reward_config,
  points,
  sort_order,
  is_secret
)
select
  products.id,
  achievement.code,
  achievement.title,
  achievement.description,
  achievement.trigger_type,
  achievement.trigger_config::jsonb,
  achievement.reward_config::jsonb,
  achievement.points,
  achievement.sort_order,
  achievement.is_secret
from public.products
cross join (values
  (
    'casual_listener',
    'CASUAL LISTENER',
    'Listen to every track on this release.',
    'all_tracks_listened',
    '{"event":"track_completed","require_all_tracks":true}',
    '{}',
    10,
    10,
    false
  ),
  (
    'dedicated_listener',
    'DEDICATED LISTENER',
    'Play this release start to finish without skipping.',
    'album_no_skip',
    '{"event":"album_completed","allow_skips":false}',
    '{}',
    25,
    20,
    false
  ),
  (
    'supporter',
    'SUPPORTER',
    'Leave a review for this release.',
    'reviewed',
    '{"event":"review_created"}',
    '{}',
    10,
    30,
    false
  ),
  (
    'offline_mode',
    'OFFLINE MODE',
    'Download this release to your machine.',
    'downloaded',
    '{"event":"product_downloaded"}',
    '{}',
    10,
    40,
    false
  ),
  (
    'overachiever',
    'OVERACHIEVER',
    'Unlock every other achievement for this release.',
    'all_achievements_unlocked',
    '{"requires_all_non_overachiever":true}',
    '{"can_unlock_bonus_content":true}',
    50,
    100,
    false
  )
) as achievement(code, title, description, trigger_type, trigger_config, reward_config, points, sort_order, is_secret)
where lower(products.category) = 'music'
  and products.status = 'published'
on conflict (product_id, code) do update set
  title = excluded.title,
  description = excluded.description,
  trigger_type = excluded.trigger_type,
  trigger_config = excluded.trigger_config,
  reward_config = excluded.reward_config,
  points = excluded.points,
  sort_order = excluded.sort_order,
  is_secret = excluded.is_secret;

commit;
