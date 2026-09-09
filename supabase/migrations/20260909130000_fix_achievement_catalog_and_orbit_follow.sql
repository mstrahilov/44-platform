-- Achievement catalog fixes:
-- 1. "Joined the Orbit" (creator_followed_from_product) now unlocks automatically
--    whenever a follow relationship exists, both going forward (trigger on
--    profile_follows) and retroactively for existing follows (backfill below).
--    Previously it only unlocked at the instant a member tapped Follow from
--    inside that specific item's page, so anyone who already followed the
--    creator before that moment (or from anywhere else) could never earn it
--    without unfollowing and re-following.
-- 2. "Heavy Rotation" is retired — removed from the achievement sync RPC's
--    allowed codes and deleted from items that haven't already had it
--    unlocked. Already-earned copies (and their entitlements) are left
--    untouched; user_achievements cascades on item_achievements deletion, so
--    only ever-unlocked rows are excluded here.
-- 3. "Front to Back" (all_tracks_listened) no longer applies to single-track
--    releases — removed for existing single-track items (again, only where
--    not already unlocked) and excluded going forward in the sync RPC.

-- Retroactively remove Heavy Rotation everywhere it hasn't been earned.
delete from public.item_achievements achievement
where achievement.code = 'heavy_rotation'
  and not exists (
    select 1 from public.user_achievements unlocked
    where unlocked.achievement_id = achievement.id
  );

-- Retroactively remove Front to Back from single-track releases where it
-- hasn't been earned.
delete from public.item_achievements achievement
where achievement.code = 'front_to_back'
  and not exists (
    select 1 from public.user_achievements unlocked
    where unlocked.achievement_id = achievement.id
  )
  and (
    select count(*) from public.tracks track where track.item_id = achievement.item_id
  ) <= 1;

-- `sync_managed_item_achievements` is what Studio calls on every release
-- save; updating it here keeps both the allowed-code whitelist and the
-- single-track exclusion enforced server-side regardless of what the web
-- client currently sends, so this is correct even before that client ships
-- its own update.
create or replace function public.sync_managed_item_achievements(target_item_id uuid, achievement_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  track_count integer;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or not editable.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(achievement_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Achievement rows must be an array.' using errcode = '22023';
  end if;

  select count(*) into track_count from public.tracks where item_id = target_item_id;

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
    'front_to_back', 'no_skips', 'nightbird',
    'joined_the_orbit', 'left_your_mark', 'signal_boost', 'overachiever'
  )
  and not (row.code = 'front_to_back' and track_count <= 1)
  on conflict (item_id, code) do update set
    title = excluded.title, description = excluded.description, trigger_type = excluded.trigger_type,
    trigger_config = excluded.trigger_config, reward_item_id = excluded.reward_item_id,
    reward_config = excluded.reward_config, points = excluded.points, icon = excluded.icon,
    sort_order = excluded.sort_order, is_secret = excluded.is_secret;

  delete from public.item_achievements achievement
  where achievement.item_id = target_item_id
    and not exists (
      select 1 from public.user_achievements unlocked
      where unlocked.achievement_id = achievement.id
    )
    and (
      achievement.code = 'heavy_rotation'
      or (achievement.code = 'front_to_back' and track_count <= 1)
      or not exists (
        select 1 from jsonb_array_elements(coalesce(achievement_rows, '[]'::jsonb)) selected
        where selected->>'code' = achievement.code
      )
    );
end;
$$;

revoke all on function public.sync_managed_item_achievements(uuid, jsonb) from public, anon;
grant execute on function public.sync_managed_item_achievements(uuid, jsonb) to authenticated, service_role;

-- Unlocks "Joined the Orbit" for every item of `target_creator` that
-- `target_follower` already has library access to. Mirrors the eligibility
-- check `evaluate_item_achievements` uses for 'creator_followed_from_product',
-- gated the same way on library_access so this never grants an achievement
-- for an item the follower doesn't actually own.
create or replace function public.sync_joined_the_orbit_achievement(target_follower uuid, target_creator uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  achievement_row record;
begin
  for achievement_row in
    select achievement.id as achievement_id, achievement.item_id
    from public.item_achievements achievement
    join public.catalog_items item on item.id = achievement.item_id
    where achievement.code = 'joined_the_orbit'
      and item.author_id = target_creator
      and public.has_item_entitlement(target_follower, achievement.item_id, 'library_access')
  loop
    perform public.issue_item_achievement(
      target_follower,
      achievement_row.item_id,
      achievement_row.achievement_id,
      jsonb_build_object('source', 'profile_follow_sync')
    );
  end loop;
end;
$$;

revoke all on function public.sync_joined_the_orbit_achievement(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sync_joined_the_orbit_achievement(uuid, uuid) to service_role;

create or replace function public.handle_profile_follow_achievement_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_joined_the_orbit_achievement(new.follower_id, new.following_id);
  return new;
end;
$$;

drop trigger if exists profile_follows_sync_joined_the_orbit on public.profile_follows;
create trigger profile_follows_sync_joined_the_orbit
  after insert on public.profile_follows
  for each row execute function public.handle_profile_follow_achievement_sync();

-- Retroactive backfill for every follow relationship that already exists —
-- grants "Joined the Orbit" for any release by a followed creator already
-- sitting in the follower's library, so everyone is caught up immediately
-- rather than waiting on their next follow or library addition.
do $$
declare
  follow_row record;
begin
  for follow_row in select follower_id, following_id from public.profile_follows loop
    perform public.sync_joined_the_orbit_achievement(follow_row.follower_id, follow_row.following_id);
  end loop;
end;
$$;

-- The other half of the same fix: a member who already follows a creator
-- and then adds a NEW release of theirs to their library (purchase, free
-- save, achievement grant, admin grant — anything that inserts or
-- reactivates a `library_access` entitlement) should have the achievement
-- unlock at that moment too, not only when they (re-)trigger a follow.
create or replace function public.handle_library_access_granted_achievement_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_author uuid;
  matching_achievement_id uuid;
begin
  if new.entitlement_type <> 'library_access' or new.status <> 'active' then
    return new;
  end if;

  select author_id into item_author from public.catalog_items where id = new.item_id;
  if item_author is null or not exists (
    select 1 from public.profile_follows
    where follower_id = new.user_id and following_id = item_author
  ) then
    return new;
  end if;

  select id into matching_achievement_id from public.item_achievements
  where item_id = new.item_id and code = 'joined_the_orbit';
  if matching_achievement_id is not null then
    perform public.issue_item_achievement(
      new.user_id, new.item_id, matching_achievement_id,
      jsonb_build_object('source', 'library_access_granted_sync')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists entitlements_sync_joined_the_orbit on public.entitlements;
create trigger entitlements_sync_joined_the_orbit
  after insert or update on public.entitlements
  for each row execute function public.handle_library_access_granted_achievement_sync();
