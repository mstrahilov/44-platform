-- M5 continuation: trusted achievement issuance and protected Item assets.

create table public.achievement_playback_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  session_id uuid not null,
  signal_type text not null check (signal_type in ('track_completed','track_skipped','release_completed')),
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  constraint achievement_playback_signals_track_check check (
    (signal_type in ('track_completed','track_skipped') and track_id is not null)
    or (signal_type='release_completed' and track_id is null)
  )
);

create unique index achievement_playback_track_signal_key
  on public.achievement_playback_signals(user_id,item_id,session_id,signal_type,track_id)
  where track_id is not null;
create unique index achievement_playback_release_signal_key
  on public.achievement_playback_signals(user_id,item_id,session_id,signal_type)
  where track_id is null;
create index achievement_playback_item_user_idx
  on public.achievement_playback_signals(user_id,item_id,occurred_at desc);

alter table public.achievement_playback_signals enable row level security;
create policy achievement_playback_signals_owner_read on public.achievement_playback_signals
for select to authenticated using(user_id=auth.uid());
grant select on public.achievement_playback_signals to authenticated;
grant all on public.achievement_playback_signals to service_role;

create or replace function public.has_item_entitlement(
  target_user_id uuid,target_item_id uuid,target_entitlement_type text
) returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.entitlements entitlement
    where entitlement.user_id=target_user_id and entitlement.item_id=target_item_id
      and entitlement.entitlement_type=target_entitlement_type
      and entitlement.status='active'
      and (entitlement.expires_at is null or entitlement.expires_at>now())
  );
$$;

create or replace function public.record_achievement_playback_signal(
  target_item_id uuid,target_track_id uuid,target_session_id uuid,target_signal_type text,
  signal_metadata jsonb default '{}'
) returns void language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid();
begin
  if active_user is null then raise exception 'authentication required'; end if;
  if target_signal_type not in ('track_completed','track_skipped') then raise exception 'invalid playback signal'; end if;
  if not public.has_item_entitlement(active_user,target_item_id,'library_access') then raise exception 'Library access required'; end if;
  if not exists(select 1 from public.tracks where id=target_track_id and item_id=target_item_id and audio_url is not null) then
    raise exception 'track does not belong to playable Item';
  end if;
  insert into public.achievement_playback_signals(user_id,item_id,track_id,session_id,signal_type,metadata)
  values(active_user,target_item_id,target_track_id,target_session_id,target_signal_type,coalesce(signal_metadata,'{}'))
  on conflict do nothing;
end;
$$;

create or replace function public.grant_achievement_entitlement(
  target_user_id uuid,target_item_id uuid,target_entitlement_type text,target_achievement_id uuid
) returns uuid language plpgsql security definer set search_path=public as $$
declare entitlement_row public.entitlements;
declare prior_status text;
begin
  select status into prior_status from public.entitlements
  where user_id=target_user_id and item_id=target_item_id and entitlement_type=target_entitlement_type;
  insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at)
  values(target_user_id,target_item_id,target_entitlement_type,'active','achievement',target_achievement_id,now(),null)
  on conflict(user_id,item_id,entitlement_type) do update
    set status='active',source_type='achievement',source_id=target_achievement_id,
      granted_at=case when public.entitlements.status='active' then public.entitlements.granted_at else now() end,
      revoked_at=null,expires_at=null
  returning * into entitlement_row;
  if prior_status is distinct from 'active' then
    insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
    values(entitlement_row.id,target_user_id,target_item_id,target_entitlement_type,
      case when prior_status is null then 'grant' else 'restore' end,
      'achievement',target_achievement_id,'Achievement reward');
  end if;
  return entitlement_row.id;
end;
$$;

