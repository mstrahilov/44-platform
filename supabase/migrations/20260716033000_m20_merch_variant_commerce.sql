-- M20: customer-safe Merch variant identity and variant-aware Stripe order snapshots.

alter table public.merch_variants
  add column price_cents integer check (price_cents is null or price_cents >= 0),
  add column image_url text,
  add column sort_order integer not null default 0,
  add column is_default boolean not null default false;

alter table public.merch_variants
  drop constraint merch_variants_status_check,
  add constraint merch_variants_status_check check (status in ('draft','active','unavailable','archived'));

drop policy merch_variants_public_read on public.merch_variants;
create policy merch_variants_public_read on public.merch_variants for select
  using (
    status in ('active','unavailable')
    and exists(
      select 1 from public.catalog_items item
      where item.id=merch_variants.item_id and item.status='published'
        and item.experience_type='merch' and item.fulfillment_type in ('physical','hybrid')
    )
  );

create unique index merch_variants_one_default_per_item_idx
  on public.merch_variants(item_id)
  where is_default;

alter table public.commerce_order_items
  add column merch_variant_snapshot jsonb not null default '{}'
  check (jsonb_typeof(merch_variant_snapshot)='object');

create or replace function public.create_stripe_pending_order_with_variants(
  target_buyer_id uuid,
  target_offer_ids uuid[],
  target_merch_variant_ids uuid[],
  target_idempotency_key text,
  target_customer_email text
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare base_result jsonb;
declare resolved_order_id uuid;
declare order_fee_bps integer;
declare request_line record;
declare stored_variant_id uuid;
declare resolved_price integer;
declare controls public.commerce_runtime_controls;
declare terms public.commerce_terms_versions;
declare result jsonb;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if cardinality(target_offer_ids) is distinct from cardinality(target_merch_variant_ids) then
    raise exception 'Checkout offer and variant arrays must align.' using errcode='22023';
  end if;

  for request_line in
    select requested.offer_id,requested.merch_variant_id,offer.item_id,offer.offer_type,
      offer.price_cents,variant.display_name,variant.code,variant.sku,
      variant.option_values,variant.price_cents as variant_price_cents,variant.image_url
    from unnest(target_offer_ids,target_merch_variant_ids)
      as requested(offer_id,merch_variant_id)
    left join public.catalog_offers offer on offer.id=requested.offer_id
    left join public.merch_variants variant on variant.id=requested.merch_variant_id
    where offer.id is null
      or (offer.offer_type='physical_purchase' and (
        variant.id is null or variant.item_id<>offer.item_id or variant.status<>'active'
        or not exists(
          select 1 from public.printful_variant_mappings provider_variant
          where provider_variant.merch_variant_id=variant.id
            and provider_variant.status='reviewed'
            and provider_variant.availability_status='active'
        )
      ))
      or (offer.offer_type<>'physical_purchase' and variant.id is not null)
  loop
    raise exception 'One or more checkout variants are unavailable.' using errcode='55000';
  end loop;

  base_result := public.create_stripe_pending_order(
    target_buyer_id,target_offer_ids,target_idempotency_key,target_customer_email
  );
  resolved_order_id := (base_result->>'order_id')::uuid;
  select platform_fee_bps into order_fee_bps
  from public.commerce_orders where id=resolved_order_id for update;

  for request_line in
    select requested.offer_id,requested.merch_variant_id,offer.item_id,offer.offer_type,
      offer.price_cents,variant.display_name,variant.code,variant.sku,
      variant.option_values,variant.price_cents as variant_price_cents,variant.image_url
    from unnest(target_offer_ids,target_merch_variant_ids)
      as requested(offer_id,merch_variant_id)
    join public.catalog_offers offer on offer.id=requested.offer_id
    left join public.merch_variants variant on variant.id=requested.merch_variant_id
  loop
    select merch_variant_id into stored_variant_id
    from public.commerce_order_items
    where order_id=resolved_order_id and offer_id=request_line.offer_id
    for update;
    if stored_variant_id is not null and stored_variant_id is distinct from request_line.merch_variant_id then
      raise exception 'Checkout idempotency key was already used with different variants.' using errcode='22023';
    end if;
    if request_line.merch_variant_id is not null and stored_variant_id is null then
      resolved_price := coalesce(request_line.variant_price_cents,request_line.price_cents);
      update public.commerce_order_items set
        merch_variant_id=request_line.merch_variant_id,
        merch_variant_snapshot=jsonb_build_object(
          'id',request_line.merch_variant_id,
          'code',request_line.code,
          'display_name',request_line.display_name,
          'sku',request_line.sku,
          'option_values',request_line.option_values,
          'price_cents',resolved_price,
          'image_url',request_line.image_url
        ),
        unit_price_cents=resolved_price,
        line_total_cents=resolved_price*quantity,
        platform_fee_cents=floor((resolved_price*quantity)*order_fee_bps/10000.0)::integer
      where order_id=resolved_order_id and offer_id=request_line.offer_id;
    end if;
  end loop;

  update public.commerce_orders orders set
    subtotal_cents=totals.amount,
    total_cents=totals.amount
  from (
    select order_id,sum(line_total_cents)::integer as amount
    from public.commerce_order_items where order_id=resolved_order_id group by order_id
  ) totals
  where orders.id=totals.order_id;

  select * into controls from public.commerce_runtime_controls where singleton;
  select * into terms from public.commerce_terms_versions
  where id=(select terms_version_id from public.commerce_orders where id=resolved_order_id);
  select jsonb_build_object(
    'order_id',orders.id,'currency',orders.currency,'subtotal_cents',orders.subtotal_cents,
    'total_cents',orders.total_cents,'idempotency_key',orders.idempotency_key,
    'shipping_countries',controls.shipping_countries,
    'terms',jsonb_build_object('id',terms.id,'title',terms.title,'version',terms.version,'sha256',terms.body_sha256),
    'lines',coalesce((select jsonb_agg(jsonb_build_object(
      'order_item_id',line.id,'offer_id',line.offer_id,'item_id',line.item_id,
      'merch_variant_id',line.merch_variant_id,'merch_variant',line.merch_variant_snapshot,
      'title',line.item_title,'offer_title',line.offer_title,'unit_price_cents',line.unit_price_cents,
      'currency',line.currency
    ) order by line.id) from public.commerce_order_items line where line.order_id=orders.id),'[]'::jsonb)
  ) into result from public.commerce_orders orders where orders.id=resolved_order_id;
  return result;
end;
$$;

revoke all on function public.create_stripe_pending_order_with_variants(uuid,uuid[],uuid[],text,text) from public,anon,authenticated;
grant execute on function public.create_stripe_pending_order_with_variants(uuid,uuid[],uuid[],text,text) to service_role;

comment on function public.create_stripe_pending_order_with_variants(uuid,uuid[],uuid[],text,text) is
  'Creates a pending Stripe order while validating and snapshotting customer-selected 44OS Merch variants. Provider IDs remain private.';
