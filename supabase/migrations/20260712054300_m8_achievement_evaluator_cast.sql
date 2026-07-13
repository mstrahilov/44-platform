-- M8 removes the evaluator's implicit text-to-uuid[] initialization cast.

create or replace function public.evaluate_item_achievements(
  target_item_id uuid, requested_trigger_type text, target_session_id uuid default null,
  client_context jsonb default '{}'
) returns table(
  id uuid, code text, title text, description text, trigger_type text, icon text
) language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid();
declare eligible boolean := false;
declare playable_count integer := 0;
declare completed_count integer := 0;
declare local_hour integer;
declare timezone_offset integer;
declare achievement_row public.item_achievements;
declare overachiever_row public.item_achievements;
declare newly_unlocked uuid[] := array[]::uuid[];
begin
  if active_user is null then raise exception 'authentication required'; end if;
  if not public.has_item_entitlement(active_user,target_item_id,'library_access') then raise exception 'Library access required'; end if;

  if target_session_id is not null then
    select count(*)::integer into playable_count from public.tracks
    where item_id=target_item_id and audio_url is not null;
    select count(distinct track_id)::integer into completed_count
    from public.achievement_playback_signals
    where user_id=active_user and item_id=target_item_id and session_id=target_session_id
      and signal_type='track_completed';
    if playable_count>0 and completed_count=playable_count then
      insert into public.achievement_playback_signals(user_id,item_id,session_id,signal_type,metadata)
      values(active_user,target_item_id,target_session_id,'release_completed',coalesce(client_context,'{}'))
      on conflict do nothing;
    end if;
  end if;

  eligible := case requested_trigger_type
    when 'all_tracks_listened' then target_session_id is not null and playable_count>0 and completed_count=playable_count
    when 'album_no_skips' then target_session_id is not null and playable_count>0 and completed_count=playable_count
      and not exists(select 1 from public.achievement_playback_signals where user_id=active_user and item_id=target_item_id and session_id=target_session_id and signal_type='track_skipped')
    when 'release_completed_at_night' then target_session_id is not null and playable_count>0 and completed_count=playable_count
    when 'release_completed_three_sessions' then (
      select count(distinct session_id)>=3 from public.achievement_playback_signals
      where user_id=active_user and item_id=target_item_id and signal_type='release_completed'
    )
    when 'review_created' then exists(
      select 1 from public.content_entries entry where entry.content_type='review'
        and entry.author_id=active_user and entry.item_id=target_item_id
        and entry.publication_status='published' and entry.moderation_status='visible'
    )
    when 'creator_followed_from_product' then exists(
      select 1 from public.catalog_items item join public.profile_follows follow
        on follow.following_id=item.author_id
      where item.id=target_item_id and follow.follower_id=active_user
    )
    when 'shared_link_opened' then exists(
      select 1 from public.item_share_visits visit
      where visit.item_id=target_item_id and visit.referrer_id=active_user
    )
    else false
  end;

  if requested_trigger_type='release_completed_at_night' and eligible then
    timezone_offset := greatest(-840,least(840,coalesce((client_context->>'timezone_offset_minutes')::integer,0)));
    local_hour := extract(hour from (now() - make_interval(mins=>timezone_offset)))::integer;
    eligible := local_hour>=22 or local_hour<4;
  end if;

  if eligible then
    for achievement_row in select achievement.* from public.item_achievements achievement
      where achievement.item_id=target_item_id and achievement.trigger_type=requested_trigger_type
    loop
      if public.issue_item_achievement(active_user,target_item_id,achievement_row.id,
        jsonb_build_object('source','trusted_achievement_evaluation') || coalesce(client_context,'{}')) then
        newly_unlocked := array_append(newly_unlocked,achievement_row.id);
      end if;
    end loop;
  end if;

  select achievement.* into overachiever_row from public.item_achievements achievement
  where achievement.item_id=target_item_id and achievement.code='overachiever' limit 1;
  if overachiever_row.id is not null
    and not exists(select 1 from public.user_achievements where user_id=active_user and achievement_id=overachiever_row.id)
    and exists(select 1 from public.item_achievements achievement where achievement.item_id=target_item_id and achievement.code<>'overachiever')
    and not exists(
      select 1 from public.item_achievements required
      where required.item_id=target_item_id and required.code<>'overachiever'
        and not exists(select 1 from public.user_achievements unlocked where unlocked.user_id=active_user and unlocked.achievement_id=required.id)
    ) then
    if public.issue_item_achievement(active_user,target_item_id,overachiever_row.id,
      jsonb_build_object('source','trusted_overachiever_evaluation','completed_trigger',requested_trigger_type)) then
      newly_unlocked := array_append(newly_unlocked,overachiever_row.id);
    end if;
  end if;

  return query select achievement.id,achievement.code,achievement.title,achievement.description,
    achievement.trigger_type,achievement.icon
  from public.item_achievements achievement where achievement.id=any(newly_unlocked)
  order by achievement.sort_order;
end;
$$;

revoke execute on function public.evaluate_item_achievements(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.evaluate_item_achievements(uuid, text, uuid, jsonb) to authenticated, service_role;
