begin;

-- M12 forward migration: individual creator onboarding and operator-executed
-- Wise Business payouts. This migration does not call Wise, move money,
-- activate checkout, approve a tax policy, or delete historical provider data.

alter table public.creator_payout_accounts
  drop constraint if exists creator_payout_accounts_provider_check;
alter table public.creator_payout_accounts
  add constraint creator_payout_accounts_provider_check
  check (provider in ('wise_manual','stripe_connect','stripe_global_payouts','paypal'));

alter table public.creator_payout_capability_events
  drop constraint if exists creator_payout_capability_events_provider_check;
alter table public.creator_payout_capability_events
  add constraint creator_payout_capability_events_provider_check
  check (provider in ('wise_manual','stripe_connect','stripe_global_payouts','paypal'));

alter table public.creator_payout_batches
  drop constraint if exists creator_payout_batches_provider_check,
  drop constraint if exists creator_payout_batches_status_check;
alter table public.creator_payout_batches
  add constraint creator_payout_batches_provider_check
    check (provider in ('wise_manual','paypal')),
  add constraint creator_payout_batches_status_check
    check (status in (
      'draft','submitted','eligible','approved','processing','succeeded',
      'partially_failed','failed','canceled','reversed'
    )),
  add column if not exists cutoff_at timestamptz,
  add column if not exists membership_locked_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete restrict,
  add column if not exists approval_digest text,
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by uuid references public.profiles(id) on delete restrict,
  add column if not exists reconciliation_digest text,
  add column if not exists policy_version integer,
  add column if not exists source_currency text check (source_currency is null or source_currency ~ '^[A-Z]{3}$');
alter table public.creator_payout_batches
  add column if not exists gross_total_cents bigint not null default 0 check (gross_total_cents >= 0),
  add column if not exists withheld_tax_total_cents bigint not null default 0 check (withheld_tax_total_cents >= 0);
update public.creator_payout_batches
set gross_total_cents=total_cents
where gross_total_cents=0 and total_cents>0;

alter table public.creator_payout_items
  drop constraint if exists creator_payout_items_status_check;
alter table public.creator_payout_items
  add constraint creator_payout_items_status_check
    check (status in (
      'pending','accruing','tax_review','recipient_review','eligible','approved',
      'processing','succeeded','failed','blocked','held','returned','refunded',
      'unclaimed','canceled','reversed','paid'
    )),
  add column if not exists gross_payable_cents bigint,
  add column if not exists withheld_tax_cents bigint not null default 0 check (withheld_tax_cents >= 0),
  add column if not exists withholding_reason text,
  add column if not exists payout_fee_cents bigint not null default 0 check (payout_fee_cents >= 0),
  add column if not exists source_amount_cents bigint,
  add column if not exists source_currency text check (source_currency is null or source_currency ~ '^[A-Z]{3}$'),
  add column if not exists target_amount_minor bigint,
  add column if not exists target_currency text check (target_currency is null or target_currency ~ '^[A-Z]{3}$'),
  add column if not exists exchange_rate numeric,
  add column if not exists destination_snapshot text,
  add column if not exists wise_transfer_reference text,
  add column if not exists operator_recorded_at timestamptz,
  add column if not exists operator_recorded_by uuid references public.profiles(id) on delete restrict,
  add column if not exists provider_evidence_digest text,
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by uuid references public.profiles(id) on delete restrict,
  add column if not exists reconciliation_digest text;

create table public.creator_payout_runtime_controls (
  singleton boolean primary key default true check (singleton),
  selected_provider text not null default 'wise_manual' check (selected_provider='wise_manual'),
  batching_enabled boolean not null default false,
  operator_recording_enabled boolean not null default false,
  reconciliation_enabled boolean not null default false,
  emergency_stop boolean not null default true,
  minimum_payout_cents bigint not null default 5000 check (minimum_payout_cents >= 0),
  policy_version integer not null default 1 check (policy_version > 0),
  policy_approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (
    not (batching_enabled or operator_recording_enabled or reconciliation_enabled)
    or (not emergency_stop and policy_approved_at is not null and approved_by is not null)
  ),
  check (not reconciliation_enabled or operator_recording_enabled),
  check (not operator_recording_enabled or batching_enabled)
);
insert into public.creator_payout_runtime_controls(singleton) values(true);

create table public.creator_tax_policy (
  singleton boolean primary key default true check (singleton),
  version integer not null default 1 check (version > 0),
  us_w9_required_before_selling boolean not null default true,
  foreign_w8ben_required_before_selling boolean not null default true,
  income_classification text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  professional_reference text,
  updated_at timestamptz not null default now(),
  check (
    approved_at is null
    or (
      approved_by is not null
      and nullif(btrim(income_classification),'') is not null
      and nullif(btrim(professional_reference),'') is not null
    )
  )
);
insert into public.creator_tax_policy(singleton) values(true);

alter table public.profiles
  add constraint profiles_country_code_format_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  requested_username text;
  fallback_username text;
  requested_country text;
begin
  requested_username:=lower(trim(coalesce(new.raw_user_meta_data->>'username','')));
  fallback_username:=lower(regexp_replace(split_part(new.email,'@',1),'[^a-zA-Z0-9_]+','_','g'));
  fallback_username:=trim(both '_' from fallback_username);
  requested_country:=upper(trim(coalesce(new.raw_user_meta_data->>'country_code','')));
  if requested_username !~ '^[a-z0-9_]{3,32}$' then
    requested_username:=left(coalesce(nullif(fallback_username,''),'member'),23)||'_'||left(new.id::text,8);
  end if;
  if requested_country !~ '^[A-Z]{2}$' then requested_country:=null; end if;
  insert into public.profiles(id,display_name,username,country_code,home_country_code)
  values(
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),
      nullif(trim(new.raw_user_meta_data->>'name'),''),
      split_part(new.email,'@',1),'44 Member'),
    requested_username,requested_country,requested_country
  )
  on conflict(id) do update set
    country_code=coalesce(public.profiles.country_code,excluded.country_code),
    home_country_code=coalesce(public.profiles.home_country_code,excluded.home_country_code);
  return new;
end;
$$;

create table public.creator_payout_country_routes (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  target_currency text not null check (target_currency ~ '^[A-Z]{3}$'),
  method text not null default 'email_claim' check (method='email_claim'),
  status text not null default 'research'
    check (status in ('research','verified','suspended')),
  business_to_individual_confirmed boolean not null default false,
  email_claim_confirmed boolean not null default false,
  evidence_reference text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  revalidate_after timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code,target_currency,method),
  check (
    status<>'verified'
    or (
      business_to_individual_confirmed
      and email_claim_confirmed
      and verified_at is not null
      and verified_by is not null
      and revalidate_after is not null
      and revalidate_after>verified_at
      and nullif(btrim(evidence_reference),'') is not null
    )
  ),
  check (status<>'suspended' or suspended_at is not null)
);

create table public.creator_seller_onboarding (
  creator_id uuid primary key references public.profiles(id) on delete restrict,
  seller_type text not null default 'unanswered'
    check (seller_type in ('unanswered','individual','entity')),
  us_person_status text not null default 'unanswered'
    check (us_person_status in ('unanswered','us_person','foreign_person')),
  special_case text not null default 'none'
    check (special_case in ('none','possible_w8eci','possible_8233','contradictory','uncertain')),
  status text not null default 'required'
    check (status in (
      'required','country_waitlisted','entity_waitlisted','professional_review','tax_required',
      'tax_review','destination_required','destination_review','ready','suspended'
    )),
  policy_version integer,
  promoted_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  suspended_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'ready' or (seller_type='individual' and us_person_status<>'unanswered' and ready_at is not null))
);

