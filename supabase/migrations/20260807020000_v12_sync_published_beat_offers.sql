begin;

-- A Beat can be complete while it is still a creator draft. Version 1.2's
-- activation migration intentionally left those offers dormant, so activate
-- their approved standard tiers at the moment the Item becomes published.
create or replace function public.sync_published_beat_license_offers()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status <> 'published' or not public.is_beat_item(new.id) then
    return new;
  end if;

  update public.catalog_offers offer
  set status='active',updated_at=now()
  from public.beat_license_offers mapping
  join public.beat_license_templates template on template.id=mapping.template_id
  where offer.item_id=new.id
    and mapping.offer_id=offer.id
    and offer.offer_type='beat_license'
    and offer.fulfillment_type='license'
    and offer.status in ('draft','active')
    and template.status='active'
    and not template.is_exclusive
    and template.tier_code in ('basic','premium','trackout')
    and public.is_creator_paid_sales_enabled(new.author_id)
    and coalesce((
      select controls.catalog_enabled
        and controls.publishing_enabled
        and controls.checkout_enabled
        and controls.nonexclusive_pilot_enabled
      from public.beat_runtime_controls controls
      where controls.singleton
    ),false)
    and coalesce((
      select controls.checkout_enabled
        and controls.stripe_payments_enabled
        and controls.operating_model_approved_at is not null
      from public.commerce_runtime_controls controls
      where controls.singleton
    ),false)
    and not exists(select 1 from public.beat_configuration_health(new.id));

  return new;
end;
$$;

revoke all on function public.sync_published_beat_license_offers() from public,anon,authenticated;

drop trigger if exists catalog_items_sync_published_beat_offers on public.catalog_items;
create trigger catalog_items_sync_published_beat_offers
after insert or update of status on public.catalog_items
for each row execute function public.sync_published_beat_license_offers();

-- Bring Beats published after the initial 1.2 activation into the same state.
update public.catalog_offers offer
set status='active',updated_at=now()
from public.catalog_items item,
  public.beat_license_offers mapping,
  public.beat_license_templates template
where offer.item_id=item.id
  and mapping.offer_id=offer.id
  and template.id=mapping.template_id
  and item.status='published'
  and public.is_beat_item(item.id)
  and offer.offer_type='beat_license'
  and offer.fulfillment_type='license'
  and offer.status in ('draft','active')
  and template.status='active'
  and not template.is_exclusive
  and template.tier_code in ('basic','premium','trackout')
  and public.is_creator_paid_sales_enabled(item.author_id)
  and coalesce((
    select controls.catalog_enabled
      and controls.publishing_enabled
      and controls.checkout_enabled
      and controls.nonexclusive_pilot_enabled
    from public.beat_runtime_controls controls
    where controls.singleton
  ),false)
  and coalesce((
    select controls.checkout_enabled
      and controls.stripe_payments_enabled
      and controls.operating_model_approved_at is not null
    from public.commerce_runtime_controls controls
    where controls.singleton
  ),false)
  and not exists(select 1 from public.beat_configuration_health(item.id));

comment on function public.sync_published_beat_license_offers() is
  'Activates only complete, approved, standard non-exclusive Beat offers when an eligible Beat becomes public.';

commit;
