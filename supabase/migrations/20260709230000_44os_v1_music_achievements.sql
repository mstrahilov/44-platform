-- 44OS v1.0 music achievement cleanup (reviewed manual SQL)
-- Scope:
-- - Ship music achievements only for v1.0.
-- - Remove First Wave, book achievements, Commentary/Director's Cut, and future feature achievements.
-- - Keep Bonus Content as unlockable content released by Overachiever only.
-- - Preserve existing product_achievements.id values for rows that remain, so user_achievements stays valid.
--
-- Expected public storage filenames:
-- media/achievements/front_to_back.png
-- media/achievements/no_skips.png
-- media/achievements/nightbird.png
-- media/achievements/heavy_rotation.png
-- media/achievements/joined_the_orbit.png
-- media/achievements/left_your_mark.png
-- media/achievements/signal_boost.png
-- media/achievements/overachiever.png

begin;

create table if not exists public.achievement_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  points integer not null default 50,
  icon text,
  sort_order integer not null default 0,
  is_secret boolean not null default false,
  is_active boolean not null default true,
  supported_experiences text[] not null default array['music']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists achievement_templates_code_uidx
on public.achievement_templates (code);

alter table public.achievement_templates enable row level security;

drop policy if exists achievement_templates_read_active on public.achievement_templates;
create policy achievement_templates_read_active
on public.achievement_templates
for select
to anon, authenticated
using (is_active = true);

alter table public.product_achievements
add column if not exists template_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_achievements_template_id_fkey'
      and conrelid = 'public.product_achievements'::regclass
  ) then
    alter table public.product_achievements
    add constraint product_achievements_template_id_fkey
    foreign key (template_id)
    references public.achievement_templates(id)
    on delete set null;
  end if;
end $$;

create index if not exists product_achievements_template_idx
on public.product_achievements (template_id);