create table public.creator_seller_notifications (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  title text not null,
  body text not null,
  href text not null default '/studio/onboarding',
  created_at timestamptz not null default now(),
  unique (creator_id,event_key)
);

create table public.creator_tax_documents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  form_type text not null check (form_type in ('w9','w8ben')),
  form_revision text not null check (form_revision in ('2024-03','2021-10')),
  immutable_digest text not null check (immutable_digest ~ '^[0-9a-f]{64}$'),
  signature_captured boolean not null,
  signed_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','expired','superseded','professional_review')),
  expires_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  review_reason text,
  change_in_circumstances_at timestamptz,
  supersedes_id uuid references public.creator_tax_documents(id) on delete restrict,
  unique (creator_id,immutable_digest),
  check (form_type<>'w8ben' or expires_at is not null),
  check (status<>'accepted' or (reviewed_at is not null and reviewed_by is not null))
);

create unique index creator_tax_documents_one_current_idx
  on public.creator_tax_documents(creator_id)
  where status in ('pending','accepted','professional_review');

create table public.creator_tax_document_payloads (
  document_id uuid primary key references public.creator_tax_documents(id) on delete restrict,
  ciphertext bytea not null,
  initialization_vector bytea not null,
  auth_tag bytea not null,
  encryption_key_version integer not null check (encryption_key_version > 0),
  content_type text not null default 'application/pdf' check (content_type='application/pdf'),
  byte_length integer not null check (byte_length between 1 and 5242880),
  created_at timestamptz not null default now()
);

create table public.creator_tax_access_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.creator_tax_documents(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('submitted','viewed','reviewed','downloaded','expired','superseded')),
  purpose text not null check (char_length(btrim(purpose)) between 3 and 500),
  created_at timestamptz not null default now()
);