create or replace function public.issue_item_achievement(
  target_user_id uuid,target_item_id uuid,target_achievement_id uuid,event_metadata jsonb default '{}'
) returns boolean language plpgsql security definer set search_path=public as $$
declare inserted_count integer;
declare achievement_row public.item_achievements;
begin
  select * into achievement_row from public.item_achievements
  where id=target_achievement_id and item_id=target_item_id;
  if achievement_row.id is null then return false; end if;

  insert into public.user_achievements(user_id,item_id,achievement_id)
  values(target_user_id,target_item_id,target_achievement_id)
  on conflict(user_id,achievement_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count=0 then return false; end if;

  insert into public.achievement_events(user_id,item_id,achievement_id,event_type,metadata)
  values(target_user_id,target_item_id,target_achievement_id,'achievement_unlocked',
    jsonb_build_object('trigger_type',achievement_row.trigger_type,'achievement_code',achievement_row.code) || coalesce(event_metadata,'{}'));

  return true;
end;
$$;

create or replace function public.evaluate_item_achievements(
  target_item_id uuid,requested_trigger_type text,target_session_id uuid default null,
  client_context jsonb default '{}'
) returns table(
  id uuid,code text,title text,description text,trigger_type text,icon text
) language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid();
declare eligible boolean := false;
declare playable_count integer := 0;
declare completed_count integer := 0;
declare local_hour integer;
declare timezone_offset integer;
declare achievement_row public.item_achievements;
declare overachiever_row public.item_achievements;
declare newly_unlocked uuid[] := '{}';
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

create or replace function public.list_item_asset_manifest(target_item_id uuid)
returns table(
  id uuid,item_id uuid,asset_type text,title text,file_url text,storage_path text,
  is_downloadable boolean,sort_order integer,created_at timestamptz,is_unlocked boolean
) language sql stable security definer set search_path=public as $$
  select asset.id,asset.item_id,asset.asset_type,asset.title,
    case when access.can_access then asset.file_url else null end,
    case when access.can_access then asset.storage_path else null end,
    asset.is_downloadable,asset.sort_order,asset.created_at,access.can_access
  from public.item_assets asset
  cross join lateral (
    select case
      when public.can_manage_item(asset.item_id) then true
      when asset.asset_type in ('bonus_content','bonus_achievement') then public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content')
      when asset.is_downloadable then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
      else public.has_item_entitlement(auth.uid(),asset.item_id,'library_access')
    end as can_access
  ) access
  where asset.item_id=target_item_id
    and (public.can_manage_item(asset.item_id) or public.has_item_entitlement(auth.uid(),asset.item_id,'library_access'))
  order by asset.sort_order,asset.created_at;
$$;

create or replace function public.grant_user_achievement_entitlements()
returns trigger language plpgsql security definer set search_path=public as $$
declare achievement_row public.item_achievements;
begin
  select * into achievement_row from public.item_achievements where id=new.achievement_id;
  if achievement_row.code='overachiever' then
    perform public.grant_achievement_entitlement(new.user_id,new.item_id,'bonus_content',new.achievement_id);
  end if;
  if achievement_row.reward_item_id is not null then
    perform public.grant_achievement_entitlement(new.user_id,achievement_row.reward_item_id,'library_access',new.achievement_id);
    insert into public.library_entries(user_id,item_id,acquisition_type,status)
    values(new.user_id,achievement_row.reward_item_id,'grant','visible')
    on conflict(user_id,item_id) do update set status='visible',acquisition_type='grant';
  end if;
  return new;
end;
$$;

create trigger user_achievements_grant_entitlements
after insert on public.user_achievements
for each row execute function public.grant_user_achievement_entitlements();

-- Download URLs belong to protected asset rows, never the public catalog or
-- track payload. Preserve any historical URL before clearing the public copy.
insert into public.item_assets(item_id,asset_type,title,file_url,storage_path,is_downloadable,sort_order)
select item.id,
  case item.experience_type when 'book' then 'book' when 'music' then 'music'
    when 'asset' then 'sample_pack' else 'other' end,
  item.title,item.download_url,null,true,0
from public.catalog_items item
where item.download_url is not null
  and not exists(select 1 from public.item_assets asset where asset.item_id=item.id and asset.file_url=item.download_url);

update public.catalog_items
set read_url=case when read_url=download_url then null else read_url end,
    download_url=null
where download_url is not null;

update public.tracks set download_url=null where download_url is not null;

alter table public.catalog_items add constraint catalog_items_download_url_private_check check(download_url is null);
alter table public.tracks add constraint tracks_download_url_private_check check(download_url is null);

-- Existing Overachiever unlocks receive the entitlement that the UI previously
-- inferred client-side.
insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at)
select unlock.user_id,unlock.item_id,'bonus_content','active','achievement',unlock.achievement_id,unlock.unlocked_at
from public.user_achievements unlock
join public.item_achievements achievement on achievement.id=unlock.achievement_id
where achievement.code='overachiever'
on conflict(user_id,item_id,entitlement_type) do update
  set status='active',source_type='achievement',source_id=excluded.source_id,revoked_at=null;

insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
select entitlement.id,entitlement.user_id,entitlement.item_id,entitlement.entitlement_type,
  'grant','achievement',entitlement.source_id,'M5 Overachiever reward preservation'
from public.entitlements entitlement
where entitlement.entitlement_type='bonus_content' and entitlement.source_type='achievement'
  and not exists(select 1 from public.entitlement_events event where event.entitlement_id=entitlement.id and event.operation='grant');

drop policy if exists "Users can insert own achievements" on public.user_achievements;
drop policy if exists "Users can create own achievement events" on public.achievement_events;
drop policy if exists "achievement_progress_insert_own" on public.achievement_progress;
drop policy if exists "achievement_progress_update_own" on public.achievement_progress;
revoke insert,update,delete on public.user_achievements from anon,authenticated;
revoke insert,update,delete on public.achievement_events from anon,authenticated;
revoke insert,update,delete on public.achievement_progress from anon,authenticated;

drop policy if exists "merch orders buyer insert" on public.merch_orders;
drop policy if exists "merch order items buyer insert" on public.merch_order_items;
revoke insert on public.merch_orders from anon,authenticated;
revoke insert on public.merch_order_items from anon,authenticated;

drop policy if exists "product_assets_read_creator_or_owner" on public.item_assets;
create policy item_assets_authorized_read on public.item_assets for select to authenticated
using (
  public.can_manage_item(item_id)
  or (asset_type in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),item_id,'bonus_content'))
  or (is_downloadable and public.has_item_entitlement(auth.uid(),item_id,'download'))
  or (not is_downloadable and asset_type not in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),item_id,'library_access'))
);

grant execute on function public.record_achievement_playback_signal(uuid,uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.evaluate_item_achievements(uuid,text,uuid,jsonb) to authenticated;
grant execute on function public.list_item_asset_manifest(uuid) to authenticated;
revoke execute on function public.record_achievement_playback_signal(uuid,uuid,uuid,text,jsonb) from public,anon;
revoke execute on function public.evaluate_item_achievements(uuid,text,uuid,jsonb) from public,anon;
revoke execute on function public.list_item_asset_manifest(uuid) from public,anon;

comment on table public.achievement_playback_signals is
  'Validated per-user playback evidence. Clients may request signal recording but cannot directly insert unlocks or progress.';
