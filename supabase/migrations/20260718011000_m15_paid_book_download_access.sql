-- Paid books grant the same protected file to an active download entitlement
-- that free/read-only books expose to an active read entitlement. Storage
-- remains private and every URL is still short-lived and user-authorized.
create or replace function public.can_access_item_file(object_name text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.item_assets asset where asset.storage_path=object_name and(
      public.can_manage_item(asset.item_id)
      or (asset.asset_type in ('beat_mp3','beat_wav','beat_stems') and public.has_active_beat_file_grant(auth.uid(),asset.id))
      or (asset.asset_type in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content'))
      or (asset.asset_type='book' and (public.has_item_entitlement(auth.uid(),asset.item_id,'read') or public.has_item_entitlement(auth.uid(),asset.item_id,'download')))
      or (asset.asset_type in ('sample_pack','sample') and public.has_item_entitlement(auth.uid(),asset.item_id,'download'))
      or (asset.asset_type not in ('beat_mp3','beat_wav','beat_stems') and asset.is_downloadable and public.has_item_entitlement(auth.uid(),asset.item_id,'download'))
      or (asset.asset_type not in ('beat_mp3','beat_wav','beat_stems') and not asset.is_downloadable and asset.asset_type not in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),asset.item_id,'library_access'))
    )
  );
$$;

create or replace function public.list_item_asset_manifest(target_item_id uuid)
returns table(id uuid,item_id uuid,asset_type text,title text,file_url text,storage_path text,is_downloadable boolean,sort_order integer,created_at timestamptz,is_unlocked boolean)
language sql stable security definer set search_path=public as $$
  select asset.id,asset.item_id,asset.asset_type,asset.title,
    case when access.can_access then asset.file_url else null end,
    case when access.can_access then asset.storage_path else null end,
    asset.is_downloadable,asset.sort_order,asset.created_at,access.can_access
  from public.item_assets asset
  cross join lateral(select case
    when public.can_manage_item(asset.item_id) then true
    when asset.asset_type in ('beat_mp3','beat_wav','beat_stems') then public.has_active_beat_file_grant(auth.uid(),asset.id)
    when asset.asset_type in ('bonus_content','bonus_achievement') then public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content')
    when asset.asset_type='book' then public.has_item_entitlement(auth.uid(),asset.item_id,'read') or public.has_item_entitlement(auth.uid(),asset.item_id,'download')
    when asset.asset_type in ('sample_pack','sample') then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
    when asset.is_downloadable then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
    else public.has_item_entitlement(auth.uid(),asset.item_id,'library_access') end can_access) access
  where asset.item_id=target_item_id
    and (public.can_manage_item(asset.item_id) or access.can_access)
  order by asset.sort_order,asset.created_at;
$$;
