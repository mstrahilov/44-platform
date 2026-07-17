begin;

-- M12 Stripe adapter and authoritative commerce lifecycle.
--
-- This migration does not activate checkout, publish a paid offer, seed legal
-- terms, or move money. It adds the durable server-only boundaries needed to
-- test and later activate 44-owned Merch while Beat checkout and creator
-- marketplace payouts remain independently disabled.

alter table public.commerce_runtime_controls
  add column launch_scope text not null default 'owned_merch'
    check (launch_scope in ('owned_merch','marketplace')),
  add column platform_seller_id uuid references public.profiles(id) on delete restrict,
  add column platform_fee_bps integer not null default 0
    check (platform_fee_bps between 0 and 10000),
  add column terms_version_id uuid,
  add column shipping_countries text[] not null default '{}',
  add constraint commerce_runtime_controls_shipping_countries_check
    check (shipping_countries <@ array[
      'US','CA','MX','GB','IE','FR','DE','ES','IT','NL','BE','LU','PT','AT',
      'DK','SE','NO','FI','IS','CH','AU','NZ','JP'
    ]::text[]);

-- The retained launch Merch catalog has one platform owner. Recording that
-- owner is configuration only; every activation switch remains false.
update public.commerce_runtime_controls controls
set platform_seller_id = seller.id
from (
  select min(item.author_id::text)::uuid as id
  from public.catalog_items item
  join public.item_categories category on category.id=item.item_category_id
  where category.slug='merch' and item.status='published'
  having count(distinct item.author_id)=1
) seller
where controls.singleton and controls.platform_seller_id is null;

create table public.commerce_terms_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version text not null,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 20 and 50000),
  body_sha256 text not null check (
    body_sha256 ~ '^[a-f0-9]{64}$'
    and body_sha256=encode(extensions.digest(body,'sha256'),'hex')
  ),
  status text not null default 'draft' check (status in ('draft','active','retired')),
  effective_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(code,version),
  check (status <> 'active' or (effective_at is not null and approved_by is not null))
);
create unique index commerce_terms_one_active_idx
  on public.commerce_terms_versions(code) where status='active';
comment on table public.commerce_terms_versions is
  'Immutable checkout terms, shipping, returns, and refund snapshot authority. No active policy is seeded by M12.';

alter table public.commerce_runtime_controls
  add constraint commerce_runtime_controls_terms_version_fkey
    foreign key (terms_version_id) references public.commerce_terms_versions(id) on delete restrict;

alter table public.commerce_runtime_controls
  drop constraint commerce_runtime_controls_fail_closed,
  add constraint commerce_runtime_controls_fail_closed check (
    not stripe_payments_enabled
    or (
      operating_model_approved_at is not null
      and approved_by is not null
      and platform_seller_id is not null
      and terms_version_id is not null
      and cardinality(shipping_countries)>0
    )
  ),
  add constraint commerce_runtime_controls_checkout_dependencies check (
    not checkout_enabled or stripe_payments_enabled
  );

alter table public.commerce_orders
  drop constraint commerce_orders_status_check,
  add constraint commerce_orders_status_check check (status in (
    'draft','pending_payment','paid','fulfilled','canceled','failed',
    'partially_refunded','refunded','disputed','dispute_lost','legacy_unverified'
  )),
  add column customer_email_snapshot text,
  add column terms_version_id uuid references public.commerce_terms_versions(id) on delete restrict,
  add column terms_sha256 text check (terms_sha256 is null or terms_sha256 ~ '^[a-f0-9]{64}$'),
  add column platform_fee_bps integer not null default 0 check (platform_fee_bps between 0 and 10000),
  add column checkout_expires_at timestamptz,
  add column refunded_cents integer not null default 0 check (refunded_cents >= 0),
  add column disputed_cents integer not null default 0 check (disputed_cents >= 0),
  add column failure_code text,
  add column failure_message text;

alter table public.commerce_order_items
  add column item_snapshot jsonb not null default '{}',
  add column offer_snapshot jsonb not null default '{}',
  add column seller_snapshot jsonb not null default '{}',
  add column entitlement_snapshot jsonb not null default '[]',
  add column terms_snapshot jsonb not null default '{}',
  add column platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0);

alter table public.payment_attempts
  drop constraint payment_attempts_status_check,
  add constraint payment_attempts_status_check check (status in (
    'created','pending','requires_action','succeeded','failed','canceled',
    'partially_refunded','refunded','disputed','dispute_lost'
  )),
  add column provider_session_id text,
  add column provider_charge_id text,
  add column refunded_cents integer not null default 0 check (refunded_cents >= 0),
  add column disputed_cents integer not null default 0 check (disputed_cents >= 0);
create unique index payment_attempts_provider_session_idx
  on public.payment_attempts(provider,provider_session_id)
  where provider_session_id is not null;
create unique index payment_attempts_provider_charge_idx
  on public.payment_attempts(provider,provider_charge_id)
  where provider_charge_id is not null;

create table public.commerce_entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.commerce_order_items(id) on delete restrict,
  entitlement_id uuid not null references public.entitlements(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  entitlement_type text not null check (entitlement_type in ('library_access','download','read','launch','bonus_content')),
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  unique(order_item_id,entitlement_type),
  check ((status='active' and revoked_at is null) or (status='revoked' and revoked_at is not null))
);
create index commerce_entitlement_grants_access_idx
  on public.commerce_entitlement_grants(user_id,item_id,entitlement_type,status);