create table public.creator_tax_reviewers (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table public.creator_payout_destinations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  version integer not null check (version > 0),
  route_id uuid not null references public.creator_payout_country_routes(id) on delete restrict,
  destination_type text not null default 'email_claim' check (destination_type='email_claim'),
  masked_display text not null check (char_length(masked_display) between 3 and 160),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  ciphertext bytea not null,
  initialization_vector bytea not null,
  auth_tag bytea not null,
  encryption_key_version integer not null check (encryption_key_version > 0),
  immutable_digest text not null check (immutable_digest ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending'
    check (status in ('pending','verified','replacement_pending','disabled')),
  verified_at timestamptz,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (creator_id,version),
  unique (creator_id,immutable_digest),
  unique (creator_id,route_id,version),
  check (status<>'verified' or verified_at is not null)
);

create unique index creator_payout_destinations_one_current_idx
  on public.creator_payout_destinations(creator_id)
  where status in ('pending','verified','replacement_pending');

create table public.creator_payout_destination_access_events (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.creator_payout_destinations(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('submitted','viewed_for_payout','verified','replacement_requested','disabled')),
  purpose text not null check (char_length(btrim(purpose)) between 3 and 500),
  created_at timestamptz not null default now()
);

create table public.creator_payout_item_earnings (
  payout_item_id uuid not null references public.creator_payout_items(id) on delete restrict,
  earnings_entry_id uuid not null references public.creator_earnings_entries(id) on delete restrict,
  amount_cents bigint not null,
  created_at timestamptz not null default now(),
  primary key (payout_item_id,earnings_entry_id),
  unique (earnings_entry_id)
);

create table public.creator_payout_manual_evidence (
  id uuid primary key default gen_random_uuid(),
  payout_item_id uuid not null references public.creator_payout_items(id) on delete restrict,
  evidence_type text not null check (evidence_type in ('wise_transfer','wise_receipt','wise_statement','bank_receipt','reconciliation')),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  provider_reference text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  unique (payout_item_id,evidence_type,evidence_digest)
);

create or replace function public.protect_creator_payout_batch_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.membership_locked_at is not null and (
    new.provider is distinct from old.provider
    or new.idempotency_key is distinct from old.idempotency_key
    or new.currency is distinct from old.currency
    or new.cutoff_at is distinct from old.cutoff_at
    or new.membership_locked_at is distinct from old.membership_locked_at
    or new.policy_version is distinct from old.policy_version
    or new.source_currency is distinct from old.source_currency
    or new.item_count is distinct from old.item_count
    or new.gross_total_cents is distinct from old.gross_total_cents
  ) then
    raise exception 'Payout batch membership and cutoff are immutable.' using errcode='55000';
  end if;
  return new;
end;
$$;

create trigger creator_payout_batches_identity_immutable
before update on public.creator_payout_batches
for each row execute function public.protect_creator_payout_batch_identity();

create or replace function public.reject_creator_payout_evidence_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception '% is immutable',tg_table_name using errcode='55000';
end;
$$;

create trigger creator_seller_notifications_immutable
before update or delete on public.creator_seller_notifications
for each row execute function public.reject_creator_payout_evidence_mutation();
create or replace function public.protect_creator_tax_document_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then
    raise exception 'creator_tax_documents is immutable' using errcode='55000';
  end if;
  if new.creator_id is distinct from old.creator_id
    or new.form_type is distinct from old.form_type
    or new.form_revision is distinct from old.form_revision
    or new.immutable_digest is distinct from old.immutable_digest
    or new.signature_captured is distinct from old.signature_captured
    or new.signed_at is distinct from old.signed_at
    or new.submitted_at is distinct from old.submitted_at
    or new.expires_at is distinct from old.expires_at
    or new.supersedes_id is distinct from old.supersedes_id then
    raise exception 'Tax document identity is immutable.' using errcode='55000';
  end if;
  return new;
end;
$$;
create trigger creator_tax_documents_identity_immutable
before update or delete on public.creator_tax_documents
for each row execute function public.protect_creator_tax_document_identity();
create trigger creator_tax_document_payloads_immutable
before update or delete on public.creator_tax_document_payloads
for each row execute function public.reject_creator_payout_evidence_mutation();
create trigger creator_tax_access_events_immutable
before update or delete on public.creator_tax_access_events
for each row execute function public.reject_creator_payout_evidence_mutation();
create trigger creator_payout_destination_access_events_immutable
before update or delete on public.creator_payout_destination_access_events
for each row execute function public.reject_creator_payout_evidence_mutation();
create trigger creator_payout_item_earnings_immutable
before update or delete on public.creator_payout_item_earnings
for each row execute function public.reject_creator_payout_evidence_mutation();
create trigger creator_payout_manual_evidence_immutable
before update or delete on public.creator_payout_manual_evidence
for each row execute function public.reject_creator_payout_evidence_mutation();

create trigger creator_seller_onboarding_touch_updated_at
before update on public.creator_seller_onboarding
for each row execute function public.touch_content_updated_at();
create trigger creator_payout_runtime_controls_touch_updated_at
before update on public.creator_payout_runtime_controls
for each row execute function public.touch_content_updated_at();
create trigger creator_tax_policy_touch_updated_at
before update on public.creator_tax_policy
for each row execute function public.touch_content_updated_at();
create trigger creator_payout_country_routes_touch_updated_at
before update on public.creator_payout_country_routes
for each row execute function public.touch_content_updated_at();

alter table public.creator_payout_runtime_controls enable row level security;
alter table public.creator_tax_policy enable row level security;
alter table public.creator_payout_country_routes enable row level security;
alter table public.creator_seller_onboarding enable row level security;
alter table public.creator_seller_notifications enable row level security;
alter table public.creator_tax_documents enable row level security;
alter table public.creator_tax_document_payloads enable row level security;
alter table public.creator_tax_access_events enable row level security;
alter table public.creator_tax_reviewers enable row level security;
alter table public.creator_payout_destinations enable row level security;
alter table public.creator_payout_destination_access_events enable row level security;
alter table public.creator_payout_item_earnings enable row level security;
alter table public.creator_payout_manual_evidence enable row level security;

create policy creator_seller_notifications_owner_read
on public.creator_seller_notifications for select to authenticated
using (creator_id=auth.uid());

revoke all on public.creator_payout_runtime_controls,public.creator_tax_policy,
  public.creator_payout_country_routes,
  public.creator_seller_onboarding,public.creator_seller_notifications,
  public.creator_tax_documents,public.creator_tax_document_payloads,
  public.creator_tax_access_events,public.creator_tax_reviewers,
  public.creator_payout_destinations,public.creator_payout_destination_access_events,
  public.creator_payout_item_earnings,public.creator_payout_manual_evidence
from public,anon,authenticated;
grant select on public.creator_seller_notifications to authenticated;
grant all on public.creator_payout_runtime_controls,public.creator_tax_policy,
  public.creator_payout_country_routes,
  public.creator_seller_onboarding,public.creator_seller_notifications,
  public.creator_tax_documents,public.creator_tax_document_payloads,
  public.creator_tax_access_events,public.creator_tax_reviewers,
  public.creator_payout_destinations,public.creator_payout_destination_access_events,
  public.creator_payout_item_earnings,public.creator_payout_manual_evidence
to service_role;

create or replace function public.is_creator_tax_reviewer()
returns boolean language sql security definer stable set search_path=public as $$
  select auth.role()='service_role' or exists(
    select 1 from public.creator_tax_reviewers reviewer
    where reviewer.user_id=auth.uid() and reviewer.disabled_at is null
  );
$$;

create or replace function public.creator_gross_earnings_cents(target_creator_id uuid)
returns bigint language sql security definer stable set search_path=public as $$
  select coalesce(sum(entry.amount_cents),0)::bigint
  from public.creator_earnings_entries entry
  where entry.creator_id=target_creator_id;
$$;

create or replace function public.get_creator_country_payout_route(
  target_creator_id uuid default auth.uid()
) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare profile_country text;
declare route public.creator_payout_country_routes;
begin
  if target_creator_id is null then raise exception 'Account not found.' using errcode='P0002'; end if;
  if auth.role()<>'service_role' and auth.uid()<>target_creator_id and not public.is_platform_admin() then
    raise exception 'Payout route access denied.' using errcode='42501';
  end if;
  select country_code into profile_country from public.profiles where id=target_creator_id;
  if not found then raise exception 'Account not found.' using errcode='P0002'; end if;
  select * into route
  from public.creator_payout_country_routes candidate
  where candidate.country_code=profile_country
    and candidate.method='email_claim'
    and candidate.status='verified'
    and candidate.revalidate_after>now()
  order by candidate.verified_at desc,candidate.id
  limit 1;
  return jsonb_build_object(
    'country_code',profile_country,
    'eligible',found,
    'route_id',route.id,
    'currency',route.target_currency,
    'method',case when found then 'email_claim' else null end,
    'revalidate_after',route.revalidate_after
  );
end;
$$;

create or replace function public.set_admin_creator_payout_country_route(
  target_country_code text,requested_currency text,target_status text,
  target_evidence_reference text,target_revalidate_after timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare route_id uuid;
declare normalized_country text:=upper(btrim(target_country_code));
declare normalized_currency text:=upper(btrim(requested_currency));
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if normalized_country !~ '^[A-Z]{2}$' or normalized_currency !~ '^[A-Z]{3}$'
    or target_status not in ('verified','suspended') then
    raise exception 'Payout route decision is invalid.' using errcode='22023';
  end if;
  if target_status='verified' and (
    nullif(btrim(coalesce(target_evidence_reference,'')),'') is null
    or target_revalidate_after is null
    or target_revalidate_after<=now()
  ) then raise exception 'Verified route evidence and revalidation date are required.' using errcode='22023';
  end if;
  insert into public.creator_payout_country_routes(
    country_code,target_currency,method,status,business_to_individual_confirmed,
    email_claim_confirmed,evidence_reference,verified_at,verified_by,revalidate_after,suspended_at
  ) values(
    normalized_country,normalized_currency,'email_claim',target_status,
    target_status='verified',target_status='verified',
    nullif(btrim(target_evidence_reference),''),
    case when target_status='verified' then now() else null end,
    auth.uid(),case when target_status='verified' then target_revalidate_after else null end,
    case when target_status='suspended' then now() else null end
  ) on conflict(country_code,target_currency,method) do update set
    status=excluded.status,
    business_to_individual_confirmed=excluded.business_to_individual_confirmed,
    email_claim_confirmed=excluded.email_claim_confirmed,
    evidence_reference=excluded.evidence_reference,
    verified_at=excluded.verified_at,
    verified_by=excluded.verified_by,
    revalidate_after=excluded.revalidate_after,
    suspended_at=excluded.suspended_at,
    updated_at=now()
  returning id into route_id;
  update public.creator_seller_onboarding onboarding set
    status=case
      when target_status='suspended' and profile.country_code=normalized_country then 'country_waitlisted'
      when target_status='verified' and profile.country_code=normalized_country
        and onboarding.status='country_waitlisted' then 'required'
      else onboarding.status end,
    ready_at=case when target_status='suspended' and profile.country_code=normalized_country then null else onboarding.ready_at end
  from public.profiles profile
  where profile.id=onboarding.creator_id and profile.country_code=normalized_country;
  return route_id;
end;
$$;

create or replace function public.creator_seller_state_code(target_creator_id uuid)
returns text language plpgsql security definer stable set search_path=public as $$
declare onboarding public.creator_seller_onboarding;
declare tax_policy public.creator_tax_policy;
declare tax_document public.creator_tax_documents;
declare destination public.creator_payout_destinations;
declare profile_country text;
declare route public.creator_payout_country_routes;
begin
  if exists(
    select 1 from public.commerce_runtime_controls controls
    where controls.singleton and controls.platform_seller_id=target_creator_id
  ) then return 'ready'; end if;
  select country_code into profile_country from public.profiles
  where id=target_creator_id and role='creator';
  if not found then return 'not_creator'; end if;
  if profile_country is null then return 'country_required'; end if;
  select * into route from public.creator_payout_country_routes
  where country_code=profile_country and method='email_claim' and status='verified'
    and revalidate_after>now()
  order by verified_at desc,id limit 1;
  if not found then return 'country_waitlisted'; end if;
  select * into onboarding from public.creator_seller_onboarding where creator_id=target_creator_id;
  if not found then return 'required'; end if;
  if onboarding.status in ('country_waitlisted','entity_waitlisted','professional_review','suspended') then return onboarding.status; end if;
  if onboarding.seller_type<>'individual' or onboarding.us_person_status='unanswered' then return 'required'; end if;
  select * into tax_policy from public.creator_tax_policy where singleton;
  if tax_policy.approved_at is null then return 'tax_policy_pending'; end if;
  select * into destination from public.creator_payout_destinations
  where creator_id=target_creator_id and route_id=route.id and status='verified'
  order by version desc limit 1;
  if not found then return 'destination_required'; end if;
  select * into tax_document from public.creator_tax_documents
  where creator_id=target_creator_id
    and form_type=case when onboarding.us_person_status='us_person' then 'w9' else 'w8ben' end
    and status='accepted'
    and (form_type<>'w8ben' or expires_at>now())
    and change_in_circumstances_at is null
  order by submitted_at desc limit 1;
  if not found then return 'tax_required'; end if;
  return 'ready';
end;
$$;

create or replace function public.get_creator_seller_onboarding_state(target_creator_id uuid default auth.uid())
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare onboarding public.creator_seller_onboarding;
declare destination public.creator_payout_destinations;
declare tax_policy public.creator_tax_policy;
declare route jsonb;
declare state_code text;
declare expected_form text;
begin
  if target_creator_id is null then raise exception 'Creator not found.' using errcode='P0002'; end if;
  if auth.role()<>'service_role' and auth.uid()<>target_creator_id and not public.is_platform_admin() then
    raise exception 'Seller onboarding access denied.' using errcode='42501';
  end if;
  select * into onboarding from public.creator_seller_onboarding where creator_id=target_creator_id;
  select * into destination from public.creator_payout_destinations
    where creator_id=target_creator_id and status in ('pending','verified','replacement_pending')
    order by version desc limit 1;
  select * into tax_policy from public.creator_tax_policy where singleton;
  route:=public.get_creator_country_payout_route(target_creator_id);
  state_code:=public.creator_seller_state_code(target_creator_id);
  expected_form:=case
    when onboarding.us_person_status='foreign_person' then 'w8ben'
    when onboarding.us_person_status='us_person' then 'w9'
    else null end;
  return jsonb_build_object(
    'creator_id',target_creator_id,
    'country_code',route->>'country_code',
    'country_eligible',coalesce((route->>'eligible')::boolean,false),
    'payout_route_id',route->>'route_id',
    'payout_route_currency',route->>'currency',
    'payout_route_method',route->>'method',
    'payout_route_revalidate_after',route->>'revalidate_after',
    'state',state_code,
    'can_create_items',state_code='ready',
    'seller_type',coalesce(onboarding.seller_type,'unanswered'),
    'us_person_status',coalesce(onboarding.us_person_status,'unanswered'),
    'special_case',coalesce(onboarding.special_case,'none'),
    'expected_tax_form',expected_form,
    'tax_policy_approved',tax_policy.approved_at is not null,
    'destination_status',destination.status,
    'destination_type',destination.destination_type,
    'destination_masked',destination.masked_display,
    'destination_country',destination.country_code,
    'destination_currency',destination.currency,
    'gross_earnings_cents',public.creator_gross_earnings_cents(target_creator_id),
    'notifications',coalesce((select jsonb_agg(jsonb_build_object(
      'id',notice.id,'title',notice.title,'body',notice.body,'href',notice.href,'created_at',notice.created_at
    ) order by notice.created_at desc) from public.creator_seller_notifications notice
      where notice.creator_id=target_creator_id),'[]'::jsonb)
  );
end;
$$;

create or replace function public.begin_creator_seller_onboarding(
  target_seller_type text,target_us_person_status text,target_special_case text default 'none'
) returns jsonb language plpgsql security definer set search_path=public as $$
declare next_status text;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='creator') then
    raise exception 'Creator access required.' using errcode='42501';
  end if;
  if target_seller_type not in ('individual','entity')
    or target_us_person_status not in ('us_person','foreign_person')
    or target_special_case not in ('none','possible_w8eci','possible_8233','contradictory','uncertain') then
    raise exception 'Seller classification is invalid.' using errcode='22023';
  end if;
  next_status:=case
    when target_seller_type='entity' then 'entity_waitlisted'
    when target_special_case<>'none' then 'professional_review'
    else 'tax_required' end;
  insert into public.creator_seller_onboarding(
    creator_id,seller_type,us_person_status,special_case,status,started_at
  ) values(auth.uid(),target_seller_type,target_us_person_status,target_special_case,next_status,now())
  on conflict(creator_id) do update set
    seller_type=excluded.seller_type,us_person_status=excluded.us_person_status,
    special_case=excluded.special_case,status=excluded.status,started_at=coalesce(public.creator_seller_onboarding.started_at,now()),
    ready_at=null,updated_at=now();
  return public.get_creator_seller_onboarding_state(auth.uid());
end;
$$;

create or replace function public.store_creator_tax_document(
  target_creator_id uuid,target_form_type text,target_form_revision text,target_digest text,
  target_signed_at timestamptz,target_expires_at timestamptz,target_ciphertext bytea,
  target_iv bytea,target_auth_tag bytea,target_key_version integer,target_byte_length integer
) returns uuid language plpgsql security definer set search_path=public as $$
declare document_id uuid;
declare expected_form text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_form_type not in ('w9','w8ben')
    or (target_form_type='w9' and target_form_revision<>'2024-03')
    or (target_form_type='w8ben' and target_form_revision<>'2021-10')
    or target_digest !~ '^[0-9a-f]{64}$'
    or target_byte_length not between 1 and 5242880
    or (target_form_type='w8ben' and target_expires_at is null) then
    raise exception 'Tax document metadata is invalid.' using errcode='22023';
  end if;
  select case
    when us_person_status='us_person' then 'w9'
    when us_person_status='foreign_person' then 'w8ben'
    else null end into expected_form
  from public.creator_seller_onboarding where creator_id=target_creator_id;
  if expected_form is null or expected_form<>target_form_type then
    raise exception 'Tax form does not match the creator certification.' using errcode='22023';
  end if;
  update public.creator_tax_documents set status='superseded'
  where creator_id=target_creator_id and status in ('pending','accepted','professional_review');
  insert into public.creator_tax_documents(
    creator_id,form_type,form_revision,immutable_digest,signature_captured,signed_at,expires_at,status
  ) values(target_creator_id,target_form_type,target_form_revision,target_digest,true,target_signed_at,target_expires_at,'pending')
  returning id into document_id;
  insert into public.creator_tax_document_payloads(
    document_id,ciphertext,initialization_vector,auth_tag,encryption_key_version,byte_length
  ) values(document_id,target_ciphertext,target_iv,target_auth_tag,target_key_version,target_byte_length);
  insert into public.creator_tax_access_events(document_id,actor_id,action,purpose)
  values(document_id,target_creator_id,'submitted','Creator submitted signed official IRS form.');
  update public.creator_seller_onboarding set status='tax_review',ready_at=null
  where creator_id=target_creator_id;
  return document_id;
end;
$$;

create or replace function public.set_admin_creator_tax_reviewer(
  target_user_id uuid,target_enabled boolean
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=target_user_id) then
    raise exception 'Reviewer account not found.' using errcode='P0002';
  end if;
  insert into public.creator_tax_reviewers(user_id,approved_by,disabled_at)
  values(target_user_id,auth.uid(),case when target_enabled then null else now() end)
  on conflict(user_id) do update set
    approved_by=auth.uid(),approved_at=now(),
    disabled_at=case when target_enabled then null else now() end;
end;
$$;

create or replace function public.approve_creator_tax_policy(
  target_version integer,target_income_classification text,target_professional_reference text
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_creator_tax_reviewer() then
    raise exception 'Tax reviewer access required.' using errcode='42501';
  end if;
  if target_version<1
    or char_length(btrim(coalesce(target_income_classification,''))) not between 3 and 500
    or char_length(btrim(coalesce(target_professional_reference,''))) not between 3 and 500 then
    raise exception 'Tax policy approval is invalid.' using errcode='22023';
  end if;
  update public.creator_tax_policy set
    version=target_version,
    income_classification=btrim(target_income_classification),
    professional_reference=btrim(target_professional_reference),
    approved_at=now(),approved_by=auth.uid()
  where singleton;
end;
$$;

create or replace function public.review_creator_tax_document(
  target_document_id uuid,target_decision text,target_reason text
) returns void language plpgsql security definer set search_path=public as $$
declare document_row public.creator_tax_documents;
begin
  if not public.is_creator_tax_reviewer() then raise exception 'Tax reviewer access required.' using errcode='42501'; end if;
  if target_decision not in ('accepted','rejected','professional_review')
    or char_length(btrim(coalesce(target_reason,''))) not between 3 and 500 then
    raise exception 'Tax review decision is invalid.' using errcode='22023';
  end if;
  select * into document_row from public.creator_tax_documents where id=target_document_id for update;
  if not found then raise exception 'Tax document not found.' using errcode='P0002'; end if;
  if document_row.status<>'pending' then raise exception 'Tax document has already been reviewed.' using errcode='55000'; end if;
  update public.creator_tax_documents set status=target_decision,reviewed_at=now(),reviewed_by=auth.uid(),review_reason=btrim(target_reason)
  where id=target_document_id;
  insert into public.creator_tax_access_events(document_id,actor_id,action,purpose)
  values(target_document_id,auth.uid(),'reviewed',btrim(target_reason));
  update public.creator_seller_onboarding set
    status=case when target_decision='accepted' then 'destination_required'
      when target_decision='professional_review' then 'professional_review' else 'tax_required' end,
    ready_at=null
  where creator_id=document_row.creator_id;
end;
$$;

create or replace function public.store_creator_payout_destination(
  target_creator_id uuid,target_route_id uuid,target_masked_display text,
  target_digest text,target_ciphertext bytea,
  target_iv bytea,target_auth_tag bytea,target_key_version integer
) returns uuid language plpgsql security definer set search_path=public as $$
declare destination_id uuid;
declare next_version integer;
declare route public.creator_payout_country_routes;
declare profile_country text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_digest !~ '^[0-9a-f]{64}$'
    or char_length(target_masked_display) not between 3 and 160 then
    raise exception 'Payout destination metadata is invalid.' using errcode='22023';
  end if;
  select country_code into profile_country from public.profiles
  where id=target_creator_id and role='creator';
  if not found then raise exception 'Creator not found.' using errcode='P0002'; end if;
  select * into route from public.creator_payout_country_routes
  where id=target_route_id and country_code=profile_country and method='email_claim'
    and status='verified' and revalidate_after>now();
  if not found then
    raise exception 'The creator country does not have a verified Wise email route.' using errcode='55000';
  end if;
  select coalesce(max(version),0)+1 into next_version from public.creator_payout_destinations where creator_id=target_creator_id;
  update public.creator_payout_destinations set status='disabled',replaced_at=now()
  where creator_id=target_creator_id and status in ('pending','verified','replacement_pending');
  insert into public.creator_payout_destinations(
    creator_id,version,route_id,destination_type,masked_display,country_code,currency,
    ciphertext,initialization_vector,auth_tag,encryption_key_version,immutable_digest,status,verified_at
  ) values(
    target_creator_id,next_version,route.id,'email_claim',target_masked_display,route.country_code,route.target_currency,
    target_ciphertext,target_iv,target_auth_tag,target_key_version,target_digest,'verified',now()
  ) returning id into destination_id;
  insert into public.creator_payout_destination_access_events(destination_id,actor_id,action,purpose)
  values(destination_id,target_creator_id,'submitted','Creator submitted private Wise payout destination.');
  insert into public.creator_payout_accounts(
    creator_id,provider,provider_recipient_ref,recipient_country_code,preferred_currency,status,
    capabilities,requirements_due,last_provider_sync_at,verified_at
  ) values(
    target_creator_id,'wise_manual',destination_id::text,route.country_code,route.target_currency,'verified',
    jsonb_build_object(
      'method','email_claim','operator_executed',true,'bank_data_stored_by_44os',false
    ),'{}',now(),now()
  ) on conflict(creator_id,provider) do update set
    provider_recipient_ref=excluded.provider_recipient_ref,
    recipient_country_code=excluded.recipient_country_code,
    preferred_currency=excluded.preferred_currency,status='verified',
    capabilities=excluded.capabilities,requirements_due='{}',last_provider_sync_at=now(),
    verified_at=now(),disabled_at=null,updated_at=now();
  update public.creator_seller_onboarding set
    status=case when public.creator_seller_state_code(target_creator_id)='ready' then 'ready' else status end,
    ready_at=case when public.creator_seller_state_code(target_creator_id)='ready' then now() else null end
  where creator_id=target_creator_id;
  return destination_id;
end;
$$;

create or replace function public.set_creator_payout_runtime_controls(
  target_batching_enabled boolean,target_operator_recording_enabled boolean,
  target_reconciliation_enabled boolean,target_emergency_stop boolean,
  target_minimum_payout_cents bigint,target_policy_version integer
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if target_minimum_payout_cents<0 or target_policy_version<1 then
    raise exception 'Payout controls are invalid.' using errcode='22023';
  end if;
  update public.creator_payout_runtime_controls set
    batching_enabled=target_batching_enabled,
    operator_recording_enabled=target_operator_recording_enabled,
    reconciliation_enabled=target_reconciliation_enabled,
    emergency_stop=target_emergency_stop,
    minimum_payout_cents=target_minimum_payout_cents,
    policy_version=target_policy_version,
    policy_approved_at=case
      when target_batching_enabled or target_operator_recording_enabled or target_reconciliation_enabled
        then now()
      else policy_approved_at end,
    approved_by=case
      when target_batching_enabled or target_operator_recording_enabled or target_reconciliation_enabled
        then auth.uid()
      else approved_by end
  where singleton;
end;
$$;

create or replace function public.create_creator_payout_batch(
  target_cutoff_at timestamptz,target_currency text,target_idempotency_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare controls public.creator_payout_runtime_controls;
declare tax_policy public.creator_tax_policy;
declare normalized_currency text:=upper(btrim(target_currency));
declare created_batch_id uuid;
declare candidate record;
declare item_id uuid;
declare final_count integer;
declare final_total bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if target_cutoff_at is null or target_cutoff_at>now()
    or normalized_currency !~ '^[A-Z]{3}$'
    or char_length(btrim(coalesce(target_idempotency_key,''))) not between 8 and 160 then
    raise exception 'Payout batch request is invalid.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('44os-wise-manual-batching',0));
  select * into controls from public.creator_payout_runtime_controls where singleton for update;
  select * into tax_policy from public.creator_tax_policy where singleton;
  if controls.emergency_stop or not controls.batching_enabled or controls.selected_provider<>'wise_manual'
    or controls.policy_approved_at is null then
    raise exception 'Wise payout batching is disabled.' using errcode='55000';
  end if;
  if tax_policy.approved_at is null then
    raise exception 'The creator tax policy has not been professionally approved.' using errcode='55000';
  end if;
  select id into created_batch_id from public.creator_payout_batches
  where provider='wise_manual' and idempotency_key=btrim(target_idempotency_key);
  if found then return created_batch_id; end if;
  insert into public.creator_payout_batches(
    provider,idempotency_key,status,currency,cutoff_at,policy_version,source_currency
  ) values(
    'wise_manual',btrim(target_idempotency_key),'draft',normalized_currency,
    target_cutoff_at,controls.policy_version,normalized_currency
  ) returning id into created_batch_id;
  for candidate in
    select entry.creator_id,sum(entry.amount_cents)::bigint as gross_cents,
      account.id as payout_account_id,destination.masked_display
    from public.creator_earnings_entries entry
    join public.creator_payout_accounts account
      on account.creator_id=entry.creator_id and account.provider='wise_manual' and account.status='verified'
    join public.creator_payout_destinations destination
      on destination.id=account.provider_recipient_ref::uuid and destination.status='verified'
    where entry.currency=normalized_currency
      and entry.entry_type<>'payout'
      and entry.created_at<=target_cutoff_at
      and coalesce(entry.available_at,entry.created_at)<=target_cutoff_at
      and not exists(
        select 1 from public.creator_payout_item_earnings membership
        where membership.earnings_entry_id=entry.id
      )
      and public.creator_seller_state_code(entry.creator_id)='ready'
    group by entry.creator_id,account.id,destination.masked_display
    having sum(entry.amount_cents)>=controls.minimum_payout_cents
    order by entry.creator_id
  loop
    insert into public.creator_payout_items(
      batch_id,payout_account_id,creator_id,sender_item_id,status,amount_cents,currency,
      gross_payable_cents,source_amount_cents,source_currency,target_currency,destination_snapshot
    ) values(
      created_batch_id,candidate.payout_account_id,candidate.creator_id,
      '44os-'||replace(created_batch_id::text,'-','')||'-'||replace(candidate.creator_id::text,'-',''),
      'eligible',candidate.gross_cents,normalized_currency,candidate.gross_cents,
      candidate.gross_cents,normalized_currency,normalized_currency,candidate.masked_display
    ) returning id into item_id;
    insert into public.creator_payout_item_earnings(payout_item_id,earnings_entry_id,amount_cents)
    select item_id,entry.id,entry.amount_cents
    from public.creator_earnings_entries entry
    where entry.creator_id=candidate.creator_id
      and entry.currency=normalized_currency
      and entry.entry_type<>'payout'
      and entry.created_at<=target_cutoff_at
      and coalesce(entry.available_at,entry.created_at)<=target_cutoff_at
      and not exists(
        select 1 from public.creator_payout_item_earnings membership
        where membership.earnings_entry_id=entry.id
      );
  end loop;
  select count(*),coalesce(sum(amount_cents),0)::bigint into final_count,final_total
  from public.creator_payout_items where creator_payout_items.batch_id=created_batch_id;
  update public.creator_payout_batches set
    item_count=final_count,total_cents=final_total,gross_total_cents=final_total,
    withheld_tax_total_cents=0,status='eligible',membership_locked_at=now()
  where id=created_batch_id;
  return created_batch_id;
end;
$$;

create or replace function public.set_creator_payout_item_withholding(
  target_payout_item_id uuid,target_withheld_tax_cents bigint,target_reason text
) returns void language plpgsql security definer set search_path=public as $$
declare item public.creator_payout_items;
begin
  if not public.is_creator_tax_reviewer() then
    raise exception 'Tax reviewer access required.' using errcode='42501';
  end if;
  select * into item from public.creator_payout_items where id=target_payout_item_id for update;
  if not found then raise exception 'Payout item not found.' using errcode='P0002'; end if;
  if item.status<>'eligible' or target_withheld_tax_cents<0
    or target_withheld_tax_cents>=coalesce(item.gross_payable_cents,item.amount_cents)
    or char_length(btrim(coalesce(target_reason,''))) not between 3 and 500 then
    raise exception 'Withholding decision is invalid.' using errcode='22023';
  end if;
  update public.creator_payout_items set
    withheld_tax_cents=target_withheld_tax_cents,
    withholding_reason=btrim(target_reason),
    amount_cents=coalesce(gross_payable_cents,amount_cents)-target_withheld_tax_cents,
    source_amount_cents=coalesce(gross_payable_cents,amount_cents)-target_withheld_tax_cents
  where id=target_payout_item_id;
  update public.creator_payout_batches batch set
    total_cents=totals.net_total,
    withheld_tax_total_cents=totals.withheld_total
  from (
    select batch_id,sum(amount_cents)::bigint as net_total,
      sum(withheld_tax_cents)::bigint as withheld_total
    from public.creator_payout_items where batch_id=item.batch_id group by batch_id
  ) totals
  where batch.id=totals.batch_id;
end;
$$;

create or replace function public.approve_creator_payout_batch(
  target_batch_id uuid,target_approval_digest text
) returns void language plpgsql security definer set search_path=public as $$
declare controls public.creator_payout_runtime_controls;
declare batch public.creator_payout_batches;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if target_approval_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'Approval evidence digest is invalid.' using errcode='22023';
  end if;
  select * into controls from public.creator_payout_runtime_controls where singleton;
  select * into batch from public.creator_payout_batches where id=target_batch_id for update;
  if not found then raise exception 'Payout batch not found.' using errcode='P0002'; end if;
  if controls.emergency_stop or not controls.batching_enabled or batch.status<>'eligible'
    or batch.item_count<1 then
    raise exception 'Payout batch cannot be approved.' using errcode='55000';
  end if;
  update public.creator_payout_items set status='approved' where batch_id=target_batch_id and status='eligible';
  update public.creator_payout_batches set
    status='approved',approved_at=now(),approved_by=auth.uid(),approval_digest=target_approval_digest
  where id=target_batch_id;
end;
$$;

create or replace function public.record_creator_wise_manual_transfer(
  target_payout_item_id uuid,target_provider_reference text,target_source_amount_cents bigint,
  target_source_currency text,target_target_amount_minor bigint,target_target_currency text,
  target_exchange_rate numeric,target_fee_cents bigint,target_evidence_digest text
) returns void language plpgsql security definer set search_path=public as $$
declare controls public.creator_payout_runtime_controls;
declare item public.creator_payout_items;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  select * into controls from public.creator_payout_runtime_controls where singleton;
  select * into item from public.creator_payout_items where id=target_payout_item_id for update;
  if not found then raise exception 'Payout item not found.' using errcode='P0002'; end if;
  if controls.emergency_stop or not controls.operator_recording_enabled
    or item.status not in ('approved','processing')
    or char_length(btrim(coalesce(target_provider_reference,''))) not between 3 and 255
    or target_source_amount_cents<>item.amount_cents
    or upper(target_source_currency)<>item.currency
    or target_target_amount_minor<1 or upper(target_target_currency) !~ '^[A-Z]{3}$'
    or target_exchange_rate<=0 or target_fee_cents<0
    or target_evidence_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'Wise transfer evidence is invalid.' using errcode='22023';
  end if;
  if item.status='processing' then
    if item.wise_transfer_reference=btrim(target_provider_reference)
      and item.provider_evidence_digest=target_evidence_digest then return; end if;
    raise exception 'A different Wise transfer is already recorded.' using errcode='55000';
  end if;
  insert into public.creator_payout_manual_evidence(
    payout_item_id,evidence_type,evidence_digest,provider_reference,recorded_by,metadata
  ) values(
    item.id,'wise_transfer',target_evidence_digest,btrim(target_provider_reference),auth.uid(),
    jsonb_build_object('source_amount_cents',target_source_amount_cents,
      'source_currency',upper(target_source_currency),'target_amount_minor',target_target_amount_minor,
      'target_currency',upper(target_target_currency),'exchange_rate',target_exchange_rate,
      'fee_cents',target_fee_cents)
  );
  update public.creator_payout_items set
    status='processing',wise_transfer_reference=btrim(target_provider_reference),
    source_amount_cents=target_source_amount_cents,source_currency=upper(target_source_currency),
    target_amount_minor=target_target_amount_minor,target_currency=upper(target_target_currency),
    exchange_rate=target_exchange_rate,payout_fee_cents=target_fee_cents,
    operator_recorded_at=now(),operator_recorded_by=auth.uid(),
    provider_evidence_digest=target_evidence_digest
  where id=item.id;
  update public.creator_payout_batches set status='processing',submitted_at=coalesce(submitted_at,now())
  where id=item.batch_id and status='approved';
end;
$$;

create or replace function public.reconcile_creator_wise_manual_payout(
  target_payout_item_id uuid,target_result text,target_reconciliation_digest text,
  target_evidence_digest text
) returns void language plpgsql security definer set search_path=public as $$
declare controls public.creator_payout_runtime_controls;
declare item public.creator_payout_items;
declare batch_status text;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  select * into controls from public.creator_payout_runtime_controls where singleton;
  select * into item from public.creator_payout_items where id=target_payout_item_id for update;
  if not found then raise exception 'Payout item not found.' using errcode='P0002'; end if;
  if controls.emergency_stop or not controls.reconciliation_enabled
    or item.status<>'processing' or target_result not in ('paid','failed','returned')
    or target_reconciliation_digest !~ '^[0-9a-f]{64}$'
    or target_evidence_digest !~ '^[0-9a-f]{64}$'
    or item.operator_recorded_by=auth.uid() then
    raise exception 'Independent payout reconciliation is invalid.' using errcode='55000';
  end if;
  insert into public.creator_payout_manual_evidence(
    payout_item_id,evidence_type,evidence_digest,provider_reference,recorded_by,metadata
  ) values(
    item.id,'reconciliation',target_evidence_digest,item.wise_transfer_reference,auth.uid(),
    jsonb_build_object('result',target_result,'reconciliation_digest',target_reconciliation_digest)
  );
  if target_result='paid' then
    if item.wise_transfer_reference is null or item.provider_evidence_digest is null then
      raise exception 'Wise transfer evidence is incomplete.' using errcode='55000';
    end if;
    insert into public.creator_earnings_entries(
      creator_id,entry_type,amount_cents,currency,source_provider,source_reference,available_at,metadata
    ) values(
      item.creator_id,'payout',-item.amount_cents,item.currency,'wise_manual',
      item.wise_transfer_reference,now(),
      jsonb_build_object('payout_item_id',item.id,'reconciliation_digest',target_reconciliation_digest)
    ) on conflict do nothing;
  end if;
  update public.creator_payout_items set
    status=target_result,completed_at=now(),reconciled_at=now(),reconciled_by=auth.uid(),
    reconciliation_digest=target_reconciliation_digest,
    failure_code=case when target_result='failed' then 'wise_manual_failed'
      when target_result='returned' then 'wise_manual_returned' else null end
  where id=item.id;
  select case
    when bool_and(status='paid') then 'succeeded'
    when bool_or(status in ('failed','returned')) and bool_or(status='paid') then 'partially_failed'
    when bool_and(status in ('failed','returned')) then 'failed'
    else 'processing' end
  into batch_status from public.creator_payout_items where batch_id=item.batch_id;
  update public.creator_payout_batches set
    status=batch_status,
    completed_at=case when batch_status in ('succeeded','partially_failed','failed') then now() else null end,
    reconciled_at=case when batch_status in ('succeeded','partially_failed','failed') then now() else null end,
    reconciled_by=case when batch_status in ('succeeded','partially_failed','failed') then auth.uid() else null end,
    reconciliation_digest=case when batch_status in ('succeeded','partially_failed','failed')
      then target_reconciliation_digest else null end
  where id=item.batch_id;
end;
$$;

create or replace function public.creator_paid_sales_state_code(target_creator_id uuid)
returns text language plpgsql security definer stable set search_path=public as $$
declare seller_state text;
begin
  if exists(
    select 1 from public.commerce_runtime_controls controls
    where controls.singleton and controls.platform_seller_id=target_creator_id
  ) then return 'enabled'; end if;
  seller_state:=public.creator_seller_state_code(target_creator_id);
  return case seller_state
    when 'ready' then 'enabled'
    when 'required' then 'onboarding_required'
    when 'destination_required' then 'onboarding_required'
    when 'tax_required' then 'pending_tax'
    when 'tax_policy_pending' then 'pending_tax'
    when 'country_required' then 'country_unavailable'
    when 'country_waitlisted' then 'country_unavailable'
    when 'entity_waitlisted' then 'entity_waitlisted'
    when 'professional_review' then 'restricted'
    when 'suspended' then 'disabled'
    else 'pending_provider' end;
end;
$$;

create or replace function public.get_creator_paid_sales_state(target_creator_id uuid default auth.uid())
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare seller jsonb;
declare state_code text;
declare is_platform_seller boolean;
begin
  if target_creator_id is null then raise exception 'Creator not found.' using errcode='P0002'; end if;
  if auth.role()<>'service_role' and auth.uid()<>target_creator_id and not public.is_platform_admin() then
    raise exception 'Creator commerce access denied.' using errcode='42501';
  end if;
  select exists(select 1 from public.commerce_runtime_controls controls
    where controls.singleton and controls.platform_seller_id=target_creator_id) into is_platform_seller;
  seller:=public.get_creator_seller_onboarding_state(target_creator_id);
  state_code:=public.creator_paid_sales_state_code(target_creator_id);
  return jsonb_build_object(
    'creator_id',target_creator_id,'can_sell_paid',state_code='enabled','state',state_code,
    'is_platform_seller',is_platform_seller,
    'admin_status',case when is_platform_seller or exists(select 1 from public.profiles where id=target_creator_id and role='creator')
      then 'approved' else 'not_reviewed' end,
    'decision_reason',case when is_platform_seller then '44 platform seller' else 'Creator role promotion' end,
    'approved_at',(select max(created_at) from public.admin_profile_role_events where profile_id=target_creator_id and new_role='creator'),
    'approved_by',null,'provider',case when is_platform_seller then null else 'wise_manual' end,
    'provider_status',case when state_code='enabled' then 'verified' else 'pending' end,
    'country_code',seller->>'country_code',
    'currency',coalesce(seller->>'destination_currency',seller->>'payout_route_currency'),
    'status_reason_code',seller->>'state','requirements_due',
      case when state_code='enabled' then '[]'::jsonb else jsonb_build_array(seller->>'state') end,
    'last_provider_sync_at',null,'history','[]'::jsonb,'seller_onboarding',seller
  );
end;
$$;

create or replace function public.set_admin_creator_access(target_profile_id uuid,target_role text,target_reason text)
returns void language plpgsql security definer set search_path=public,auth as $$
declare existing_profile_role text;
declare account_email text;
declare account_country text;
declare profile_country text;
declare normalized_reason text:=btrim(target_reason);
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_role not in ('member','creator') then raise exception 'Only member and creator access can be changed here.' using errcode='22023'; end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023'; end if;
  select email,upper(nullif(btrim(raw_user_meta_data->>'country_code'),''))
  into account_email,account_country from auth.users where id=target_profile_id;
  if not found then raise exception 'Account not found.' using errcode='P0002'; end if;
  insert into public.profiles(id,display_name,username,slug,role,country_code,home_country_code)
  values(target_profile_id,coalesce(nullif(split_part(account_email,'@',1),''),'44 Member'),
    'member_'||left(replace(target_profile_id::text,'-',''),8),
    'member-'||left(replace(target_profile_id::text,'-',''),8),'member',
    case when account_country ~ '^[A-Z]{2}$' then account_country else null end,
    case when account_country ~ '^[A-Z]{2}$' then account_country else null end)
  on conflict(id) do nothing;
  select profile.role,profile.country_code into existing_profile_role,profile_country
  from public.profiles profile where profile.id=target_profile_id for update;
  if existing_profile_role='admin' then raise exception 'Administrator roles cannot be changed from this control.' using errcode='42501'; end if;
  if existing_profile_role=target_role then raise exception 'This account already has that role.' using errcode='55000'; end if;
  if target_role='creator' and (
    profile_country is null
    or not exists(
      select 1 from public.creator_payout_country_routes route
      where route.country_code=profile_country and route.method='email_claim'
        and route.status='verified' and route.revalidate_after>now()
    )
  ) then
    raise exception 'This member country does not have a verified Wise email payout route.'
      using errcode='55000';
  end if;
  update public.profiles set role=target_role,updated_at=now() where id=target_profile_id;
  insert into public.admin_profile_role_events(profile_id,previous_role,new_role,changed_by,reason)
  values(target_profile_id,existing_profile_role,target_role,auth.uid(),normalized_reason);
  if target_role='creator' then
    insert into public.creator_seller_onboarding(creator_id,status,promoted_at)
    values(target_profile_id,'required',now())
    on conflict(creator_id) do update set status='required',promoted_at=now(),ready_at=null,suspended_at=null,updated_at=now();
    insert into public.creator_seller_notifications(creator_id,event_key,title,body)
    values(target_profile_id,'seller-onboarding-required','Complete creator setup',
      'Submit your individual tax form and Wise email-to-claim address before uploading Items.')
    on conflict(creator_id,event_key) do nothing;
  else
    update public.creator_seller_onboarding set status='suspended',suspended_at=now(),ready_at=null
    where creator_id=target_profile_id;
    update public.creator_payout_accounts set status='disabled',disabled_at=now()
    where creator_id=target_profile_id and provider='wise_manual';
  end if;
end;
$$;

create or replace function public.enforce_creator_item_creation_ready()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role'
    and exists(select 1 from public.profiles where id=new.author_id and role='creator')
    and coalesce(new.experience_type,'')<>'merch'
    and public.creator_seller_state_code(new.author_id)<>'ready' then
    raise exception 'Complete creator tax and Wise payout setup before uploading Items.' using errcode='55000';
  end if;
  return new;
end;
$$;
drop trigger if exists catalog_items_creator_seller_ready on public.catalog_items;
create trigger catalog_items_creator_seller_ready
before insert on public.catalog_items
for each row execute function public.enforce_creator_item_creation_ready();

insert into public.creator_seller_onboarding(creator_id,status,promoted_at)
select profile.id,
  case when exists(
    select 1 from public.creator_payout_country_routes route
    where route.country_code=profile.country_code and route.method='email_claim'
      and route.status='verified' and route.revalidate_after>now()
  ) then 'required' else 'country_waitlisted' end,
  now()
from public.profiles profile where profile.role='creator'
on conflict(creator_id) do nothing;
insert into public.creator_seller_notifications(creator_id,event_key,title,body)
select profile.id,'seller-onboarding-required','Complete creator setup',
  'Submit your individual tax form and Wise email-to-claim address before uploading Items.'
from public.profiles profile where profile.role='creator'
on conflict(creator_id,event_key) do nothing;

revoke all on function public.is_creator_tax_reviewer(),
  public.creator_gross_earnings_cents(uuid),public.creator_seller_state_code(uuid),
  public.get_creator_country_payout_route(uuid),
  public.set_admin_creator_payout_country_route(text,text,text,text,timestamptz),
  public.get_creator_seller_onboarding_state(uuid),
  public.begin_creator_seller_onboarding(text,text,text),
  public.store_creator_tax_document(uuid,text,text,text,timestamptz,timestamptz,bytea,bytea,bytea,integer,integer),
  public.set_admin_creator_tax_reviewer(uuid,boolean),
  public.approve_creator_tax_policy(integer,text,text),
  public.review_creator_tax_document(uuid,text,text),
  public.store_creator_payout_destination(uuid,uuid,text,text,bytea,bytea,bytea,integer),
  public.set_creator_payout_runtime_controls(boolean,boolean,boolean,boolean,bigint,integer),
  public.create_creator_payout_batch(timestamptz,text,text),
  public.set_creator_payout_item_withholding(uuid,bigint,text),
  public.approve_creator_payout_batch(uuid,text),
  public.record_creator_wise_manual_transfer(uuid,text,bigint,text,bigint,text,numeric,bigint,text),
  public.reconcile_creator_wise_manual_payout(uuid,text,text,text),
  public.enforce_creator_item_creation_ready()
from public,anon,authenticated;

grant execute on function public.get_creator_country_payout_route(uuid),
  public.get_creator_seller_onboarding_state(uuid),
  public.begin_creator_seller_onboarding(text,text,text)
to authenticated,service_role;
grant execute on function public.store_creator_tax_document(uuid,text,text,text,timestamptz,timestamptz,bytea,bytea,bytea,integer,integer),
  public.store_creator_payout_destination(uuid,uuid,text,text,bytea,bytea,bytea,integer)
to service_role;
grant execute on function public.set_admin_creator_payout_country_route(text,text,text,text,timestamptz),
  public.set_admin_creator_tax_reviewer(uuid,boolean),
  public.approve_creator_tax_policy(integer,text,text),
  public.review_creator_tax_document(uuid,text,text),
  public.set_creator_payout_runtime_controls(boolean,boolean,boolean,boolean,bigint,integer),
  public.create_creator_payout_batch(timestamptz,text,text),
  public.set_creator_payout_item_withholding(uuid,bigint,text),
  public.approve_creator_payout_batch(uuid,text),
  public.record_creator_wise_manual_transfer(uuid,text,bigint,text,bigint,text,numeric,bigint,text),
  public.reconcile_creator_wise_manual_payout(uuid,text,text,text)
to authenticated,service_role;

comment on table public.creator_payout_runtime_controls is
  'Independent fail-closed controls for operator-executed Wise payouts. No API transfer automation exists.';
comment on table public.creator_tax_document_payloads is
  'Encrypted signed official IRS forms. No browser or ordinary Admin table access is granted.';
comment on table public.creator_payout_destinations is
  'Encrypted Wise email-to-claim address only. 44OS stores no bank account details.';
comment on function public.creator_seller_state_code(uuid) is
  'Creator Item-creation gate. Promotion starts mandatory onboarding; entities and uncertain tax cases fail closed.';

commit;
