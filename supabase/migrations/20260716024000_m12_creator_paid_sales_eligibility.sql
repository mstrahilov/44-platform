begin;

-- Creator commerce is activated per creator. An administrator decision is
-- necessary but never sufficient: a non-platform seller must also have a
-- provider-verified payout account. Provider identifiers remain service-only.

alter table public.creator_payout_accounts
  drop constraint if exists creator_payout_accounts_provider_check,
  drop constraint if exists creator_payout_accounts_status_check;

alter table public.creator_payout_accounts
  add constraint creator_payout_accounts_provider_check
    check (provider in ('stripe_connect','stripe_global_payouts','paypal')),
  add constraint creator_payout_accounts_status_check
    check (status in ('unverified','pending','verified','restricted','country_unavailable','disabled')),
  add column if not exists status_reason_code text,
  add column if not exists capabilities jsonb not null default '{}',
  add column if not exists requirements_due text[] not null default '{}',
  add column if not exists last_provider_sync_at timestamptz;

create unique index if not exists creator_payout_accounts_provider_recipient_unique
  on public.creator_payout_accounts(provider,provider_recipient_ref)
  where provider_recipient_ref is not null;

comment on column public.creator_payout_accounts.provider_recipient_ref is
  'Server-only provider account or recipient identifier. Never expose through public creator/profile queries.';

create table public.creator_paid_sales_access (
  creator_id uuid primary key references public.profiles(id) on delete restrict,
  admin_status text not null default 'not_reviewed'
    check (admin_status in ('not_reviewed','approved','disabled')),
  decision_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_paid_sales_access_decision_check check (
    (admin_status='not_reviewed' and approved_at is null)
    or (admin_status='approved' and approved_by is not null and approved_at is not null and disabled_at is null)
    or (admin_status='disabled' and disabled_at is not null)
  )
);

create table public.creator_paid_sales_access_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  previous_status text,
  new_status text not null check (new_status in ('not_reviewed','approved','disabled')),
  changed_by uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

create table public.creator_payout_capability_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null check (provider in ('stripe_connect','stripe_global_payouts','paypal')),
  previous_status text,
  new_status text not null check (new_status in ('unverified','pending','verified','restricted','country_unavailable','disabled')),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  reason_code text,
  created_at timestamptz not null default now()
);

create index creator_paid_sales_access_events_creator_idx
  on public.creator_paid_sales_access_events(creator_id,created_at desc);
create index creator_payout_capability_events_creator_idx
  on public.creator_payout_capability_events(creator_id,created_at desc);

create trigger creator_paid_sales_access_touch_updated_at
before update on public.creator_paid_sales_access
for each row execute function public.touch_content_updated_at();

create trigger creator_paid_sales_access_events_immutable
before update or delete on public.creator_paid_sales_access_events
for each row execute function public.reject_immutable_finance_mutation();

create trigger creator_payout_capability_events_immutable
before update or delete on public.creator_payout_capability_events
for each row execute function public.reject_immutable_finance_mutation();

alter table public.creator_paid_sales_access enable row level security;
alter table public.creator_paid_sales_access_events enable row level security;
alter table public.creator_payout_capability_events enable row level security;

revoke all on public.creator_paid_sales_access,public.creator_paid_sales_access_events,
  public.creator_payout_capability_events from public,anon,authenticated;
grant all on public.creator_paid_sales_access,public.creator_paid_sales_access_events,
  public.creator_payout_capability_events to service_role;

create or replace function public.creator_paid_sales_state_code(target_creator_id uuid)
returns text language plpgsql security definer stable set search_path=public as $$
declare access_row public.creator_paid_sales_access;
declare payout_row public.creator_payout_accounts;
begin
  if exists(
    select 1 from public.commerce_runtime_controls controls
    where controls.singleton and controls.platform_seller_id=target_creator_id
  ) then
    return 'enabled';
  end if;

  select * into access_row from public.creator_paid_sales_access where creator_id=target_creator_id;
  if not found or access_row.admin_status='not_reviewed' then return 'not_reviewed'; end if;
  if access_row.admin_status='disabled' then return 'disabled'; end if;

  select * into payout_row
  from public.creator_payout_accounts account
  where account.creator_id=target_creator_id
  order by
    case account.status
      when 'verified' then 0 when 'pending' then 1 when 'unverified' then 2
      when 'restricted' then 3 when 'country_unavailable' then 4 else 5 end,
    account.updated_at desc,account.id
  limit 1;
  if not found then return 'onboarding_required'; end if;
  if payout_row.status='verified' then return 'enabled'; end if;
  if payout_row.status='restricted' then return 'restricted'; end if;
  if payout_row.status='country_unavailable' then return 'country_unavailable'; end if;
  if payout_row.status='disabled' then return 'disabled'; end if;
  return 'pending_provider';
