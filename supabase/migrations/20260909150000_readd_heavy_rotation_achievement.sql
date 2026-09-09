-- Re-add "Heavy Rotation" for everyone — reverses the retirement in
-- 20260909130000. Restores it to Studio's achievement sync allow-list and
-- backfills it onto every existing music item that doesn't already have a
-- row for it (items that already earned/kept it are untouched via
-- `on conflict do nothing`).

insert into public.item_achievements (
  item_id, code, title, description, trigger_type, trigger_config,
  reward_config, points, icon, sort_order, is_secret
)
select
  item.id,
  'heavy_rotation',
  'Heavy Rotation',
  'Listen to the full release three times.',
  'release_completed_three_sessions',
  '{}'::jsonb,
  jsonb_build_object('bonus_items', '[]'::jsonb, 'commentary_enabled', false, 'final_reward_required', false),
  0,
  '/achivements/Heavy%20Rotation.png',
  3,
  false
from public.catalog_items item
where item.experience_type = 'music'
on conflict (item_id, code) do nothing;

-- Unlike Heavy Rotation, "Front to Back" is removed for everyone,
-- including members who'd already earned it — an explicit call, not the
-- "preserve what's earned" guard the other retirements used. This cascades
-- to user_achievements (ON DELETE CASCADE), so any earned copy's unlock
-- record goes with it; front_to_back carries no reward_item_id, so there
-- are no entitlements to unwind.
delete from public.item_achievements where code = 'front_to_back';

create or replace function public.sync_managed_item_achievements(target_item_id uuid, achievement_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or not editable.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(achievement_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Achievement rows must be an array.' using errcode = '22023';
  end if;

  insert into public.item_achievements (
    item_id, code, title, description, trigger_type, trigger_config,
    reward_item_id, reward_config, points, icon, sort_order, is_secret
  )
  select target_item_id, row.code, row.title, row.description, row.trigger_type,
    coalesce(row.trigger_config, '{}'::jsonb), row.reward_item_id,
    coalesce(row.reward_config, '{}'::jsonb), coalesce(row.points, 0),
    row.icon, coalesce(row.sort_order, 0), coalesce(row.is_secret, false)
  from jsonb_to_recordset(coalesce(achievement_rows, '[]'::jsonb)) as row(
    code text, title text, description text, trigger_type text, trigger_config jsonb,
    reward_item_id uuid, reward_config jsonb, points integer, icon text,
    sort_order integer, is_secret boolean
  )
  where row.code in (
    'no_skips', 'nightbird', 'heavy_rotation',
    'joined_the_orbit', 'left_your_mark', 'signal_boost', 'overachiever'
  )
  on conflict (item_id, code) do update set
    title = excluded.title, description = excluded.description, trigger_type = excluded.trigger_type,
    trigger_config = excluded.trigger_config, reward_item_id = excluded.reward_item_id,
    reward_config = excluded.reward_config, points = excluded.points, icon = excluded.icon,
    sort_order = excluded.sort_order, is_secret = excluded.is_secret;

  -- 'front_to_back' is deleted unconditionally, even if already earned —
  -- it's retired outright, not just excluded from new syncs.
  delete from public.item_achievements achievement
  where achievement.item_id = target_item_id
    and (
      achievement.code = 'front_to_back'
      or (
        not exists (
          select 1 from public.user_achievements unlocked
          where unlocked.achievement_id = achievement.id
        )
        and not exists (
          select 1 from jsonb_array_elements(coalesce(achievement_rows, '[]'::jsonb)) selected
          where selected->>'code' = achievement.code
        )
      )
    );
end;
$$;

revoke all on function public.sync_managed_item_achievements(uuid, jsonb) from public, anon;
grant execute on function public.sync_managed_item_achievements(uuid, jsonb) to authenticated, service_role;
