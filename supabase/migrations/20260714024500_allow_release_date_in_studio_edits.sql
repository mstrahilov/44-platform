create or replace function public.update_owned_item(target_item_id uuid, patch jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  allowed_keys constant text[] := array['title','long_description','item_category_id','item_type','price_cents','market_mode','local_price_cents','local_currency','available_locally_only','is_free','cover_url','experience_type','fulfillment_type','merch_fulfillment_mode','merch_shipping_scope','read_url','download_url','year','release_date','creator'];
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
    status=item.status,updated_at=now()
  where item.id=target_item_id;
end;
$$;

revoke all on function public.update_owned_item(uuid,jsonb) from public,anon;
grant execute on function public.update_owned_item(uuid,jsonb) to authenticated,service_role;