end;
$$;

create or replace function public.is_creator_paid_sales_enabled(target_creator_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select public.creator_paid_sales_state_code(target_creator_id)='enabled';
$$;

create or replace function public.get_creator_paid_sales_state(target_creator_id uuid default auth.uid())
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare access_row public.creator_paid_sales_access;
declare payout_row public.creator_payout_accounts;
declare state_code text;
declare is_platform_seller boolean;
begin
  if target_creator_id is null then raise exception 'Creator not found.' using errcode='P0002'; end if;
  if auth.role()<>'service_role' and auth.uid()<>target_creator_id and not public.is_platform_admin() then
    raise exception 'Creator commerce access denied.' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=target_creator_id) then
    raise exception 'Creator not found.' using errcode='P0002';
  end if;

  select exists(select 1 from public.commerce_runtime_controls controls
    where controls.singleton and controls.platform_seller_id=target_creator_id) into is_platform_seller;
  select * into access_row from public.creator_paid_sales_access where creator_id=target_creator_id;
  select * into payout_row from public.creator_payout_accounts account
  where account.creator_id=target_creator_id
  order by
    case account.status
      when 'verified' then 0 when 'pending' then 1 when 'unverified' then 2
      when 'restricted' then 3 when 'country_unavailable' then 4 else 5 end,
    account.updated_at desc,account.id
  limit 1;
  state_code:=public.creator_paid_sales_state_code(target_creator_id);

  return jsonb_build_object(
    'creator_id',target_creator_id,
    'can_sell_paid',state_code='enabled',
    'state',state_code,
    'is_platform_seller',is_platform_seller,
    'admin_status',case when is_platform_seller then 'approved' else coalesce(access_row.admin_status,'not_reviewed') end,
    'decision_reason',access_row.decision_reason,
    'approved_at',access_row.approved_at,
    'approved_by',access_row.approved_by,
    'provider',payout_row.provider,
    'provider_status',payout_row.status,
    'country_code',payout_row.recipient_country_code,
    'currency',payout_row.preferred_currency,
    'status_reason_code',payout_row.status_reason_code,
    'requirements_due',coalesce(payout_row.requirements_due,'{}'::text[]),
    'last_provider_sync_at',payout_row.last_provider_sync_at,
    'history',coalesce((select jsonb_agg(jsonb_build_object(
      'id',event.id,'previous_status',event.previous_status,'new_status',event.new_status,
      'reason',event.reason,'created_at',event.created_at,
      'changed_by',coalesce(actor.display_name,actor.username,'44 Admin')
    ) order by event.created_at desc,event.id desc)
      from public.creator_paid_sales_access_events event
      left join public.profiles actor on actor.id=event.changed_by
      where event.creator_id=target_creator_id),'[]'::jsonb)
  );
end;
$$;

create or replace function public.get_creator_paid_sales_public_status(target_creator_ids uuid[])
returns table(creator_id uuid,can_sell_paid boolean,state text)
language plpgsql security definer stable set search_path=public as $$
begin
  if cardinality(target_creator_ids) is null or cardinality(target_creator_ids)>250 then
    raise exception 'Creator status request is invalid.' using errcode='22023';
  end if;
  return query
  select requested.creator_id,
    public.is_creator_paid_sales_enabled(requested.creator_id),
    public.creator_paid_sales_state_code(requested.creator_id)
  from (select distinct unnest(target_creator_ids) creator_id) requested
  where exists(select 1 from public.profiles profile where profile.id=requested.creator_id);
end;
$$;

