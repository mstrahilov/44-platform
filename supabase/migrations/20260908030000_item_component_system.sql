begin;

-- The "component system": creators toggle named sections per release from
-- Studio (External Links, Digital Download/Licensing, Related Items,
-- Visuals, Achievements, Community), and Store/Library both render from the
-- same flags instead of each hardcoding its own section list.
--
-- `download_purchase_enabled` already exists and already gates real
-- checkout/entitlement logic — it becomes the Digital Download/Licensing
-- toggle as-is, no new column. Achievements visibility stays inferred from
-- whether item_achievements rows exist, exactly as today. The four flags
-- below are genuinely new.
alter table public.catalog_items
  add column external_links_enabled boolean not null default true,
  add column visuals_enabled boolean not null default true,
  add column related_items_enabled boolean not null default true,
  add column community_enabled boolean not null default true;

create or replace function public.update_owned_item(target_item_id uuid, patch jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  allowed_keys constant text[] := array['title','long_description','item_category_id','item_type','price_cents','market_mode','local_price_cents','local_currency','available_locally_only','is_free','cover_url','experience_type','fulfillment_type','merch_fulfillment_mode','merch_shipping_scope','read_url','download_url','year','release_date','creator','streaming_enabled','download_purchase_enabled','external_links_enabled','visuals_enabled','related_items_enabled','community_enabled'];
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
    external_links_enabled=case when patch?'external_links_enabled' then (patch->>'external_links_enabled')::boolean else item.external_links_enabled end,
    visuals_enabled=case when patch?'visuals_enabled' then (patch->>'visuals_enabled')::boolean else item.visuals_enabled end,
    related_items_enabled=case when patch?'related_items_enabled' then (patch->>'related_items_enabled')::boolean else item.related_items_enabled end,
    community_enabled=case when patch?'community_enabled' then (patch->>'community_enabled')::boolean else item.community_enabled end,
    status=item.status,updated_at=now()
  where item.id=target_item_id;
end;
$$;

revoke all on function public.update_owned_item(uuid,jsonb) from public,anon;
grant execute on function public.update_owned_item(uuid,jsonb) to authenticated,service_role;

-- Curated "Related Items": a creator explicitly links one of their own
-- releases to another (e.g. an album's companion lyric book), distinct from
-- the always-on "More from creator" rail, which stays computed at read time
-- from same-author/same-experience items and is not part of this table.
create table public.item_related_items (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  related_item_id uuid not null references public.catalog_items(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(item_id, related_item_id),
  check(item_id <> related_item_id)
);

alter table public.item_related_items enable row level security;

create policy item_related_items_read on public.item_related_items
for select
using (
  exists(
    select 1 from public.catalog_items item
    where item.id=item_related_items.item_id
      and (item.status='published' or item.author_id=auth.uid())
  )
);

create policy item_related_items_manage on public.item_related_items
to authenticated
using (public.can_manage_item(item_id))
with check (public.can_manage_item(item_id) and public.can_manage_item(related_item_id));

-- Replaces the full related-item set for target_item_id in one call, the
-- same replace-the-whole-set shape as sync_managed_item_achievements.
-- Ownership of BOTH sides is required — a creator may only relate their own
-- releases to each other.
create function public.set_item_related_items(target_item_id uuid, related_ids uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare
  unowned_id uuid;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or not editable by this account.' using errcode='42501';
  end if;
  if related_ids is null then
    related_ids := array[]::uuid[];
  end if;
  if array_length(related_ids,1) > 0 then
    select id into unowned_id
    from unnest(related_ids) id
    where not public.can_manage_item(id) or id=target_item_id
    limit 1;
    if unowned_id is not null then
      raise exception 'Related Items must be one of your own other releases.' using errcode='42501';
    end if;
  end if;

  insert into public.item_related_items(item_id,related_item_id,sort_order)
  select target_item_id,related_id,ordinality-1
  from unnest(related_ids) with ordinality as related(related_id,ordinality)
  on conflict(item_id,related_item_id) do update set sort_order=excluded.sort_order;

  delete from public.item_related_items existing
  where existing.item_id=target_item_id
    and not (existing.related_item_id=any(related_ids));
end;
$$;

revoke all on function public.set_item_related_items(uuid,uuid[]) from public,anon;
grant execute on function public.set_item_related_items(uuid,uuid[]) to authenticated,service_role;

commit;
