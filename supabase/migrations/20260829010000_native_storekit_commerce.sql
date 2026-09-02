begin;

-- Native StoreKit commerce is a provider adapter over the existing canonical
-- order, entitlement, Library, and Beat-license ledgers. Apple product records
-- are configuration, not authority: only a verified signed transaction may
-- call the fulfillment function below.

create table public.native_storekit_product_mappings (
  product_id text primary key check (
    char_length(product_id) <= 100
    and product_id ~ '^com\.fortyfour\.os44\.(item|offer)\.[0-9a-f]{32}$'
  ),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  identifier_scope text not null check (identifier_scope in ('item','offer')),
  tier_code text check (tier_code is null or tier_code in ('basic','premium','trackout')),
  app_store_resource_id text,
  apple_state text,
  approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','disabled')),
  available_for_sale boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id),
  constraint native_storekit_product_identifier_matches_scope check (
    product_id = case identifier_scope
      when 'item' then 'com.fortyfour.os44.item.' || replace(item_id::text,'-','')
      when 'offer' then 'com.fortyfour.os44.offer.' || replace(offer_id::text,'-','')
    end
  ),
  constraint native_storekit_product_approval_complete check (
    approval_status <> 'approved'
    or (
      upper(coalesce(apple_state,'')) = 'APPROVED'
      and available_for_sale
      and approved_at is not null
      and approved_by is not null
    )
  )
);

create unique index native_storekit_item_scope_mapping_idx
  on public.native_storekit_product_mappings(item_id)
  where identifier_scope='item';

create index native_storekit_mapping_approval_idx
  on public.native_storekit_product_mappings(approval_status,available_for_sale,item_id);

create trigger native_storekit_product_mappings_touch_updated_at
before update on public.native_storekit_product_mappings
for each row execute function public.touch_content_updated_at();