create or replace function public.refresh_creator_paid_offers(target_creator_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.catalog_offers(
    item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type
  )
  select item.id,'digital-download-usd','digital_download','Downloadable Copy',
    'Download the complete digital Item after verified payment.',item.price_cents,'USD',
    case when item.status='published' and public.is_creator_paid_sales_enabled(item.author_id)
      then 'active' else 'draft' end,'entitlement'
  from public.catalog_items item
  where item.author_id=target_creator_id and item.experience_type in ('music','book','asset')
    and item.fulfillment_type in ('digital','hybrid') and item.download_purchase_enabled
    and not item.is_free and item.price_cents>0
  on conflict(item_id,code) do update set
    offer_type=excluded.offer_type,title=excluded.title,description=excluded.description,
    price_cents=excluded.price_cents,currency=excluded.currency,status=excluded.status,
    fulfillment_type=excluded.fulfillment_type,updated_at=now();

  insert into public.offer_entitlements(offer_id,entitlement_type)
  select offer.id,'download' from public.catalog_offers offer
  join public.catalog_items item on item.id=offer.item_id
  where item.author_id=target_creator_id and offer.code='digital-download-usd'
  on conflict do nothing;

  update public.catalog_offers offer set status='archived',updated_at=now()
  where offer.code='digital-download-usd'
    and exists(select 1 from public.catalog_items item where item.id=offer.item_id and item.author_id=target_creator_id)
    and not exists(
      select 1 from public.catalog_items item where item.id=offer.item_id
        and item.experience_type in ('music','book','asset')
        and item.fulfillment_type in ('digital','hybrid') and item.download_purchase_enabled
        and not item.is_free and item.price_cents>0
    );
end;
$$;

create or replace function public.sync_owned_item_paid_offer()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.author_id is not null then perform public.refresh_creator_paid_offers(new.author_id); end if;
  if tg_op='UPDATE' and old.author_id is distinct from new.author_id and old.author_id is not null then
    perform public.refresh_creator_paid_offers(old.author_id);
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_items_sync_paid_offer on public.catalog_items;
create trigger catalog_items_sync_paid_offer
after insert or update of author_id,status,price_cents,is_free,experience_type,fulfillment_type,download_purchase_enabled
on public.catalog_items for each row execute function public.sync_owned_item_paid_offer();

create or replace function public.set_admin_creator_paid_sales(
  target_creator_id uuid,target_status text,target_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare previous_status text;
declare normalized_reason text:=btrim(target_reason);
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_status not in ('approved','disabled') then raise exception 'Invalid paid-sales decision.' using errcode='22023'; end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then
    raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id=target_creator_id and role in ('creator','admin')) then
    raise exception 'Creator not found.' using errcode='P0002';
  end if;

  select admin_status into previous_status from public.creator_paid_sales_access
  where creator_id=target_creator_id for update;
  previous_status:=coalesce(previous_status,'not_reviewed');
  if previous_status=target_status then raise exception 'Paid sales already have that decision.' using errcode='55000'; end if;

  insert into public.creator_paid_sales_access(
    creator_id,admin_status,decision_reason,approved_by,approved_at,disabled_at
  ) values(
    target_creator_id,target_status,normalized_reason,auth.uid(),
    case when target_status='approved' then now() else null end,
    case when target_status='disabled' then now() else null end
  ) on conflict(creator_id) do update set
    admin_status=excluded.admin_status,decision_reason=excluded.decision_reason,
    approved_by=excluded.approved_by,approved_at=excluded.approved_at,
    disabled_at=excluded.disabled_at,updated_at=now();

  insert into public.creator_paid_sales_access_events(
    creator_id,previous_status,new_status,changed_by,reason
  ) values(target_creator_id,previous_status,target_status,auth.uid(),normalized_reason);
  perform public.refresh_creator_paid_offers(target_creator_id);
  return public.get_creator_paid_sales_state(target_creator_id);
end;
$$;

create or replace function public.sync_creator_payout_capability(
  target_creator_id uuid,target_provider text,target_provider_recipient_ref text,
  target_country_code text,target_currency text,target_status text,
  target_reason_code text default null,target_capabilities jsonb default '{}',
  target_requirements_due text[] default '{}'
) returns jsonb language plpgsql security definer set search_path=public as $$
declare payout_id uuid;
declare previous_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_provider not in ('stripe_connect','stripe_global_payouts','paypal')
    or target_status not in ('unverified','pending','verified','restricted','country_unavailable','disabled')
    or target_country_code !~ '^[A-Z]{2}$' or target_currency !~ '^[A-Z]{3}$'
    or nullif(btrim(target_provider_recipient_ref),'') is null then
    raise exception 'Provider capability details are invalid.' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id=target_creator_id and role in ('creator','admin')) then
    raise exception 'Creator not found.' using errcode='P0002';
  end if;

  select status into previous_status from public.creator_payout_accounts
  where creator_id=target_creator_id and provider=target_provider for update;

  insert into public.creator_payout_accounts(
    creator_id,provider,provider_recipient_ref,recipient_country_code,preferred_currency,
    status,status_reason_code,capabilities,requirements_due,last_provider_sync_at,verified_at,disabled_at
  ) values(
    target_creator_id,target_provider,btrim(target_provider_recipient_ref),target_country_code,target_currency,
    target_status,nullif(btrim(target_reason_code),''),coalesce(target_capabilities,'{}'),
    coalesce(target_requirements_due,'{}'),now(),
    case when target_status='verified' then now() else null end,
    case when target_status='disabled' then now() else null end
  ) on conflict(creator_id,provider) do update set
    provider_recipient_ref=excluded.provider_recipient_ref,
    recipient_country_code=excluded.recipient_country_code,preferred_currency=excluded.preferred_currency,
    status=excluded.status,status_reason_code=excluded.status_reason_code,
    capabilities=excluded.capabilities,requirements_due=excluded.requirements_due,
    last_provider_sync_at=excluded.last_provider_sync_at,
    verified_at=case when excluded.status='verified' then coalesce(public.creator_payout_accounts.verified_at,now()) else null end,
    disabled_at=case when excluded.status='disabled' then now() else null end,
    updated_at=now()
  returning id into payout_id;

  if previous_status is distinct from target_status then
    insert into public.creator_payout_capability_events(
      creator_id,provider,previous_status,new_status,country_code,currency,reason_code
    ) values(target_creator_id,target_provider,previous_status,target_status,target_country_code,target_currency,nullif(btrim(target_reason_code),''));
  end if;
  perform public.refresh_creator_paid_offers(target_creator_id);
  return public.get_creator_paid_sales_state(target_creator_id);