create table public.commerce_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete restrict,
  provider text not null check (provider='stripe'),
  provider_reference text not null,
  adjustment_type text not null check (adjustment_type in ('refund','dispute','dispute_reversal','dispute_resolution')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending','succeeded','failed','won','lost')),
  reason text,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(provider,provider_reference,adjustment_type)
);
create index commerce_adjustments_order_idx on public.commerce_adjustments(order_id,created_at desc);

create or replace function public.reject_commerce_evidence_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception '% is immutable evidence.',tg_table_name using errcode='55000';
end;
$$;
create or replace function public.protect_commerce_terms_content()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Checkout terms evidence is immutable.' using errcode='55000'; end if;
  if new.id<>old.id or new.code<>old.code or new.version<>old.version or new.title<>old.title
     or new.body<>old.body or new.body_sha256<>old.body_sha256 or new.created_at<>old.created_at then
    raise exception 'Checkout terms content is immutable.' using errcode='55000';
  end if;
  if old.status='retired' or (old.status='active' and new.status not in ('active','retired')) then
    raise exception 'Invalid checkout terms lifecycle.' using errcode='55000';
  end if;
  return new;
end;
$$;
create trigger commerce_terms_versions_immutable before update or delete on public.commerce_terms_versions
for each row execute function public.protect_commerce_terms_content();
create trigger commerce_adjustments_immutable before update or delete on public.commerce_adjustments
for each row execute function public.reject_commerce_evidence_mutation();

alter table public.commerce_terms_versions enable row level security;
alter table public.commerce_entitlement_grants enable row level security;
alter table public.commerce_adjustments enable row level security;
create policy commerce_terms_admin_read on public.commerce_terms_versions for select to authenticated
  using(public.is_platform_admin());
create policy commerce_entitlement_grants_buyer_read on public.commerce_entitlement_grants for select to authenticated
  using(user_id=auth.uid() or public.is_platform_admin());
create policy commerce_adjustments_buyer_read on public.commerce_adjustments for select to authenticated
  using(exists(select 1 from public.commerce_orders orders where orders.id=order_id and (orders.buyer_id=auth.uid() or public.is_platform_admin())));

