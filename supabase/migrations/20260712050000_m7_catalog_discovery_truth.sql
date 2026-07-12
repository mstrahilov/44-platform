-- M7: make capability discovery reflect behavior that an Item can actually use.

delete from public.item_capabilities capability
using public.catalog_items item
where capability.item_id = item.id
  and capability.capability_key = 'streaming'
  and item.experience_type <> 'music';

delete from public.item_capabilities capability
using public.catalog_items item
where capability.item_id = item.id
  and capability.capability_key = 'downloads'
  and item.experience_type = 'merch'
  and not exists (
    select 1
    from public.item_assets asset
    where asset.item_id = item.id
      and asset.is_downloadable = true
  )
  and not exists (
    select 1
    from public.catalog_offers offer
    where offer.item_id = item.id
      and offer.offer_type = 'digital_download'
      and offer.status in ('active', 'draft')
  );