with template_rows(code, title, description, trigger_type, points, icon, sort_order, is_secret) as (
  values
    ('front_to_back', 'Front to Back', 'Listen to every track on this release.', 'all_tracks_listened', 50, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/front_to_back.png', 0, false),
    ('no_skips', 'No Skips', 'Listen from the first track to the last without skipping.', 'album_no_skips', 75, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/no_skips.png', 1, false),
    ('nightbird', 'Nightbird', 'Listen to the release between 10 PM and 4 AM.', 'release_completed_at_night', 50, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/nightbird.png', 2, true),
    ('heavy_rotation', 'Heavy Rotation', 'Listen to the full release three times.', 'release_completed_three_sessions', 75, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/heavy_rotation.png', 3, false),
    ('joined_the_orbit', 'Joined the Orbit', 'Follow the creator from this release.', 'creator_followed_from_product', 50, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/joined_the_orbit.png', 4, false),
    ('left_your_mark', 'Left Your Mark', 'Write a review for this release.', 'review_created', 50, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/left_your_mark.png', 5, false),
    ('signal_boost', 'Signal Boost', 'Get someone to open this release from your shared link.', 'shared_link_opened', 75, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/signal_boost.png', 6, true),
    ('overachiever', 'Overachiever', 'Unlock every other enabled achievement to claim the creator''s final reward.', 'all_achievements_unlocked', 100, 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/media/achievements/overachiever.png', 7, false)
)
insert into public.achievement_templates (
  code,
  title,
  description,
  trigger_type,
  trigger_config,
  points,
  icon,
  sort_order,
  is_secret,
  is_active,
  supported_experiences
)
select
  code,
  title,
  description,
  trigger_type,
  '{}'::jsonb,
  points,
  icon,
  sort_order,
  is_secret,
  true,
  array['music']::text[]
from template_rows
on conflict (code) do update
set title = excluded.title,
    description = excluded.description,
    trigger_type = excluded.trigger_type,
    trigger_config = excluded.trigger_config,
    points = excluded.points,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    is_secret = excluded.is_secret,
    is_active = true,
    supported_experiences = excluded.supported_experiences,
    updated_at = now();

-- Preserve old music release uploads by converting prior feature-file rows into v1 Bonus Content rows.
with music_products as (
  select p.id
  from public.products p
  where p.experience_type = 'music'
    or lower(coalesce(p.runtime_type, '')) = 'music'
    or lower(coalesce(p.category, '')) = 'music'
    or lower(coalesce(p.product_type, '')) like any (array['%album%', '%ep%', '%single%', '%track%'])
)
update public.product_assets pa
set asset_type = 'bonus_achievement',
    title = case
      when pa.title is null or btrim(pa.title) = '' then 'Bonus Content'
      when pa.asset_type = 'behind_the_scenes' then 'Behind-the-Scenes'
      else pa.title
    end
from music_products mp
where pa.product_id = mp.id
  and pa.asset_type in ('behind_the_scenes', 'bonus_free');

-- Move any bonus_items previously attached to non-Overachiever rows onto Overachiever before pruning.
with collected_bonus as (
  select
    pa.product_id,
    jsonb_agg(item.value) as bonus_items
  from public.product_achievements pa
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(pa.reward_config -> 'bonus_items') = 'array' then pa.reward_config -> 'bonus_items'
      else '[]'::jsonb
    end
  ) as item(value)
  where pa.code <> 'overachiever'
  group by pa.product_id
)
update public.product_achievements overachiever
set reward_config = jsonb_set(
  (coalesce(overachiever.reward_config, '{}'::jsonb) - 'commentary_enabled') || '{"final_reward_required": true}'::jsonb,
  '{bonus_items}',
  coalesce(
    case
      when jsonb_typeof(overachiever.reward_config -> 'bonus_items') = 'array' then overachiever.reward_config -> 'bonus_items'
      else '[]'::jsonb
    end,
    '[]'::jsonb
  ) || collected_bonus.bonus_items,
  true
)
from collected_bonus
where overachiever.product_id = collected_bonus.product_id
  and overachiever.code = 'overachiever';

update public.product_achievements
set reward_config = jsonb_set(coalesce(reward_config, '{}'::jsonb) - 'commentary_enabled', '{bonus_items}', '[]'::jsonb, true)
where code <> 'overachiever';

update public.product_achievements
set reward_config = (coalesce(reward_config, '{}'::jsonb) - 'commentary_enabled') || '{"final_reward_required": true}'::jsonb,
    is_secret = false
where code = 'overachiever';

create temporary table tmp_44os_pruned_achievements on commit drop as
with music_products as (
  select p.id
  from public.products p
  where p.experience_type = 'music'
    or lower(coalesce(p.runtime_type, '')) = 'music'
    or lower(coalesce(p.category, '')) = 'music'
    or lower(coalesce(p.product_type, '')) like any (array['%album%', '%ep%', '%single%', '%track%'])
),
v1_codes(code) as (
  values
    ('front_to_back'),
    ('no_skips'),
    ('nightbird'),
    ('heavy_rotation'),
    ('joined_the_orbit'),
    ('left_your_mark'),
    ('signal_boost'),
    ('overachiever')
)
select pa.id
from public.product_achievements pa
left join music_products mp on mp.id = pa.product_id
left join v1_codes vc on vc.code = pa.code
where mp.id is null
   or vc.code is null;

delete from public.achievement_events
where achievement_id in (select id from tmp_44os_pruned_achievements);

delete from public.user_achievements
where achievement_id in (select id from tmp_44os_pruned_achievements);

delete from public.product_achievements
where id in (select id from tmp_44os_pruned_achievements);

with templates as (
  select id, code, title, description, trigger_type, trigger_config, points, icon, sort_order, is_secret
  from public.achievement_templates
  where code in (
    'front_to_back',
    'no_skips',
    'nightbird',
    'heavy_rotation',
    'joined_the_orbit',
    'left_your_mark',
    'signal_boost',
    'overachiever'
  )
)
update public.product_achievements pa
set template_id = templates.id,
    title = templates.title,
    description = templates.description,
    trigger_type = templates.trigger_type,
    trigger_config = templates.trigger_config,
    points = templates.points,
    icon = templates.icon,
    sort_order = templates.sort_order,
    is_secret = templates.is_secret
from templates
where pa.code = templates.code;

commit;
