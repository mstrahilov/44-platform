begin;

-- Version 1.2 launches only the platform-approved, single-owner,
-- non-exclusive Beat path. The broader commerce controls remain unchanged,
-- and split/exclusive Beat sales stay disabled.
do $$
declare
  approver_id uuid;
  tier text;
begin
  select controls.platform_seller_id
  into approver_id
  from public.commerce_runtime_controls controls
  where controls.singleton
    and controls.checkout_enabled
    and controls.stripe_payments_enabled
    and controls.operating_model_approved_at is not null
    and controls.terms_version_id is not null
  for update;

  if approver_id is null then
    raise exception 'The approved platform commerce model must be active before Beat sales launch.' using errcode='55000';
  end if;

  -- V2 is the exact owner-approved standard text added by the Beat activation
  -- foundation. Record the platform approver without modifying the terms.
  foreach tier in array array['basic','premium','trackout'] loop
    update public.beat_license_templates
    set status='active',platform_approved_at=coalesce(platform_approved_at,now()),
      approved_by=coalesce(approved_by,approver_id),updated_at=now()
    where tier_code=tier and version=2 and status='draft';

    if not exists(
      select 1 from public.beat_license_templates
      where tier_code=tier and version=2 and status='active'
        and platform_approved_at is not null and approved_by is not null
        and not is_exclusive and char_length(terms_text)>=500
    ) then
      raise exception 'The approved version 2 % Beat license template is unavailable.',tier using errcode='55000';
    end if;

    -- Creators continue editing against a draft version while published offers
    -- are pinned to the immutable active V2 text.
    insert into public.beat_license_templates(
      tier_code,version,title,short_summary,included_file_kinds,is_exclusive,terms_text
    )
    select tier_code,3,title,short_summary,included_file_kinds,false,terms_text
    from public.beat_license_templates
    where tier_code=tier and version=2 and status='active'
    on conflict(tier_code,version) do nothing;
  end loop;
end;
$$;

-- Migration updates are the reviewed live mutation for this launch.
select set_config('os44.review_apply','1',true);

-- Existing drafts may still point at the V2 draft row from when they were
-- created. Pin every standard non-exclusive offer to that same active text.
update public.beat_license_offers mapping
set template_id=active_template.id
from public.beat_license_templates requested
join public.beat_license_templates active_template
  on active_template.tier_code=requested.tier_code
  and active_template.version=2
  and active_template.status='active'
  and not active_template.is_exclusive
where requested.id=mapping.template_id
  and requested.tier_code in ('basic','premium','trackout')
  and mapping.template_id is distinct from active_template.id;

-- Exclusive offers are outside the approved 1.2 product scope.
update public.catalog_offers offer
set status='archived',updated_at=now()
from public.beat_license_offers mapping
join public.beat_license_templates template on template.id=mapping.template_id
where offer.id=mapping.offer_id
  and (template.is_exclusive or template.tier_code='exclusive')
  and offer.status<>'archived';

update public.beat_runtime_controls
set review_surfaces_enabled=true,
  catalog_enabled=true,
  publishing_enabled=true,
  checkout_enabled=true,
  nonexclusive_pilot_enabled=true,
  split_sales_enabled=false,
  exclusive_sales_enabled=false,
  updated_at=now()
where singleton;

-- Activate only complete, published Beats belonging to a creator who has an
-- explicit paid-sales approval. Incomplete or ineligible offers remain drafts.
update public.catalog_offers offer
set status='active',updated_at=now()
from public.catalog_items item,
  public.beat_license_offers mapping,
  public.beat_license_templates template
where offer.item_id=item.id
  and mapping.offer_id=offer.id
  and template.id=mapping.template_id
  and offer.offer_type='beat_license'
  and offer.fulfillment_type='license'
  and offer.status in ('draft','active')
  and item.status='published'
  and public.is_beat_item(item.id)
  and public.is_creator_paid_sales_enabled(item.author_id)
  and template.status='active'
  and not template.is_exclusive
  and template.tier_code in ('basic','premium','trackout')
  and not exists(select 1 from public.beat_configuration_health(item.id));

-- A published Beat that advertises a non-exclusive tier must never be left in
-- a half-launched state. Roll back the whole migration if its contract, files,
-- creator approval, or active offer is incomplete.
do $$
begin
  if exists(
    select 1
    from public.catalog_items item
    join public.catalog_offers offer on offer.item_id=item.id
    join public.beat_license_offers mapping on mapping.offer_id=offer.id
    join public.beat_license_templates template on template.id=mapping.template_id
    where item.status='published'
      and public.is_beat_item(item.id)
      and template.tier_code in ('basic','premium','trackout')
      and offer.status='draft'
  ) then
    raise exception 'A published Beat has a non-exclusive tier that is not ready for checkout.' using errcode='55000';
  end if;

  if exists(
    select 1
    from public.catalog_offers offer
    join public.beat_license_offers mapping on mapping.offer_id=offer.id
    join public.beat_license_templates template on template.id=mapping.template_id
    where offer.status='active'
      and offer.offer_type='beat_license'
      and (template.status<>'active' or template.is_exclusive or template.tier_code not in ('basic','premium','trackout'))
  ) then
    raise exception 'An active Beat offer is outside the approved version 1.2 license scope.' using errcode='55000';
  end if;
end;
$$;

comment on table public.beat_runtime_controls is
  'Version 1.2 enables reviewed catalog, publishing, and standard non-exclusive Beat checkout. Split and exclusive Beat sales remain fail-closed.';

commit;