create table public.native_storekit_purchase_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  client_offer_id uuid references public.catalog_offers(id) on delete restrict,
  product_id text not null references public.native_storekit_product_mappings(product_id) on delete restrict,
  tier_code text check (tier_code is null or tier_code in ('basic','premium','trackout')),
  terms_sha256 text check (terms_sha256 is null or terms_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'issued' check (status in ('issued','consumed','expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint native_storekit_purchase_intent_expiry check (expires_at > created_at),
  constraint native_storekit_purchase_intent_consumption check (
    (status='consumed' and consumed_at is not null)
    or (status<>'consumed' and consumed_at is null)
  )
);

create index native_storekit_purchase_intents_user_idx
  on public.native_storekit_purchase_intents(user_id,created_at desc);
create index native_storekit_purchase_intents_expiry_idx
  on public.native_storekit_purchase_intents(status,expires_at);

create table public.native_storekit_transactions (
  transaction_id text primary key check (transaction_id ~ '^[0-9]{1,40}$'),
  original_transaction_id text not null check (original_transaction_id ~ '^[0-9]{1,40}$'),
  product_id text not null references public.native_storekit_product_mappings(product_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  app_account_token uuid not null,
  environment text not null check (environment in ('Production','Sandbox','Xcode','LocalTesting')),
  storefront text,
  storefront_id text,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  price_milliunits bigint check (price_milliunits is null or price_milliunits >= 0),
  purchase_date timestamptz not null,
  original_purchase_date timestamptz,
  signed_date timestamptz,
  revocation_date timestamptz,
  revocation_reason integer,
  jws_sha256 text not null check (jws_sha256 ~ '^[0-9a-f]{64}$'),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (original_transaction_id),
  constraint native_storekit_transaction_account check (user_id=app_account_token),
  constraint native_storekit_transaction_revocation check (
    (status='active' and revocation_date is null)
    or (status='revoked' and revocation_date is not null)
  )
);

create index native_storekit_transactions_user_idx
  on public.native_storekit_transactions(user_id,purchase_date desc);
create index native_storekit_transactions_order_idx
  on public.native_storekit_transactions(order_id);

create trigger native_storekit_transactions_touch_updated_at
before update on public.native_storekit_transactions
for each row execute function public.touch_content_updated_at();

create table public.native_storekit_notification_events (
  notification_uuid uuid primary key,
  notification_type text not null,
  subtype text,
  environment text check (environment is null or environment in ('Production','Sandbox','Xcode','LocalTesting')),
  transaction_id text,
  original_transaction_id text,
  signed_payload_sha256 text not null check (signed_payload_sha256 ~ '^[0-9a-f]{64}$'),
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index native_storekit_notification_events_status_idx
  on public.native_storekit_notification_events(processing_status,received_at);

alter table public.native_storekit_product_mappings enable row level security;
alter table public.native_storekit_purchase_intents enable row level security;
alter table public.native_storekit_transactions enable row level security;
alter table public.native_storekit_notification_events enable row level security;

create or replace function public.upsert_native_storekit_product_mapping_v1(
  target_product_id text,
  target_item_id uuid,
  target_offer_id uuid,
  target_identifier_scope text,
  target_tier_code text default null,
  target_app_store_resource_id text default null,
  target_apple_state text default null,
  target_approval_status text default 'pending',
  target_available_for_sale boolean default false,
  target_approved_by uuid default null
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  offer_row public.catalog_offers;
  mapping_row public.native_storekit_product_mappings;
  expected_product_id text;
  actual_tier text;
  approval_time timestamptz;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_identifier_scope is null or target_identifier_scope not in ('item','offer')
    or target_approval_status is null or target_approval_status not in ('pending','approved','disabled')
    or target_available_for_sale is null then
    raise exception 'Invalid StoreKit mapping state.' using errcode='22023';
  end if;

  select * into offer_row from public.catalog_offers
  where id=target_offer_id and item_id=target_item_id;
  if not found or offer_row.offer_type not in ('digital_download','beat_license')
    or offer_row.fulfillment_type not in ('entitlement','license') then
    raise exception 'A canonical paid digital offer is required.' using errcode='P0002';
  end if;

  expected_product_id:=case target_identifier_scope
    when 'item' then 'com.fortyfour.os44.item.'||replace(target_item_id::text,'-','')
    else 'com.fortyfour.os44.offer.'||replace(target_offer_id::text,'-','')
  end;
  if target_product_id is distinct from expected_product_id then
    raise exception 'StoreKit product identifier does not match the canonical mapping.' using errcode='22023';
  end if;

  if offer_row.offer_type='beat_license' then
    select template.tier_code into actual_tier
    from public.beat_license_offers beat_offer
    join public.beat_license_templates template on template.id=beat_offer.template_id
    where beat_offer.offer_id=offer_row.id;
    if actual_tier not in ('basic','premium','trackout')
      or target_identifier_scope<>'offer'
      or target_tier_code is distinct from actual_tier then
      raise exception 'StoreKit Beat mapping does not match its approved license tier.' using errcode='22023';
    end if;
  elsif target_identifier_scope<>'item' or target_tier_code is not null then
    raise exception 'StoreKit digital-download mappings must use the Item identifier.' using errcode='22023';
  end if;

  if target_approval_status='approved' and (
    upper(coalesce(target_apple_state,''))<>'APPROVED'
    or not target_available_for_sale
    or target_approved_by is null
  ) then
    raise exception 'Apple approval evidence is incomplete.' using errcode='23514';
  end if;

  select * into mapping_row from public.native_storekit_product_mappings
  where product_id=target_product_id for update;
  if found and (
    mapping_row.item_id<>target_item_id
    or mapping_row.offer_id<>target_offer_id
    or mapping_row.identifier_scope<>target_identifier_scope
  ) then
    raise exception 'A StoreKit product identifier cannot be remapped.' using errcode='55000';
  end if;

  approval_time:=case when target_approval_status='approved'
    then coalesce(mapping_row.approved_at,now()) else null end;

  insert into public.native_storekit_product_mappings(
    product_id,item_id,offer_id,identifier_scope,tier_code,app_store_resource_id,
    apple_state,approval_status,available_for_sale,approved_at,approved_by
  ) values(
    target_product_id,target_item_id,target_offer_id,target_identifier_scope,actual_tier,
    nullif(btrim(target_app_store_resource_id),''),upper(nullif(btrim(target_apple_state),'')),
    target_approval_status,target_available_for_sale,approval_time,
    case when target_approval_status='approved' then target_approved_by else null end
  )
  on conflict(product_id) do update set
    tier_code=excluded.tier_code,
    app_store_resource_id=excluded.app_store_resource_id,
    apple_state=excluded.apple_state,
    approval_status=excluded.approval_status,
    available_for_sale=excluded.available_for_sale,
    approved_at=excluded.approved_at,
    approved_by=excluded.approved_by
  returning * into mapping_row;

  return jsonb_build_object(
    'product_id',mapping_row.product_id,
    'item_id',mapping_row.item_id,
    'offer_id',mapping_row.offer_id,
    'identifier_scope',mapping_row.identifier_scope,
    'tier_code',mapping_row.tier_code,
    'apple_state',mapping_row.apple_state,
    'approval_status',mapping_row.approval_status,
    'available_for_sale',mapping_row.available_for_sale
  );
end;
$$;

create or replace function public.prepare_native_storekit_purchase_intent_v1(
  target_user_id uuid,
  target_item_id uuid,
  target_offer_id uuid default null,
  target_tier_code text default null,
  target_terms_sha256 text default null
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  item_row public.catalog_items;
  offer_row public.catalog_offers;
  mapping_row public.native_storekit_product_mappings;
  template_row public.beat_license_templates;
  intent_row public.native_storekit_purchase_intents;
  active_offer_count integer;
  resolved_offer_id uuid;
  scope_name text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_user_id is null or target_item_id is null then
    raise exception 'A buyer and Item are required.' using errcode='22023';
  end if;

  select * into item_row from public.catalog_items where id=target_item_id;
  if not found or item_row.status<>'published'
    or item_row.experience_type not in ('music','book','asset')
    or item_row.fulfillment_type not in ('digital','hybrid')
    or not item_row.download_purchase_enabled
    or not public.is_creator_paid_sales_enabled(item_row.author_id) then
    raise exception 'This Item is not available for paid digital purchase.' using errcode='55000';
  end if;

  if target_offer_id is null then
    select count(*)::integer,min(offer.id) into active_offer_count,resolved_offer_id
    from public.catalog_offers offer
    where offer.item_id=target_item_id
      and offer.offer_type='digital_download'
      and offer.fulfillment_type='entitlement'
      and offer.status='active'
      and offer.price_cents>0
      and (offer.starts_at is null or offer.starts_at<=now())
      and (offer.ends_at is null or offer.ends_at>now());
    if active_offer_count<>1 then
      raise exception 'This Item does not have one approved digital offer.' using errcode='55000';
    end if;
    select * into offer_row from public.catalog_offers where id=resolved_offer_id;
    scope_name:='item';
  else
    select * into offer_row from public.catalog_offers offer
    where offer.id=target_offer_id
      and offer.item_id=target_item_id
      and offer.offer_type='beat_license'
      and offer.fulfillment_type='license'
      and offer.status='active'
      and offer.price_cents>0
      and (offer.starts_at is null or offer.starts_at<=now())
      and (offer.ends_at is null or offer.ends_at>now());
    if not found then
      raise exception 'This paid digital offer is unavailable.' using errcode='55000';
    end if;
    scope_name:='offer';
  end if;

  if offer_row.offer_type='beat_license' then
    if not coalesce((
      select controls.catalog_enabled and controls.publishing_enabled
        and controls.checkout_enabled and controls.nonexclusive_pilot_enabled
      from public.beat_runtime_controls controls where controls.singleton
    ),false) or exists(select 1 from public.beat_configuration_health(target_item_id)) then
      raise exception 'This Beat is not ready for paid licensing.' using errcode='55000';
    end if;
    select template.* into template_row
    from public.beat_license_offers beat_offer
    join public.beat_license_templates template on template.id=beat_offer.template_id
    where beat_offer.offer_id=offer_row.id;
    if template_row.id is null or template_row.status<>'active' or template_row.is_exclusive
      or template_row.tier_code not in ('basic','premium','trackout')
      or target_tier_code is distinct from template_row.tier_code
      or target_terms_sha256 is distinct from template_row.terms_sha256 then
      raise exception 'The Beat license terms or tier changed. Review them and try again.' using errcode='55000';
    end if;
  elsif target_tier_code is not null or target_terms_sha256 is not null
    or not exists(select 1 from public.offer_entitlements entitlement where entitlement.offer_id=offer_row.id) then
    raise exception 'The digital offer is incomplete.' using errcode='55000';
  end if;

  select * into mapping_row from public.native_storekit_product_mappings mapping
  where mapping.offer_id=offer_row.id
    and mapping.item_id=target_item_id
    and mapping.identifier_scope=scope_name
    and mapping.approval_status='approved'
    and mapping.available_for_sale
    and upper(coalesce(mapping.apple_state,''))='APPROVED';
  if not found then
    raise exception 'This digital product is awaiting App Store approval.' using errcode='55000';
  end if;

  update public.native_storekit_purchase_intents
  set status='expired'
  where user_id=target_user_id and status='issued' and expires_at<=now();

  insert into public.native_storekit_purchase_intents(
    user_id,item_id,offer_id,client_offer_id,product_id,tier_code,terms_sha256,expires_at
  ) values(
    target_user_id,target_item_id,offer_row.id,target_offer_id,mapping_row.product_id,
    template_row.tier_code,template_row.terms_sha256,now()+interval '15 minutes'
  ) returning * into intent_row;

  return jsonb_build_object(
    'contract_version',1,
    'purchase_intent_id',intent_row.id,
    'item_id',intent_row.item_id,
    'offer_id',intent_row.client_offer_id,
    'product_id',intent_row.product_id,
    'status','approved',
    'expires_at',intent_row.expires_at
  );
end;
$$;

-- The canonical Beat grant finalizer predates native commerce and originally
-- required Stripe to be enabled for every provider. Preserve that requirement
-- for web orders while allowing a server-verified App Store order to finalize
-- under the same approved operating model and Beat runtime controls.
create or replace function public.finalize_beat_license_purchase(
  target_order_item_id uuid,target_reservation_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  line public.commerce_order_items;
  order_row public.commerce_orders;
  existing uuid;
  result uuid;
  snapshot jsonb;
  snapshot_template_id uuid;
  snapshot_tier text;
  snapshot_terms text;
  snapshot_sha text;
  files jsonb;
  collaborators jsonb;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  select id into existing from public.beat_license_grants where order_item_id=target_order_item_id;
  if existing is not null then return existing; end if;
  if not coalesce((
    select checkout_enabled and nonexclusive_pilot_enabled
    from public.beat_runtime_controls where singleton
  ),false) then
    raise exception 'Beat checkout is disabled.' using errcode='55000';
  end if;
  select * into line from public.commerce_order_items where id=target_order_item_id for update;
  if line.id is null or line.offer_type<>'beat_license' then
    raise exception 'Beat license order line not found.' using errcode='P0002';
  end if;
  select * into order_row from public.commerce_orders where id=line.order_id for update;
  if order_row.status not in ('paid','fulfilled','partially_refunded') then
    raise exception 'A verified paid Beat license order is required.' using errcode='23514';
  end if;
  if not coalesce((
    select controls.checkout_enabled
      and controls.operating_model_approved_at is not null
      and (order_row.provider='app_store' or controls.stripe_payments_enabled)
    from public.commerce_runtime_controls controls where controls.singleton
  ),false) then
    raise exception 'Beat checkout is disabled.' using errcode='55000';
  end if;
  snapshot:=line.beat_license_snapshot;
  begin
    snapshot_template_id:=(snapshot->>'templateId')::uuid;
  exception when others then
    raise exception 'Beat license snapshot is invalid.' using errcode='23514';
  end;
  snapshot_tier:=snapshot->>'tierCode';
  snapshot_terms:=snapshot->>'termsText';
  snapshot_sha:=snapshot->>'termsSha256';
  files:=coalesce(snapshot->'files','[]'::jsonb);
  collaborators:=coalesce(snapshot->'collaborators','[]'::jsonb);
  if snapshot_tier not in ('basic','premium','trackout')
    or coalesce((snapshot->>'isExclusive')::boolean,true)
    or nullif(snapshot_terms,'') is null
    or snapshot_sha !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(files)<>'array'
    or jsonb_array_length(files)=0
    or not exists(
      select 1 from public.beat_license_templates
      where id=snapshot_template_id and terms_sha256=snapshot_sha
    ) then
    raise exception 'Beat license snapshot is incomplete.' using errcode='23514';
  end if;
  if exists(select 1 from public.beat_configuration_health(line.item_id)) then
    raise exception 'Beat configuration is incomplete.' using errcode='23514';
  end if;
  perform set_config('os44.beat_service_write','1',true);
  insert into public.beat_license_grants(
    license_number,order_item_id,buyer_id,item_id,offer_id,template_id,tier_code,is_exclusive,
    terms_text,terms_sha256,price_cents,currency,seller_id,seller_snapshot,
    collaborator_snapshot,file_manifest
  ) values(
    '44B-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
    line.id,order_row.buyer_id,line.item_id,line.offer_id,snapshot_template_id,
    snapshot_tier,false,snapshot_terms,snapshot_sha,line.unit_price_cents,line.currency,
    line.seller_id,line.seller_snapshot,collaborators,files
  ) returning id into result;
  insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at)
  values(order_row.buyer_id,line.item_id,'purchase','visible',now())
  on conflict(user_id,item_id) do update set status='visible',acquisition_type='purchase';
  return result;
end;
$$;

create or replace function public.fulfill_native_storekit_transaction_v1(
  target_user_id uuid,
  target_transaction_id text,
  target_original_transaction_id text,
  target_product_id text,
  target_app_account_token uuid,
  target_environment text,
  target_jws_sha256 text,
  target_purchase_date timestamptz,
  target_purchase_intent_id uuid default null,
  target_expected_item_id uuid default null,
  target_expected_offer_id uuid default null,
  target_original_purchase_date timestamptz default null,
  target_signed_date timestamptz default null,
  target_storefront text default null,
  target_storefront_id text default null,
  target_currency text default null,
  target_price_milliunits bigint default null,
  target_revocation_date timestamptz default null,
  target_revocation_reason integer default null
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  mapping_row public.native_storekit_product_mappings;
  intent_row public.native_storekit_purchase_intents;
  existing_tx public.native_storekit_transactions;
  offer_row public.catalog_offers;
  item_row public.catalog_items;
  seller_row public.profiles;
  terms_row public.commerce_terms_versions;
  controls_row public.commerce_runtime_controls;
  order_row public.commerce_orders;
  line_row public.commerce_order_items;
  attempt_row public.payment_attempts;
  entitlement_kind text;
  entitlement_row public.entitlements;
  fee_bps integer:=0;
  paid_price_cents integer;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_user_id is null or target_app_account_token is distinct from target_user_id
    or target_transaction_id is null or target_transaction_id !~ '^[0-9]{1,40}$'
    or target_original_transaction_id is null or target_original_transaction_id !~ '^[0-9]{1,40}$'
    or target_product_id is null or target_product_id !~ '^com\.fortyfour\.os44\.(item|offer)\.[0-9a-f]{32}$'
    or target_environment is null or target_environment not in ('Production','Sandbox','Xcode','LocalTesting')
    or target_jws_sha256 is null or target_jws_sha256 !~ '^[0-9a-f]{64}$'
    or target_currency is null or target_currency !~ '^[A-Z]{3}$'
    or target_price_milliunits is null
    or target_price_milliunits<=0
    or target_purchase_date is null then
    raise exception 'Verified StoreKit transaction data is invalid.' using errcode='22023';
  end if;
  if target_revocation_date is not null then
    raise exception 'A revoked StoreKit transaction cannot grant access.' using errcode='55000';
  end if;
  paid_price_cents:=round(target_price_milliunits/10.0)::integer;
  if paid_price_cents<=0 then
    raise exception 'Verified StoreKit transaction price is invalid.' using errcode='22023';
  end if;

  select * into existing_tx from public.native_storekit_transactions
  where transaction_id=target_transaction_id or original_transaction_id=target_original_transaction_id
  order by case when transaction_id=target_transaction_id then 0 else 1 end
  limit 1 for update;
  if found then
    if existing_tx.user_id<>target_user_id
      or existing_tx.product_id<>target_product_id
      or existing_tx.app_account_token<>target_app_account_token then
      raise exception 'StoreKit transaction account or product mismatch.' using errcode='42501';
    end if;
    return jsonb_build_object(
      'fulfilled',existing_tx.status='active',
      'order_id',existing_tx.order_id,
      'transaction_id',existing_tx.transaction_id,
      'duplicate',true
    );
  end if;

  select * into mapping_row from public.native_storekit_product_mappings
  where product_id=target_product_id
    and approval_status='approved'
    and available_for_sale
    and upper(coalesce(apple_state,''))='APPROVED';
  if not found then
    raise exception 'StoreKit product mapping is not approved.' using errcode='55000';
  end if;

  if target_expected_item_id is not null and target_expected_item_id<>mapping_row.item_id then
    raise exception 'StoreKit transaction Item mismatch.' using errcode='22023';
  end if;

  if target_purchase_intent_id is not null then
    select * into intent_row from public.native_storekit_purchase_intents
    where id=target_purchase_intent_id for update;
    if not found or intent_row.user_id<>target_user_id
      or intent_row.item_id<>mapping_row.item_id
      or intent_row.offer_id<>mapping_row.offer_id
      or intent_row.product_id<>target_product_id
      or intent_row.client_offer_id is distinct from target_expected_offer_id
      or intent_row.status<>'issued'
      or intent_row.expires_at<=now() then
      raise exception 'StoreKit purchase intent does not match this transaction.' using errcode='42501';
    end if;
  elsif target_expected_item_id is not null or target_expected_offer_id is not null then
    raise exception 'A purchase intent is required for selected Cart content.' using errcode='22023';
  end if;

  select * into offer_row from public.catalog_offers where id=mapping_row.offer_id;
  select * into item_row from public.catalog_items where id=mapping_row.item_id;
  select * into seller_row from public.profiles where id=item_row.author_id;
  if offer_row.id is null or item_row.id is null
    or offer_row.item_id<>item_row.id
    or offer_row.offer_type not in ('digital_download','beat_license') then
    raise exception 'Canonical StoreKit offer is unavailable.' using errcode='P0002';
  end if;

  select * into controls_row from public.commerce_runtime_controls where singleton;
  fee_bps:=coalesce(controls_row.platform_fee_bps,0);
  select * into terms_row from public.commerce_terms_versions
  where status='active' order by effective_at desc nulls last,created_at desc limit 1;

  insert into public.commerce_orders(
    buyer_id,status,currency,subtotal_cents,total_cents,provider,provider_order_id,
    idempotency_key,placed_at,paid_at,terms_version_id,terms_sha256,platform_fee_bps
  ) values(
    target_user_id,'paid',target_currency,paid_price_cents,paid_price_cents,
    'app_store',target_transaction_id,'app-store:'||target_transaction_id,
    target_purchase_date,target_purchase_date,terms_row.id,terms_row.body_sha256,fee_bps
  ) returning * into order_row;

  insert into public.commerce_order_items(
    order_id,offer_id,item_id,seller_id,item_title,offer_title,offer_type,quantity,
    unit_price_cents,line_total_cents,currency,fulfillment_status,
    item_snapshot,offer_snapshot,seller_snapshot,entitlement_snapshot,terms_snapshot,platform_fee_cents
  ) values(
    order_row.id,offer_row.id,item_row.id,item_row.author_id,item_row.title,offer_row.title,
    offer_row.offer_type,1,paid_price_cents,paid_price_cents,target_currency,'not_required',
    jsonb_build_object(
      'id',item_row.id,'title',item_row.title,'slug',item_row.slug,
      'experience_type',item_row.experience_type,'fulfillment_type',item_row.fulfillment_type,
      'status',item_row.status
    ),
    jsonb_build_object(
      'id',offer_row.id,'code',offer_row.code,'title',offer_row.title,
      'description',offer_row.description,'offer_type',offer_row.offer_type,
      'fulfillment_type',offer_row.fulfillment_type,'canonical_price_cents',offer_row.price_cents,
      'canonical_currency',offer_row.currency,'status',offer_row.status,
      'storekit_product_id',target_product_id
    ),
    jsonb_build_object('id',item_row.author_id,'display_name',seller_row.display_name,'username',seller_row.username),
    coalesce((select jsonb_agg(entitlement.entitlement_type order by entitlement.entitlement_type)
      from public.offer_entitlements entitlement where entitlement.offer_id=offer_row.id),'[]'::jsonb),
    case when terms_row.id is null then '{}'::jsonb else jsonb_build_object(
      'id',terms_row.id,'code',terms_row.code,'version',terms_row.version,'title',terms_row.title,
      'body',terms_row.body,'sha256',terms_row.body_sha256,'effective_at',terms_row.effective_at
    ) end,
    floor(paid_price_cents*fee_bps/10000.0)::integer
  ) returning * into line_row;

  insert into public.payment_attempts(
    order_id,provider,provider_payment_id,idempotency_key,status,amount_cents,currency,succeeded_at
  ) values(
    order_row.id,'app_store',target_transaction_id,'app-store:'||target_transaction_id,
    'succeeded',paid_price_cents,target_currency,target_purchase_date
  ) returning * into attempt_row;

  insert into public.native_storekit_transactions(
    transaction_id,original_transaction_id,product_id,user_id,item_id,offer_id,
    app_account_token,environment,storefront,storefront_id,currency,price_milliunits,
    purchase_date,original_purchase_date,signed_date,revocation_date,revocation_reason,
    jws_sha256,order_id,status
  ) values(
    target_transaction_id,target_original_transaction_id,target_product_id,target_user_id,
    item_row.id,offer_row.id,target_app_account_token,target_environment,
    nullif(btrim(target_storefront),''),nullif(btrim(target_storefront_id),''),
    upper(nullif(btrim(target_currency),'')),target_price_milliunits,target_purchase_date,
    target_original_purchase_date,target_signed_date,null,null,target_jws_sha256,order_row.id,'active'
  );

  insert into public.payment_events(
    provider,provider_event_id,event_type,order_id,payment_attempt_id,
    processing_status,payload,processed_at
  ) values(
    'app_store',target_transaction_id,'verified_non_consumable_purchase',order_row.id,attempt_row.id,
    'processed',jsonb_build_object(
      'product_id',target_product_id,'environment',target_environment,
      'storefront',target_storefront,'currency',target_currency,
      'price_milliunits',target_price_milliunits
    ),now()
  ) on conflict(provider,provider_event_id) do nothing;

  -- App Store retail price is not creator proceeds. A settlement importer must
  -- post creator earnings only after Apple's actual proceeds, commission, tax,
  -- and settlement currency are known. Fulfillment must not make an estimated
  -- gross amount payout-eligible.

  for entitlement_kind in
    select jsonb_array_elements_text(line_row.entitlement_snapshot)
  loop
    insert into public.entitlements(
      user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at
    ) values(
      target_user_id,item_row.id,entitlement_kind,'active','order',line_row.id,target_purchase_date,null
    ) on conflict(user_id,item_id,entitlement_type) do update set
      status='active',source_type='order',source_id=line_row.id,revoked_at=null,expires_at=null
    returning * into entitlement_row;

    insert into public.commerce_entitlement_grants(
      order_item_id,entitlement_id,user_id,item_id,entitlement_type,status
    ) values(
      line_row.id,entitlement_row.id,target_user_id,item_row.id,entitlement_kind,'active'
    ) on conflict(order_item_id,entitlement_type) do update set
      status='active',revoked_at=null,revoked_reason=null;

    if not exists(
      select 1 from public.entitlement_events event
      where event.entitlement_id=entitlement_row.id
        and event.source_type='order' and event.source_id=line_row.id
        and event.operation in ('grant','restore')
    ) then
      insert into public.entitlement_events(
        entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason
      ) values(
        entitlement_row.id,target_user_id,item_row.id,entitlement_kind,'grant','order',line_row.id,
        'App Store transaction verified'
      );
    end if;
  end loop;

  insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at)
  values(target_user_id,item_row.id,'purchase','visible',target_purchase_date)
  on conflict(user_id,item_id) do update set acquisition_type='purchase',status='visible';

  if offer_row.offer_type='beat_license' then
    perform public.finalize_beat_license_purchase(line_row.id,null);
  end if;

  update public.commerce_orders set status='fulfilled'
  where id=order_row.id returning * into order_row;

  if intent_row.id is not null then
    update public.native_storekit_purchase_intents
    set status='consumed',consumed_at=now()
    where id=intent_row.id;
  end if;

  return jsonb_build_object(
    'fulfilled',true,
    'order_id',order_row.id,
    'transaction_id',target_transaction_id,
    'duplicate',false
  );
end;
$$;

create or replace function public.process_native_storekit_notification_v1(
  target_notification_uuid uuid,
  target_notification_type text,
  target_signed_payload_sha256 text,
  target_subtype text default null,
  target_environment text default null,
  target_transaction_id text default null,
  target_original_transaction_id text default null,
  target_revocation_date timestamptz default null,
  target_revocation_reason integer default null
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  event_row public.native_storekit_notification_events;
  transaction_row public.native_storekit_transactions;
  order_row public.commerce_orders;
  attempt_row public.payment_attempts;
  grant_source record;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_notification_uuid is null
    or nullif(btrim(target_notification_type),'') is null
    or char_length(target_notification_type)>100
    or (target_subtype is not null and char_length(target_subtype)>100)
    or target_environment is null
    or target_environment not in ('Production','Sandbox','Xcode','LocalTesting')
    or (target_transaction_id is not null and target_transaction_id !~ '^[0-9]{1,40}$')
    or (target_original_transaction_id is not null and target_original_transaction_id !~ '^[0-9]{1,40}$')
    or target_signed_payload_sha256 is null
    or target_signed_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Verified App Store notification data is invalid.' using errcode='22023';
  end if;

  insert into public.native_storekit_notification_events(
    notification_uuid,notification_type,subtype,environment,transaction_id,
    original_transaction_id,signed_payload_sha256
  ) values(
    target_notification_uuid,upper(target_notification_type),nullif(btrim(target_subtype),''),
    target_environment,nullif(btrim(target_transaction_id),''),
    nullif(btrim(target_original_transaction_id),''),target_signed_payload_sha256
  ) on conflict(notification_uuid) do nothing
  returning * into event_row;

  if event_row.notification_uuid is null then
    select * into event_row from public.native_storekit_notification_events
    where notification_uuid=target_notification_uuid for update;
    if event_row.processing_status in ('processed','ignored') then
      return jsonb_build_object('processed',true,'duplicate',true,'notification_uuid',target_notification_uuid);
    end if;
    update public.native_storekit_notification_events
    set processing_status='received',error_message=null,processed_at=null
    where notification_uuid=target_notification_uuid;
  end if;

  if upper(target_notification_type) not in ('REFUND','REVOKE') then
    update public.native_storekit_notification_events
    set processing_status='ignored',processed_at=now()
    where notification_uuid=target_notification_uuid;
    return jsonb_build_object('processed',false,'duplicate',false,'reason','unsupported_notification');
  end if;

  if target_transaction_id is null or target_original_transaction_id is null then
    raise exception 'A verified App Store revocation transaction is required.' using errcode='22023';
  end if;

  select * into transaction_row from public.native_storekit_transactions
  where transaction_id=target_transaction_id
    or original_transaction_id=target_original_transaction_id
  order by case when transaction_id=target_transaction_id then 0 else 1 end
  limit 1 for update;

  if not found then
    update public.native_storekit_notification_events
    set processing_status='failed',processed_at=now(),error_message='Verified transaction is not known locally.'
    where notification_uuid=target_notification_uuid;
    return jsonb_build_object(
      'processed',false,'duplicate',false,'retryable',true,
      'reason','unknown_transaction','notification_uuid',target_notification_uuid
    );
  end if;

  select * into order_row from public.commerce_orders where id=transaction_row.order_id for update;
  select * into attempt_row from public.payment_attempts
  where order_id=order_row.id and provider='app_store'
  order by created_at desc limit 1 for update;

  update public.native_storekit_transactions
  set status='revoked',
    revocation_date=coalesce(target_revocation_date,now()),
    revocation_reason=target_revocation_reason
  where transaction_id=transaction_row.transaction_id;

  update public.commerce_orders
  set status='refunded',refunded_cents=total_cents
  where id=order_row.id;
  update public.payment_attempts
  set status='refunded',refunded_cents=amount_cents
  where id=attempt_row.id;

  update public.commerce_entitlement_grants
  set status='revoked',revoked_at=now(),revoked_reason='App Store refund or revocation'
  where order_item_id in (
    select order_line.id from public.commerce_order_items order_line where order_line.order_id=order_row.id
  ) and status='active';

  for grant_source in
    select distinct entitlement_grant.user_id,entitlement_grant.item_id,entitlement_grant.entitlement_type
    from public.commerce_entitlement_grants entitlement_grant
    where entitlement_grant.order_item_id in (
      select order_line.id from public.commerce_order_items order_line where order_line.order_id=order_row.id
    )
  loop
    perform public.refresh_paid_entitlement(
      grant_source.user_id,grant_source.item_id,grant_source.entitlement_type,
      'App Store refund or revocation'
    );
  end loop;

  perform set_config('os44.beat_service_write','1',true);
  update public.beat_license_grants
  set status='refunded',status_changed_at=now()
  where order_item_id in (
    select order_line.id from public.commerce_order_items order_line where order_line.order_id=order_row.id
  ) and status='active';

  insert into public.payment_events(
    provider,provider_event_id,event_type,order_id,payment_attempt_id,
    processing_status,payload,processed_at
  ) values(
    'app_store',target_notification_uuid::text,upper(target_notification_type),
    order_row.id,attempt_row.id,'processed',
    jsonb_build_object(
      'transaction_id',transaction_row.transaction_id,
      'original_transaction_id',transaction_row.original_transaction_id,
      'environment',target_environment,'subtype',target_subtype
    ),now()
  ) on conflict(provider,provider_event_id) do nothing;

  update public.native_storekit_notification_events
  set processing_status='processed',processed_at=now()
  where notification_uuid=target_notification_uuid;

  return jsonb_build_object(
    'processed',true,'duplicate',false,'order_id',order_row.id,
    'transaction_id',transaction_row.transaction_id
  );
end;
$$;

revoke all on public.native_storekit_product_mappings,
  public.native_storekit_purchase_intents,
  public.native_storekit_transactions,
  public.native_storekit_notification_events from public,anon,authenticated;
grant all on public.native_storekit_product_mappings,
  public.native_storekit_purchase_intents,
  public.native_storekit_transactions,
  public.native_storekit_notification_events to service_role;

revoke all on function public.upsert_native_storekit_product_mapping_v1(
  text,uuid,uuid,text,text,text,text,text,boolean,uuid
) from public,anon,authenticated;
revoke all on function public.prepare_native_storekit_purchase_intent_v1(
  uuid,uuid,uuid,text,text
) from public,anon,authenticated;
revoke all on function public.fulfill_native_storekit_transaction_v1(
  uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,
  timestamptz,text,text,text,bigint,timestamptz,integer
) from public,anon,authenticated;
revoke all on function public.process_native_storekit_notification_v1(
  uuid,text,text,text,text,text,text,timestamptz,integer
) from public,anon,authenticated;

grant execute on function public.upsert_native_storekit_product_mapping_v1(
  text,uuid,uuid,text,text,text,text,text,boolean,uuid
) to service_role;
grant execute on function public.prepare_native_storekit_purchase_intent_v1(
  uuid,uuid,uuid,text,text
) to service_role;
grant execute on function public.fulfill_native_storekit_transaction_v1(
  uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,
  timestamptz,text,text,text,bigint,timestamptz,integer
) to service_role;
grant execute on function public.process_native_storekit_notification_v1(
  uuid,text,text,text,text,text,text,timestamptz,integer
) to service_role;

comment on table public.native_storekit_product_mappings is
  'Server-only Apple product approval mapping to one canonical paid digital offer.';
comment on table public.native_storekit_transactions is
  'Verified App Store transaction evidence. Raw signed JWS values are never retained.';
comment on function public.fulfill_native_storekit_transaction_v1(
  uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,
  timestamptz,text,text,text,bigint,timestamptz,integer
) is
  'Idempotently fulfills a server-verified non-consumable StoreKit transaction into canonical commerce, entitlement, Library, and Beat-license ledgers.';

commit;