end;
$$;

create or replace function public.enforce_commerce_order_item_eligibility()
returns trigger language plpgsql security definer set search_path=public as $$
declare item_row public.catalog_items;
declare controls public.commerce_runtime_controls;
begin
  select * into item_row from public.catalog_items where id=new.item_id;
  select * into controls from public.commerce_runtime_controls where singleton;
  if item_row.id is null or new.seller_id is distinct from item_row.author_id then
    raise exception 'Order seller identity is invalid.' using errcode='55000';
  end if;
  if new.offer_type='physical_purchase' then
    if item_row.experience_type<>'merch' or item_row.author_id is distinct from controls.platform_seller_id then
      raise exception 'Physical checkout is limited to 44-owned Merch.' using errcode='55000';
    end if;
  elsif new.offer_type='digital_download' then
    if item_row.experience_type not in ('music','book','asset')
      or not public.is_creator_paid_sales_enabled(item_row.author_id) then
      raise exception 'This creator is not enabled for paid sales.' using errcode='55000';
    end if;
  else
    raise exception 'This offer type is not enabled for Checkout.' using errcode='55000';
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_order_items_paid_sales_eligibility on public.commerce_order_items;
create trigger commerce_order_items_paid_sales_eligibility
before insert on public.commerce_order_items
for each row execute function public.enforce_commerce_order_item_eligibility();

-- Reconcile draft/active offers after the new gate exists. No commerce runtime
-- switch is changed and no creator is approved by this migration.
select public.refresh_creator_paid_offers(profile.id)
from public.profiles profile where profile.role in ('creator','admin');

revoke all on function public.creator_paid_sales_state_code(uuid),
  public.is_creator_paid_sales_enabled(uuid),public.get_creator_paid_sales_state(uuid),
  public.get_creator_paid_sales_public_status(uuid[]),public.refresh_creator_paid_offers(uuid),
  public.set_admin_creator_paid_sales(uuid,text,text),
  public.sync_creator_payout_capability(uuid,text,text,text,text,text,text,jsonb,text[])
from public,anon,authenticated;

grant execute on function public.get_creator_paid_sales_state(uuid) to authenticated,service_role;
grant execute on function public.get_creator_paid_sales_public_status(uuid[]) to anon,authenticated,service_role;
grant execute on function public.set_admin_creator_paid_sales(uuid,text,text) to authenticated,service_role;
grant execute on function public.sync_creator_payout_capability(uuid,text,text,text,text,text,text,jsonb,text[]) to service_role;

comment on table public.creator_paid_sales_access is
  'Audited 44 Admin decision for creator paid sales. Approval is not sufficient without verified provider payout capability.';
comment on function public.get_creator_paid_sales_public_status(uuid[]) is
  'Safe public paid-sales availability only; exposes no provider recipient identifiers or requirements.';
comment on function public.sync_creator_payout_capability(uuid,text,text,text,text,text,text,jsonb,text[]) is
  'Service-only provider capability synchronization. The client can never mark a creator payout-capable.';

commit;