-- A creator can inspect canonical paid lines and fulfillment addresses for
-- their own products, but cannot author payment or ledger state.
create or replace function public.is_commerce_order_seller(target_order_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select coalesce(auth.role()='service_role',false) or public.is_platform_admin() or exists(
    select 1 from public.commerce_order_items line
    where line.order_id=target_order_id and line.seller_id=auth.uid()
  );
$$;
create policy commerce_orders_seller_read on public.commerce_orders for select to authenticated
  using(public.is_commerce_order_seller(id));
create policy commerce_order_items_seller_read on public.commerce_order_items for select to authenticated
  using(seller_id=auth.uid() or public.is_platform_admin());
create policy commerce_order_addresses_seller_read on public.commerce_order_addresses for select to authenticated
  using(public.is_commerce_order_seller(order_id));

revoke all on public.commerce_terms_versions,public.commerce_entitlement_grants,public.commerce_adjustments from public,anon,authenticated;
grant select on public.commerce_terms_versions,public.commerce_entitlement_grants,public.commerce_adjustments to authenticated;
grant all on public.commerce_terms_versions,public.commerce_entitlement_grants,public.commerce_adjustments to service_role;

create or replace function public.create_stripe_pending_order(
  target_buyer_id uuid,
  target_offer_ids uuid[],
  target_idempotency_key text,
  target_customer_email text
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare controls public.commerce_runtime_controls;
declare terms public.commerce_terms_versions;
declare order_id uuid;
declare offer_count integer;
declare requested_count integer;
declare subtotal integer;
declare order_currency text;
declare result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_buyer_id is null or not exists(select 1 from auth.users where id=target_buyer_id) then
    raise exception 'Authenticated buyer not found.' using errcode='P0002';
  end if;
  if char_length(coalesce(btrim(target_idempotency_key),'')) not between 16 and 200 then
    raise exception 'Invalid checkout idempotency key.' using errcode='22023';
  end if;
  requested_count := cardinality(target_offer_ids);
  if requested_count is null or requested_count<1 or requested_count>20
     or requested_count<>(select count(distinct value) from unnest(target_offer_ids) value) then
    raise exception 'Checkout requires 1 to 20 distinct offers.' using errcode='22023';
  end if;

  select * into controls from public.commerce_runtime_controls where singleton for update;
  if not controls.checkout_enabled or not controls.stripe_payments_enabled
     or controls.operating_model_approved_at is null or controls.platform_seller_id is null
     or controls.terms_version_id is null or cardinality(controls.shipping_countries)=0 then
    raise exception 'Paid checkout is not activated.' using errcode='55000';
  end if;
  select * into terms from public.commerce_terms_versions
  where id=controls.terms_version_id and status='active' and effective_at<=now();
  if not found then raise exception 'Approved checkout terms are not active.' using errcode='55000'; end if;

  select count(*),sum(offer.price_cents),min(offer.currency)
    into offer_count,subtotal,order_currency
  from public.catalog_offers offer
  join public.catalog_items item on item.id=offer.item_id
  where offer.id=any(target_offer_ids)
    and offer.status='active' and offer.price_cents>0 and item.status='published'
    and (offer.starts_at is null or offer.starts_at<=now())
    and (offer.ends_at is null or offer.ends_at>now())
    and (
      controls.launch_scope='marketplace'
      or (item.experience_type='merch' and item.author_id=controls.platform_seller_id and offer.offer_type='physical_purchase')
    )
    and not exists(
      select 1 from public.beat_license_offers beat_offer
      where beat_offer.offer_id=offer.id and not (
        (select checkout_enabled and nonexclusive_pilot_enabled from public.beat_runtime_controls where singleton)
      )
    );
  if offer_count<>requested_count then
    raise exception 'One or more offers are unavailable.' using errcode='55000';
  end if;
  if (select count(distinct offer.currency) from public.catalog_offers offer where offer.id=any(target_offer_ids))<>1 then
    raise exception 'A checkout can contain only one currency.' using errcode='22023';
  end if;

  select id into order_id from public.commerce_orders
  where idempotency_key=target_idempotency_key and buyer_id=target_buyer_id;
  if found then
    select jsonb_build_object(
      'order_id',orders.id,'currency',orders.currency,'subtotal_cents',orders.subtotal_cents,
      'total_cents',orders.total_cents,'idempotency_key',orders.idempotency_key,
      'shipping_countries',controls.shipping_countries,
      'terms',jsonb_build_object('id',terms.id,'title',terms.title,'version',terms.version,'sha256',terms.body_sha256),
      'lines',coalesce((select jsonb_agg(jsonb_build_object(
        'order_item_id',line.id,'offer_id',line.offer_id,'item_id',line.item_id,
        'title',line.item_title,'offer_title',line.offer_title,'unit_price_cents',line.unit_price_cents,
        'currency',line.currency
      ) order by line.id) from public.commerce_order_items line where line.order_id=orders.id),'[]'::jsonb)
    ) into result from public.commerce_orders orders where orders.id=order_id;
    return result;
  end if;

  insert into public.commerce_orders(
    buyer_id,status,currency,subtotal_cents,total_cents,provider,idempotency_key,placed_at,
    customer_email_snapshot,terms_version_id,terms_sha256,platform_fee_bps
  ) values(
    target_buyer_id,'pending_payment',order_currency,subtotal,subtotal,'stripe',target_idempotency_key,now(),
    left(nullif(btrim(target_customer_email),''),320),terms.id,terms.body_sha256,controls.platform_fee_bps
  ) returning id into order_id;

  insert into public.commerce_order_items(
    order_id,offer_id,item_id,seller_id,item_title,offer_title,offer_type,quantity,
    unit_price_cents,line_total_cents,currency,fulfillment_status,
    item_snapshot,offer_snapshot,seller_snapshot,entitlement_snapshot,terms_snapshot,platform_fee_cents
  )
  select order_id,offer.id,item.id,item.author_id,item.title,offer.title,offer.offer_type,1,
    offer.price_cents,offer.price_cents,offer.currency,
    case when offer.fulfillment_type='physical' then 'pending' else 'not_required' end,
    jsonb_build_object(
      'id',item.id,'title',item.title,'slug',item.slug,'experience_type',item.experience_type,
      'fulfillment_type',item.fulfillment_type,'status',item.status
    ),
    jsonb_build_object(
      'id',offer.id,'code',offer.code,'title',offer.title,'description',offer.description,
      'offer_type',offer.offer_type,'fulfillment_type',offer.fulfillment_type,
      'price_cents',offer.price_cents,'currency',offer.currency,'status',offer.status
    ),
    jsonb_build_object(
      'id',item.author_id,'display_name',profile.display_name,'username',profile.username
    ),
    coalesce((select jsonb_agg(entitlement.entitlement_type order by entitlement.entitlement_type)
      from public.offer_entitlements entitlement where entitlement.offer_id=offer.id),'[]'::jsonb),
    jsonb_build_object(
      'id',terms.id,'code',terms.code,'version',terms.version,'title',terms.title,
      'body',terms.body,'sha256',terms.body_sha256,'effective_at',terms.effective_at
    ),
    floor(offer.price_cents*controls.platform_fee_bps/10000.0)::integer
  from public.catalog_offers offer
  join public.catalog_items item on item.id=offer.item_id
  left join public.profiles profile on profile.id=item.author_id
  where offer.id=any(target_offer_ids);

  select jsonb_build_object(
    'order_id',orders.id,'currency',orders.currency,'subtotal_cents',orders.subtotal_cents,
    'total_cents',orders.total_cents,'idempotency_key',orders.idempotency_key,
    'shipping_countries',controls.shipping_countries,
    'terms',jsonb_build_object('id',terms.id,'title',terms.title,'version',terms.version,'sha256',terms.body_sha256),
    'lines',coalesce((select jsonb_agg(jsonb_build_object(
      'order_item_id',line.id,'offer_id',line.offer_id,'item_id',line.item_id,
      'title',line.item_title,'offer_title',line.offer_title,'unit_price_cents',line.unit_price_cents,
      'currency',line.currency
    ) order by line.id) from public.commerce_order_items line where line.order_id=orders.id),'[]'::jsonb)
  ) into result from public.commerce_orders orders where orders.id=order_id;
  return result;
end;
$$;

create or replace function public.bind_stripe_checkout_session(
  target_order_id uuid,target_session_id text,target_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare order_row public.commerce_orders; attempt_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select * into order_row from public.commerce_orders where id=target_order_id for update;
  if not found or order_row.provider<>'stripe' then raise exception 'Stripe order not found.' using errcode='P0002'; end if;
  if order_row.status<>'pending_payment' then raise exception 'Order is not awaiting payment.' using errcode='55000'; end if;
  update public.commerce_orders set provider_order_id=target_session_id,checkout_expires_at=target_expires_at
  where id=target_order_id;
  insert into public.payment_attempts(
    order_id,provider,provider_session_id,idempotency_key,status,amount_cents,currency
  ) values(target_order_id,'stripe',target_session_id,order_row.idempotency_key,'pending',order_row.total_cents,order_row.currency)
  on conflict(provider,idempotency_key) do update set
    provider_session_id=excluded.provider_session_id,status='pending',updated_at=now()
  returning id into attempt_id;
  return attempt_id;
end;
$$;

create or replace function public.refresh_paid_entitlement(
  target_user_id uuid,target_item_id uuid,target_entitlement_type text,target_reason text
) returns void language plpgsql security definer set search_path=public as $$
declare entitlement_row public.entitlements; active_grant public.commerce_entitlement_grants; previous_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select * into active_grant from public.commerce_entitlement_grants
  where user_id=target_user_id and item_id=target_item_id and entitlement_type=target_entitlement_type and status='active'
  order by granted_at desc limit 1;
  select * into entitlement_row from public.entitlements
  where user_id=target_user_id and item_id=target_item_id and entitlement_type=target_entitlement_type for update;
  previous_status:=entitlement_row.status;
  if active_grant.id is not null then
    insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at)
    values(target_user_id,target_item_id,target_entitlement_type,'active','order',active_grant.order_item_id,now(),null)
    on conflict(user_id,item_id,entitlement_type) do update set status='active',source_type='order',source_id=active_grant.order_item_id,revoked_at=null,expires_at=null
    returning * into entitlement_row;
    if previous_status is distinct from 'active' then
      insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
      values(entitlement_row.id,target_user_id,target_item_id,target_entitlement_type,
        case when previous_status is null then 'grant' else 'restore' end,'order',active_grant.order_item_id,target_reason);
    end if;
  elsif entitlement_row.id is not null and entitlement_row.source_type='order' and entitlement_row.status='active' then
    update public.entitlements set status='revoked',revoked_at=now() where id=entitlement_row.id;
    insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
    values(entitlement_row.id,target_user_id,target_item_id,target_entitlement_type,'revoke','order',entitlement_row.source_id,target_reason);
  end if;
end;
$$;

create or replace function public.record_creator_earnings_adjustment(
  target_order_id uuid,target_event_id text,target_entry_type text,
  target_amount_cents integer,target_sign integer
) returns integer language plpgsql security definer set search_path=public as $$
declare inserted_total integer;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_entry_type not in ('refund','dispute','adjustment') or target_amount_cents<0 or target_sign not in (-1,1) then
    raise exception 'Invalid creator earnings adjustment.' using errcode='22023';
  end if;
  if target_amount_cents=0 then return 0; end if;
  with eligible as (
    select line.*,
      row_number() over(order by line.id) as row_number,
      count(*) over() as row_count,
      floor(target_amount_cents::numeric*line.line_total_cents/greatest(sum(line.line_total_cents) over(),1))::integer as base_amount
    from public.commerce_order_items line
    where line.order_id=target_order_id and line.seller_id is not null
  ), allocated as (
    select eligible.*,
      base_amount+case when row_number=row_count then target_amount_cents-sum(base_amount) over() else 0 end as allocated_amount
    from eligible
  ), inserted as (
    insert into public.creator_earnings_entries(
      creator_id,order_item_id,entry_type,amount_cents,currency,source_provider,source_reference,metadata
    )
    select allocated.seller_id,allocated.id,target_entry_type,target_sign*allocated.allocated_amount,
      allocated.currency,'stripe',allocated.id||':'||target_event_id||':'||target_entry_type,
      jsonb_build_object('order_id',target_order_id,'provider_event_id',target_event_id)
    from allocated where allocated.allocated_amount>0
    on conflict do nothing returning abs(amount_cents)::integer as amount_cents
  ) select coalesce(sum(amount_cents),0)::integer into inserted_total from inserted;
  return inserted_total;
end;
$$;

create or replace function public.process_stripe_webhook_event(
  target_event_id text,target_event_type text,target_data jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare inserted_event uuid; resolved_order_id uuid; order_row public.commerce_orders; attempt public.payment_attempts;
declare amount_subtotal integer; amount_total integer; amount_tax integer; amount_shipping integer;
declare amount_refunded integer; refund_delta integer; dispute_amount integer; event_currency text;
declare earnings_amount integer; prior_earnings_adjustments integer; dispute_earnings_amount integer;
declare line record; entitlement_kind text; entitlement_row public.entitlements; grant_row public.commerce_entitlement_grants;
declare dispute_status text; dispute_outcome text; adjustment_reference text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if char_length(coalesce(target_event_id,'')) not between 3 and 255
     or char_length(coalesce(target_event_type,'')) not between 3 and 255 then
    raise exception 'Invalid Stripe event envelope.' using errcode='22023';
  end if;

  insert into public.provider_webhook_events(
    provider,provider_event_id,event_type,signature_verified,processing_status,payload
  ) values('stripe',target_event_id,target_event_type,true,'received',coalesce(target_data,'{}'))
  on conflict(provider,provider_event_id) do update set
    event_type=excluded.event_type,signature_verified=true,processing_status='received',
    payload=excluded.payload,processed_at=null,error_message=null
  where public.provider_webhook_events.processing_status='failed'
  returning id into inserted_event;
  if inserted_event is null then
    return jsonb_build_object('duplicate',true,'event_id',target_event_id);
  end if;

  begin
  begin
    resolved_order_id:=nullif(target_data->>'order_id','')::uuid;
  exception when invalid_text_representation then
    resolved_order_id:=null;
  end;
  if resolved_order_id is null then
    select payment.* into attempt from public.payment_attempts payment
    where payment.provider='stripe' and (
      payment.provider_session_id=nullif(target_data->>'checkout_session_id','')
      or payment.provider_payment_id=nullif(target_data->>'payment_intent_id','')
      or payment.provider_charge_id=nullif(target_data->>'charge_id','')
    ) order by payment.created_at desc limit 1;
    resolved_order_id:=attempt.order_id;
  end if;
  select * into order_row from public.commerce_orders orders where orders.id=resolved_order_id for update;
  if not found then raise exception 'Stripe event order not found.' using errcode='P0002'; end if;
  if attempt.id is null then
    select * into attempt from public.payment_attempts payment where payment.order_id=resolved_order_id and payment.provider='stripe'
    order by payment.created_at desc limit 1 for update;
  end if;
  event_currency:=upper(coalesce(nullif(target_data->>'currency',''),order_row.currency));
  if event_currency<>order_row.currency then raise exception 'Stripe event currency mismatch.' using errcode='22000'; end if;

  if target_event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded') then
    amount_subtotal:=coalesce((target_data->>'amount_subtotal')::integer,0);
    amount_total:=coalesce((target_data->>'amount_total')::integer,0);
    amount_tax:=coalesce((target_data->>'amount_tax')::integer,0);
    amount_shipping:=coalesce((target_data->>'amount_shipping')::integer,0);
    if target_data->>'payment_status'<>'paid' then
      update public.provider_webhook_events set processing_status='ignored',processed_at=now() where id=inserted_event;
      return jsonb_build_object('processed',false,'reason','payment_not_paid','order_id',resolved_order_id);
    end if;
    if amount_subtotal<>order_row.subtotal_cents or amount_total<>amount_subtotal+amount_tax+amount_shipping then
      raise exception 'Stripe totals do not match the durable order.' using errcode='22000';
    end if;
    update public.commerce_orders set
      status=case when status in ('refunded','disputed','dispute_lost') then status else 'paid' end,
      tax_cents=amount_tax,shipping_cents=amount_shipping,total_cents=amount_total,
      provider_order_id=coalesce(nullif(target_data->>'checkout_session_id',''),provider_order_id),
      paid_at=coalesce(paid_at,now()),failure_code=null,failure_message=null
    where id=resolved_order_id returning * into order_row;
    update public.payment_attempts set
      provider_session_id=coalesce(nullif(target_data->>'checkout_session_id',''),provider_session_id),
      provider_payment_id=coalesce(nullif(target_data->>'payment_intent_id',''),provider_payment_id),
      provider_charge_id=coalesce(nullif(target_data->>'charge_id',''),provider_charge_id),
      status=case when status in ('refunded','disputed','dispute_lost') then status else 'succeeded' end,
      amount_cents=amount_total,succeeded_at=coalesce(succeeded_at,now()),failure_code=null,failure_message=null
    where id=attempt.id returning * into attempt;
    if order_row.status='paid' then
      if target_data->'address' is not null and coalesce(target_data#>>'{address,line1}','')<>'' then
        insert into public.commerce_order_addresses(
          order_id,recipient_name,address_line_1,address_line_2,city,region,postal_code,country_code,delivery_notes
        ) values(
          resolved_order_id,left(coalesce(target_data#>>'{address,name}',''),200),left(target_data#>>'{address,line1}',300),
          left(nullif(target_data#>>'{address,line2}',''),300),left(coalesce(target_data#>>'{address,city}',''),160),
          left(coalesce(target_data#>>'{address,state}',''),160),left(coalesce(target_data#>>'{address,postal_code}',''),40),
          upper(left(coalesce(target_data#>>'{address,country}',''),2)),null
        ) on conflict(order_id) do update set
          recipient_name=excluded.recipient_name,address_line_1=excluded.address_line_1,
          address_line_2=excluded.address_line_2,city=excluded.city,region=excluded.region,
          postal_code=excluded.postal_code,country_code=excluded.country_code;
      end if;
      for line in select * from public.commerce_order_items order_line where order_line.order_id=resolved_order_id loop
        if line.seller_id is not null then
          insert into public.creator_earnings_entries(
            creator_id,order_item_id,entry_type,amount_cents,currency,source_provider,source_reference,available_at,metadata
          ) values(line.seller_id,line.id,'sale',line.line_total_cents,line.currency,'stripe',line.id||':sale',now()+interval '7 days',jsonb_build_object('order_id',resolved_order_id,'provider_event_id',target_event_id))
          on conflict do nothing;
          if line.platform_fee_cents>0 then
            insert into public.creator_earnings_entries(
              creator_id,order_item_id,entry_type,amount_cents,currency,source_provider,source_reference,available_at,metadata
            ) values(line.seller_id,line.id,'platform_fee',-line.platform_fee_cents,line.currency,'stripe',line.id||':platform_fee',now()+interval '7 days',jsonb_build_object('order_id',resolved_order_id,'provider_event_id',target_event_id))
            on conflict do nothing;
          end if;
        end if;
        for entitlement_kind in select jsonb_array_elements_text(line.entitlement_snapshot) loop
          insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at)
          values(order_row.buyer_id,line.item_id,entitlement_kind,'active','order',line.id,now(),null)
          on conflict(user_id,item_id,entitlement_type) do update set
            status='active',source_type='order',source_id=line.id,revoked_at=null,expires_at=null
          returning * into entitlement_row;
          insert into public.commerce_entitlement_grants(order_item_id,entitlement_id,user_id,item_id,entitlement_type,status)
          values(line.id,entitlement_row.id,order_row.buyer_id,line.item_id,entitlement_kind,'active')
          on conflict(order_item_id,entitlement_type) do update set status='active',revoked_at=null,revoked_reason=null
          returning * into grant_row;
          if not exists(select 1 from public.entitlement_events event where event.entitlement_id=entitlement_row.id and event.source_type='order' and event.source_id=line.id and event.operation in ('grant','restore')) then
            insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
            values(entitlement_row.id,order_row.buyer_id,line.item_id,entitlement_kind,'grant','order',line.id,'Stripe payment confirmed');
          end if;
          insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at)
          values(order_row.buyer_id,line.item_id,'purchase','visible',now())
          on conflict(user_id,item_id) do update set acquisition_type='purchase',status='visible';
        end loop;
      end loop;
    end if;
  elsif target_event_type in ('checkout.session.expired','checkout.session.async_payment_failed','payment_intent.payment_failed') then
    if order_row.status in ('draft','pending_payment') then
      update public.commerce_orders set
        status=case when target_event_type='checkout.session.expired' then 'canceled' else 'failed' end,
        canceled_at=case when target_event_type='checkout.session.expired' then now() else canceled_at end,
        failure_code=left(nullif(target_data->>'failure_code',''),120),
        failure_message=left(nullif(target_data->>'failure_message',''),500)
      where id=resolved_order_id;
      update public.payment_attempts set
        status=case when target_event_type='checkout.session.expired' then 'canceled' else 'failed' end,
        failure_code=left(nullif(target_data->>'failure_code',''),120),
        failure_message=left(nullif(target_data->>'failure_message',''),500)
      where id=attempt.id;
    end if;
  elsif target_event_type in ('charge.refunded','refund.created') then
    amount_refunded:=greatest(0,coalesce((target_data->>'amount_refunded')::integer,(target_data->>'amount')::integer,0));
    refund_delta:=greatest(0,amount_refunded-order_row.refunded_cents);
    adjustment_reference:=coalesce(nullif(target_data->>'refund_id',''),nullif(target_data->>'charge_id',''),target_event_id);
    if refund_delta>0 then
      insert into public.commerce_adjustments(order_id,payment_attempt_id,provider,provider_reference,adjustment_type,amount_cents,currency,status,reason,evidence)
      values(resolved_order_id,attempt.id,'stripe',adjustment_reference,'refund',refund_delta,event_currency,'succeeded',left(nullif(target_data->>'reason',''),300),jsonb_build_object('event_id',target_event_id,'cumulative_refunded_cents',amount_refunded))
      on conflict do nothing;
      update public.commerce_orders set refunded_cents=amount_refunded,
        status=case when amount_refunded>=total_cents then 'refunded' else 'partially_refunded' end
      where id=resolved_order_id returning * into order_row;
      update public.payment_attempts set refunded_cents=amount_refunded,
        status=case when amount_refunded>=amount_cents then 'refunded' else 'partially_refunded' end
      where id=attempt.id;
      select coalesce(-sum(entry.amount_cents),0)::integer into prior_earnings_adjustments
      from public.creator_earnings_entries entry
      join public.commerce_order_items order_line on order_line.id=entry.order_item_id
      where order_line.order_id=resolved_order_id and entry.entry_type='refund';
      earnings_amount:=least(refund_delta,greatest(0,order_row.subtotal_cents-prior_earnings_adjustments));
      perform public.record_creator_earnings_adjustment(resolved_order_id,adjustment_reference,'refund',earnings_amount,-1);
      if amount_refunded>=order_row.total_cents then
        update public.commerce_entitlement_grants set status='revoked',revoked_at=now(),revoked_reason='Stripe refund'
        where order_item_id in (select order_line.id from public.commerce_order_items order_line where order_line.order_id=resolved_order_id) and status='active';
        for line in select distinct grant_source.user_id,grant_source.item_id,grant_source.entitlement_type from public.commerce_entitlement_grants grant_source where grant_source.order_item_id in (select order_line.id from public.commerce_order_items order_line where order_line.order_id=resolved_order_id) loop
          perform public.refresh_paid_entitlement(line.user_id,line.item_id,line.entitlement_type,'Stripe refund');
        end loop;
        update public.commerce_order_items set fulfillment_status=case when fulfillment_status in ('pending','in_progress') then 'canceled' else fulfillment_status end where commerce_order_items.order_id=resolved_order_id;
      end if;
    end if;
  elsif target_event_type='charge.dispute.created' then
    dispute_amount:=greatest(1,coalesce((target_data->>'dispute_amount')::integer,order_row.total_cents));
    adjustment_reference:=coalesce(nullif(target_data->>'dispute_id',''),target_event_id);
    insert into public.commerce_adjustments(order_id,payment_attempt_id,provider,provider_reference,adjustment_type,amount_cents,currency,status,reason,evidence)
    values(resolved_order_id,attempt.id,'stripe',adjustment_reference,'dispute',dispute_amount,event_currency,'pending',left(nullif(target_data->>'reason',''),300),jsonb_build_object('event_id',target_event_id))
    on conflict do nothing;
    update public.commerce_orders set status='disputed',disputed_cents=greatest(disputed_cents,dispute_amount) where id=resolved_order_id;
    update public.payment_attempts set status='disputed',disputed_cents=greatest(disputed_cents,dispute_amount) where id=attempt.id;
    update public.commerce_entitlement_grants set status='revoked',revoked_at=now(),revoked_reason='Stripe dispute'
    where order_item_id in (select order_line.id from public.commerce_order_items order_line where order_line.order_id=resolved_order_id) and status='active';
    for line in select distinct grant_source.user_id,grant_source.item_id,grant_source.entitlement_type from public.commerce_entitlement_grants grant_source where grant_source.order_item_id in (select order_line.id from public.commerce_order_items order_line where order_line.order_id=resolved_order_id) loop
      perform public.refresh_paid_entitlement(line.user_id,line.item_id,line.entitlement_type,'Stripe dispute');
    end loop;
    dispute_earnings_amount:=least(dispute_amount,order_row.subtotal_cents);
    perform public.record_creator_earnings_adjustment(resolved_order_id,adjustment_reference,'dispute',dispute_earnings_amount,-1);
  elsif target_event_type in ('charge.dispute.closed','charge.dispute.funds_reinstated') then
    dispute_status:=lower(coalesce(target_data->>'dispute_status',''));
    dispute_outcome:=lower(coalesce(target_data->>'dispute_outcome',''));
    adjustment_reference:=coalesce(nullif(target_data->>'dispute_id',''),target_event_id);
    if target_event_type='charge.dispute.funds_reinstated' or dispute_status='won' or dispute_outcome='won' then
      dispute_amount:=greatest(1,order_row.disputed_cents);
      insert into public.commerce_adjustments(order_id,payment_attempt_id,provider,provider_reference,adjustment_type,amount_cents,currency,status,evidence)
      values(resolved_order_id,attempt.id,'stripe',adjustment_reference||':reversal','dispute_reversal',dispute_amount,event_currency,'won',jsonb_build_object('event_id',target_event_id))
      on conflict do nothing;
      update public.commerce_orders set disputed_cents=0,status=case when refunded_cents=0 then 'paid' when refunded_cents<total_cents then 'partially_refunded' else 'refunded' end where id=resolved_order_id returning * into order_row;
      update public.payment_attempts set disputed_cents=0,status=case when refunded_cents=0 then 'succeeded' when refunded_cents<amount_cents then 'partially_refunded' else 'refunded' end where id=attempt.id;
      if order_row.status<>'refunded' then
        update public.commerce_entitlement_grants set status='active',revoked_at=null,revoked_reason=null
        where order_item_id in (select order_line.id from public.commerce_order_items order_line where order_line.order_id=resolved_order_id) and revoked_reason='Stripe dispute';
        for line in select distinct grant_source.user_id,grant_source.item_id,grant_source.entitlement_type from public.commerce_entitlement_grants grant_source where grant_source.order_item_id in (select order_line.id from public.commerce_order_items order_line where order_line.order_id=resolved_order_id) loop
          perform public.refresh_paid_entitlement(line.user_id,line.item_id,line.entitlement_type,'Stripe dispute won');
        end loop;
      end if;
      perform public.record_creator_earnings_adjustment(resolved_order_id,adjustment_reference||':reversal','adjustment',least(dispute_amount,order_row.subtotal_cents),1);
    else
      insert into public.commerce_adjustments(order_id,payment_attempt_id,provider,provider_reference,adjustment_type,amount_cents,currency,status,evidence)
      values(resolved_order_id,attempt.id,'stripe',adjustment_reference||':resolution','dispute_resolution',greatest(1,order_row.disputed_cents),event_currency,'lost',jsonb_build_object('event_id',target_event_id))
      on conflict do nothing;
      update public.commerce_orders set status='dispute_lost' where id=resolved_order_id;
      update public.payment_attempts set status='dispute_lost' where id=attempt.id;
    end if;
  else
    update public.provider_webhook_events set processing_status='ignored',processed_at=now() where id=inserted_event;
    return jsonb_build_object('processed',false,'reason','unsupported_event','order_id',order_id);
  end if;

  insert into public.payment_events(provider,provider_event_id,event_type,order_id,payment_attempt_id,processing_status,payload,processed_at)
  values('stripe',target_event_id,target_event_type,resolved_order_id,attempt.id,'processed',coalesce(target_data,'{}'),now())
  on conflict(provider,provider_event_id) do nothing;
  update public.provider_webhook_events set processing_status='processed',processed_at=now() where id=inserted_event;
  return jsonb_build_object('processed',true,'duplicate',false,'order_id',resolved_order_id,'status',(select status from public.commerce_orders where id=resolved_order_id));
exception when others then
  if inserted_event is not null then
    update public.provider_webhook_events set processing_status='failed',processed_at=now(),error_message=left(sqlerrm,500) where id=inserted_event;
  end if;
  return jsonb_build_object('processed',false,'duplicate',false,'retryable',true,'event_id',target_event_id,'error',left(sqlerrm,500));
  end;
end;
$$;

create or replace function public.update_creator_order_fulfillment(
  target_order_item_id uuid,target_status text
) returns void language plpgsql security definer set search_path=public as $$
declare line public.commerce_order_items; order_status text;
begin
  if target_status not in ('in_progress','fulfilled','returned') then raise exception 'Invalid fulfillment status.' using errcode='22023'; end if;
  select * into line from public.commerce_order_items where id=target_order_item_id for update;
  if not found then raise exception 'Order line not found.' using errcode='P0002'; end if;
  if auth.uid() is null or (line.seller_id<>auth.uid() and not public.is_platform_admin()) then raise exception 'Seller access required.' using errcode='42501'; end if;
  select status into order_status from public.commerce_orders where id=line.order_id;
  if order_status not in ('paid','fulfilled','partially_refunded') then raise exception 'Payment state does not allow fulfillment.' using errcode='55000'; end if;
  update public.commerce_order_items set fulfillment_status=target_status where id=target_order_item_id;
  if not exists(select 1 from public.commerce_order_items where order_id=line.order_id and fulfillment_status not in ('fulfilled','not_required')) then
    update public.commerce_orders set status='fulfilled' where id=line.order_id and status='paid';
  end if;
end;
$$;

create or replace function public.get_admin_commerce_diagnostics()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare controls public.commerce_runtime_controls;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  select * into controls from public.commerce_runtime_controls where singleton;
  return jsonb_build_object(
    'checkout_enabled',controls.checkout_enabled,
    'stripe_payments_enabled',controls.stripe_payments_enabled,
    'operating_model_approved',controls.operating_model_approved_at is not null,
    'platform_seller_configured',controls.platform_seller_id is not null,
    'active_terms_configured',exists(select 1 from public.commerce_terms_versions terms where terms.id=controls.terms_version_id and terms.status='active'),
    'shipping_countries_configured',cardinality(controls.shipping_countries)>0,
    'active_paid_offer_count',(select count(*) from public.catalog_offers where status='active' and price_cents>0),
    'pending_order_count',(select count(*) from public.commerce_orders where status='pending_payment'),
    'failed_order_count',(select count(*) from public.commerce_orders where status in ('failed','disputed','dispute_lost')),
    'failed_webhook_count',(select count(*) from public.provider_webhook_events where provider='stripe' and processing_status='failed'),
    'reconciliation_mismatch_count',(select coalesce(sum(mismatch_count),0) from public.commerce_reconciliation_runs where provider='stripe' and status='mismatched')
  );
end;
$$;

revoke all on function public.reject_commerce_evidence_mutation(),public.protect_commerce_terms_content(),public.is_commerce_order_seller(uuid),
  public.create_stripe_pending_order(uuid,uuid[],text,text),
  public.bind_stripe_checkout_session(uuid,text,timestamptz),
  public.refresh_paid_entitlement(uuid,uuid,text,text),
  public.record_creator_earnings_adjustment(uuid,text,text,integer,integer),
  public.process_stripe_webhook_event(text,text,jsonb),
  public.update_creator_order_fulfillment(uuid,text),
  public.get_admin_commerce_diagnostics()
from public,anon,authenticated;
grant execute on function public.is_commerce_order_seller(uuid) to authenticated,service_role;
grant execute on function public.create_stripe_pending_order(uuid,uuid[],text,text),
  public.bind_stripe_checkout_session(uuid,text,timestamptz),
  public.refresh_paid_entitlement(uuid,uuid,text,text),
  public.record_creator_earnings_adjustment(uuid,text,text,integer,integer),
  public.process_stripe_webhook_event(text,text,jsonb)
to service_role;
grant execute on function public.update_creator_order_fulfillment(uuid,text),public.get_admin_commerce_diagnostics()
to authenticated,service_role;

comment on function public.create_stripe_pending_order(uuid,uuid[],text,text) is
  'Service-only durable order creation. Reprices active offers and snapshots exact Item, seller, entitlement, and legal terms before Stripe redirect.';
comment on function public.process_stripe_webhook_event(text,text,jsonb) is
  'Service-only idempotent Stripe finalizer. The server route verifies the Stripe signature before calling this transaction.';

commit;
