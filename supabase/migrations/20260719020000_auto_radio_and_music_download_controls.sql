-- Automatically append playable tracks from published Music Items to Radio.
-- Existing playlist rows retain their order and Admin-controlled active state.
-- The Studio editor may now explicitly control streaming/download capabilities.

create or replace function public.sync_item_tracks_to_radio(target_item_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  item_author uuid;
  playlist_tail integer;
begin
  select item.author_id into item_author
  from public.catalog_items item
  where item.id=target_item_id
    and item.status='published'
    and item.experience_type='music'
    and coalesce(item.streaming_enabled,true);

  if not found then return; end if;

  perform pg_advisory_xact_lock(44,1902);
  select coalesce(max(entry.sort_order),-1) into playlist_tail
  from public.radio_playlist_entries entry;

  with missing_tracks as (
    select
      track.id,
      row_number() over (
        order by track.number nulls last,track.created_at,track.id
      ) - 1 as offset
    from public.tracks track
    where track.item_id=target_item_id
      and nullif(btrim(track.audio_url),'') is not null
      and not exists(
        select 1 from public.radio_playlist_entries entry
        where entry.track_id=track.id
      )
  )
  insert into public.radio_playlist_entries(track_id,sort_order,is_active,added_by)
  select missing.id,playlist_tail+missing.offset+1,true,item_author
  from missing_tracks missing
  order by missing.offset
  on conflict(track_id) do nothing;
end;
$$;

revoke all on function public.sync_item_tracks_to_radio(uuid) from public,anon,authenticated;
grant execute on function public.sync_item_tracks_to_radio(uuid) to service_role;

create or replace function public.sync_radio_after_track_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='UPDATE' and old.item_id is distinct from new.item_id then
    perform public.sync_item_tracks_to_radio(old.item_id);
  end if;
  if tg_op<>'DELETE' then
    perform public.sync_item_tracks_to_radio(new.item_id);
  end if;
  return coalesce(new,old);
end;
$$;

revoke all on function public.sync_radio_after_track_change() from public,anon,authenticated;

drop trigger if exists tracks_sync_radio_playlist on public.tracks;
create trigger tracks_sync_radio_playlist
after insert or update of item_id,audio_url on public.tracks
for each row execute function public.sync_radio_after_track_change();

create or replace function public.sync_radio_after_item_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.sync_item_tracks_to_radio(new.id);
  return new;
end;
$$;

revoke all on function public.sync_radio_after_item_change() from public,anon,authenticated;

drop trigger if exists catalog_items_sync_radio_playlist on public.catalog_items;
create trigger catalog_items_sync_radio_playlist
after insert or update of status,experience_type,streaming_enabled on public.catalog_items
for each row execute function public.sync_radio_after_item_change();

do $$
declare item_row record;
begin
  for item_row in
    select item.id
    from public.catalog_items item
    where item.status='published'
      and item.experience_type='music'
      and coalesce(item.streaming_enabled,true)
    order by item.created_at,item.id
  loop
    perform public.sync_item_tracks_to_radio(item_row.id);
  end loop;
end;
$$;

create or replace function public.update_owned_item(target_item_id uuid, patch jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  allowed_keys constant text[] := array['title','long_description','item_category_id','item_type','price_cents','market_mode','local_price_cents','local_currency','available_locally_only','is_free','cover_url','experience_type','fulfillment_type','merch_fulfillment_mode','merch_shipping_scope','read_url','download_url','year','release_date','creator','streaming_enabled','download_purchase_enabled'];
  unexpected_key text;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or not editable by this account.' using errcode='42501';
  end if;
  if exists(select 1 from public.catalog_items where id=target_item_id and status='archived') then
    raise exception 'Archived Items cannot be edited.' using errcode='55000';
  end if;
  if jsonb_typeof(coalesce(patch,'{}'::jsonb)) <> 'object' then
    raise exception 'Item changes must be an object.' using errcode='22023';
  end if;
  select key into unexpected_key from jsonb_object_keys(patch) key where not (key=any(allowed_keys)) limit 1;
  if unexpected_key is not null then
    raise exception 'Unsupported Item field: %',unexpected_key using errcode='22023';
  end if;

  update public.catalog_items item set
    title=case when patch?'title' then patch->>'title' else item.title end,
    long_description=case when patch?'long_description' then nullif(patch->>'long_description','') else item.long_description end,
    item_category_id=case when patch?'item_category_id' then nullif(patch->>'item_category_id','')::uuid else item.item_category_id end,
    item_type=case when patch?'item_type' then patch->>'item_type' else item.item_type end,
    price_cents=case when patch?'price_cents' then (patch->>'price_cents')::integer else item.price_cents end,
    market_mode=case when patch?'market_mode' then patch->>'market_mode' else item.market_mode end,
    local_price_cents=case when patch?'local_price_cents' then nullif(patch->>'local_price_cents','')::integer else item.local_price_cents end,
    local_currency=case when patch?'local_currency' then nullif(patch->>'local_currency','') else item.local_currency end,
    available_locally_only=case when patch?'available_locally_only' then (patch->>'available_locally_only')::boolean else item.available_locally_only end,
    is_free=case when patch?'is_free' then (patch->>'is_free')::boolean else item.is_free end,
    cover_url=case when patch?'cover_url' then nullif(patch->>'cover_url','') else item.cover_url end,
    experience_type=case when patch?'experience_type' then patch->>'experience_type' else item.experience_type end,
    fulfillment_type=case when patch?'fulfillment_type' then patch->>'fulfillment_type' else item.fulfillment_type end,
    merch_fulfillment_mode=case when patch?'merch_fulfillment_mode' then nullif(patch->>'merch_fulfillment_mode','') else item.merch_fulfillment_mode end,
    merch_shipping_scope=case when patch?'merch_shipping_scope' then nullif(patch->>'merch_shipping_scope','') else item.merch_shipping_scope end,
    read_url=case when patch?'read_url' then nullif(patch->>'read_url','') else item.read_url end,
    download_url=case when patch?'download_url' then nullif(patch->>'download_url','') else item.download_url end,
    year=case when patch?'year' then nullif(patch->>'year','')::integer else item.year end,
    release_date=case when patch?'release_date' then nullif(patch->>'release_date','')::date else item.release_date end,
    creator=case when patch?'creator' then patch->>'creator' else item.creator end,
    streaming_enabled=case when patch?'streaming_enabled' then (patch->>'streaming_enabled')::boolean else item.streaming_enabled end,
    download_purchase_enabled=case when patch?'download_purchase_enabled' then (patch->>'download_purchase_enabled')::boolean else item.download_purchase_enabled end,
    status=item.status,updated_at=now()
  where item.id=target_item_id;
end;
$$;

revoke all on function public.update_owned_item(uuid,jsonb) from public,anon;
grant execute on function public.update_owned_item(uuid,jsonb) to authenticated,service_role;

comment on function public.sync_item_tracks_to_radio(uuid) is
  'Appends playable tracks from an eligible published Music Item to Radio without changing existing playlist order or Admin active state.';
