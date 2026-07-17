begin;

-- 44OS application email foundation. All delivery and support intake controls
-- default off. This migration does not alter Auth SMTP, DNS, Resend domains,
-- inbound MX, Printful confirmation, or public commerce controls.

create table public.email_delivery_controls (
  singleton boolean primary key default true check (singleton),
  delivery_enabled boolean not null default false,
  support_intake_enabled boolean not null default false,
  newsletter_sync_enabled boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (not (delivery_enabled or support_intake_enabled or newsletter_sync_enabled) or (approved_at is not null and approved_by is not null))
);
insert into public.email_delivery_controls(singleton) values(true);

create table public.email_outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (char_length(event_key) between 3 and 256),
  template_key text not null check (template_key in ('welcome','purchase_confirmation','refund_cancellation','fulfillment_tracking','support_acknowledgement')),
  template_version integer not null check (template_version > 0),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null check (char_length(btrim(recipient_email)) between 3 and 320 and recipient_email like '%@%'),
  source_kind text not null check (source_kind in ('account','commerce_order','commerce_adjustment','fulfillment','support_case')),
  source_id uuid,
  payload jsonb not null check (jsonb_typeof(payload)='object' and pg_column_size(payload)<=32768),
  status text not null default 'pending' check (status in ('pending','claimed','sent','failed','suppressed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claimed_at timestamptz,
  provider_message_id text unique,
  sent_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='claimed')=(claim_token is not null and claimed_at is not null)),
  check (status<>'sent' or (provider_message_id is not null and sent_at is not null))
);
create index email_outbox_claim_idx on public.email_outbox_events(status,next_attempt_at,created_at);
create index email_outbox_source_idx on public.email_outbox_events(source_kind,source_id,created_at desc);

create table public.email_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider='resend'),
  provider_event_id text not null,
  event_type text not null check (event_type in ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed','contact.updated')),
  provider_message_id text,
  occurred_at timestamptz,
  failure_class text check (failure_class is null or failure_class in ('transient','hard_bounce','complaint','provider_rejection','unknown')),
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=8192),
  received_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);
create index email_provider_message_idx on public.email_provider_events(provider_message_id,received_at desc);

create table public.email_suppressions (
  email_normalized text primary key check (email_normalized=lower(btrim(email_normalized)) and email_normalized like '%@%'),
  reason text not null check (reason in ('hard_bounce','complaint','manual')),
  source_provider_event_id uuid references public.email_provider_events(id) on delete restrict,
  suppressed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  review_note text check (review_note is null or char_length(review_note)<=500)
);

create table public.newsletter_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_normalized text not null check (email_normalized=lower(btrim(email_normalized)) and email_normalized like '%@%'),
  status text not null check (status in ('subscribed','unsubscribed')),
  consent_source text not null check (consent_source in ('settings','newsletter_form','admin_documented_request','provider_unsubscribe')),
  consented_at timestamptz,
  revoked_at timestamptz,
  policy_version text not null check (char_length(policy_version) between 1 and 80),
  provider_contact_id text,
  provider_topic_id text,
  sync_status text not null default 'pending' check (sync_status in ('pending','synced','failed','not_applicable')),
  sync_attempts integer not null default 0 check (sync_attempts>=0),
  sync_claimed_at timestamptz,
  last_sync_error text,
  updated_at timestamptz not null default now(),
  check ((status='subscribed' and consented_at is not null and revoked_at is null) or (status='unsubscribed' and revoked_at is not null))
);
create index newsletter_consent_sync_idx on public.newsletter_consents(sync_status,updated_at);

create table public.newsletter_contact_retirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_normalized text not null check (email_normalized=lower(btrim(email_normalized)) and email_normalized like '%@%'),
  provider_contact_id text,
  provider_topic_id text,
  sync_status text not null default 'pending' check (sync_status in ('pending','claimed','synced','failed')),
  sync_attempts integer not null default 0 check (sync_attempts>=0),
  claim_token uuid,
  claimed_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,email_normalized),
  check ((sync_status='claimed')=(claim_token is not null and claimed_at is not null))
);
create index newsletter_contact_retirements_sync_idx on public.newsletter_contact_retirements(sync_status,updated_at);

create table public.newsletter_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('consented','revoked','provider_unsubscribed','provider_synced')),
  source text not null,
  policy_version text not null,
  occurred_at timestamptz not null default now()
);
create index newsletter_consent_events_user_idx on public.newsletter_consent_events(user_id,occurred_at desc);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  case_number bigint generated always as identity unique,
  requester_id uuid references auth.users(id) on delete set null,
  requester_email text not null check (char_length(btrim(requester_email)) between 3 and 320 and requester_email like '%@%'),
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  status text not null default 'open' check (status in ('open','waiting_on_support','waiting_on_requester','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  reply_owner uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (status not in ('resolved','closed') or resolved_at is not null)
);
create index support_cases_requester_idx on public.support_cases(requester_id,created_at desc);
create index support_cases_queue_idx on public.support_cases(status,priority,created_at);

create table public.support_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete restrict,
  event_type text not null check (event_type in ('opened','requester_message','support_reply','internal_note','assigned','status_changed')),
  actor_id uuid references public.profiles(id) on delete set null,
  visibility text not null check (visibility in ('requester','internal')),
  body text check (body is null or char_length(btrim(body)) between 1 and 10000),
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=4096),
  created_at timestamptz not null default now()
);
create index support_case_events_history_idx on public.support_case_events(case_id,created_at,id);

create table public.email_control_events (
  id uuid primary key default gen_random_uuid(),
  control_name text not null check (control_name in ('delivery_enabled','support_intake_enabled','newsletter_sync_enabled')),
  previous_enabled boolean not null,
  new_enabled boolean not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 8 and 500),
  created_at timestamptz not null default now(),
  check (previous_enabled is distinct from new_enabled)
);
create index email_control_events_created_idx on public.email_control_events(created_at desc);

create table public.email_reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  outbox_event_id uuid not null references public.email_outbox_events(id) on delete restrict,
  resolution text not null check (resolution in ('provider_sent','retry_approved','event_suppressed')),
  previous_error_code text not null,
  provider_message_id text,
  reconciled_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 8 and 500),
  created_at timestamptz not null default now(),
  check ((resolution='provider_sent')=(provider_message_id is not null))
);
create index email_reconciliation_events_outbox_idx on public.email_reconciliation_events(outbox_event_id,created_at desc);

create or replace function public.reject_email_evidence_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Email evidence is append-only.' using errcode='55000';
end;
$$;
create trigger email_provider_events_append_only before update or delete on public.email_provider_events for each row execute function public.reject_email_evidence_mutation();
create trigger newsletter_consent_events_append_only before update or delete on public.newsletter_consent_events for each row execute function public.reject_email_evidence_mutation();
create trigger support_case_events_append_only before update or delete on public.support_case_events for each row execute function public.reject_email_evidence_mutation();
create trigger email_control_events_append_only before update or delete on public.email_control_events for each row execute function public.reject_email_evidence_mutation();
create trigger email_reconciliation_events_append_only before update or delete on public.email_reconciliation_events for each row execute function public.reject_email_evidence_mutation();

create or replace function public.rotate_newsletter_contact_on_auth_email_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare consent_row public.newsletter_consents; old_email text:=lower(btrim(old.email)); new_email text:=lower(btrim(new.email));
begin
  if old_email is not distinct from new_email then return new; end if;
  select * into consent_row from public.newsletter_consents where user_id=new.id for update;
  if consent_row.user_id is null then return new; end if;
  insert into public.newsletter_contact_retirements(user_id,email_normalized,provider_contact_id,provider_topic_id)
  values(new.id,old_email,consent_row.provider_contact_id,consent_row.provider_topic_id)
  on conflict(user_id,email_normalized) do update set
    provider_contact_id=coalesce(excluded.provider_contact_id,public.newsletter_contact_retirements.provider_contact_id),
    provider_topic_id=coalesce(excluded.provider_topic_id,public.newsletter_contact_retirements.provider_topic_id),
    sync_status='pending',claim_token=null,claimed_at=null,last_sync_error=null,updated_at=now();
  update public.newsletter_consents set
    email_normalized=new_email,provider_contact_id=null,provider_topic_id=null,
    sync_status='pending',last_sync_error=null,updated_at=now()
  where user_id=new.id;
  return new;
end;
$$;
create trigger auth_users_rotate_newsletter_contact after update of email on auth.users
for each row execute function public.rotate_newsletter_contact_on_auth_email_change();

create or replace function public.queue_application_email(
  target_event_key text,target_template_key text,target_template_version integer,
  target_recipient_user_id uuid,target_recipient_email text,target_source_kind text,
  target_source_id uuid,target_payload jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare queued_id uuid; normalized_email text:=lower(btrim(target_recipient_email));
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if exists(select 1 from public.email_suppressions where email_normalized=normalized_email) then
    insert into public.email_outbox_events(event_key,template_key,template_version,recipient_user_id,recipient_email,source_kind,source_id,payload,status)
    values(target_event_key,target_template_key,target_template_version,target_recipient_user_id,normalized_email,target_source_kind,target_source_id,target_payload,'suppressed')
    on conflict(event_key) do nothing returning id into queued_id;
  else
    insert into public.email_outbox_events(event_key,template_key,template_version,recipient_user_id,recipient_email,source_kind,source_id,payload)
    values(target_event_key,target_template_key,target_template_version,target_recipient_user_id,normalized_email,target_source_kind,target_source_id,target_payload)
    on conflict(event_key) do nothing returning id into queued_id;
  end if;
  if queued_id is null then select id into queued_id from public.email_outbox_events where event_key=target_event_key; end if;
  return queued_id;
end;
$$;

create or replace function public.queue_welcome_email(target_user_id uuid,target_library_url text)
returns uuid language plpgsql security definer set search_path=public as $$
declare account record; display_name text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select id,email,email_confirmed_at,created_at into account from auth.users where id=target_user_id;
  if account.id is null or account.email_confirmed_at is null then raise exception 'A confirmed account is required.' using errcode='55000'; end if;
  if account.created_at < now()-interval '24 hours' then raise exception 'Welcome window has elapsed.' using errcode='55000'; end if;
  select profiles.display_name into display_name from public.profiles where id=target_user_id;
  return public.queue_application_email('welcome/'||target_user_id,'welcome',1,target_user_id,account.email,'account',target_user_id,
    jsonb_build_object('displayName',display_name,'libraryUrl',target_library_url));
end;
$$;

create or replace function public.queue_verified_commerce_email()
returns trigger language plpgsql security definer set search_path=public as $$
declare event_key text; template_key text; outcome text; lines jsonb; orders_url text:='https://44os.com/orders';
begin
  if new.customer_email_snapshot is null or new.customer_email_snapshot not like '%@%' then return new; end if;
  if new.status='paid' and old.status is distinct from 'paid' and new.paid_at is not null then
    select coalesce(jsonb_agg(jsonb_build_object('title',item_title,'detail',coalesce(merch_variant_snapshot->>'display_name',offer_title),'quantity',quantity,'amount',currency||' '||to_char(line_total_cents/100.0,'FM999999990.00')) order by created_at),'[]'::jsonb)
      into lines from public.commerce_order_items where order_id=new.id;
    perform public.queue_application_email('purchase/'||new.id,'purchase_confirmation',1,new.buyer_id,new.customer_email_snapshot,'commerce_order',new.id,
      jsonb_build_object('orderReference','44-'||upper(left(replace(new.id::text,'-',''),6)),'purchasedAt',new.paid_at,'lines',lines,
      'subtotal',new.currency||' '||to_char(new.subtotal_cents/100.0,'FM999999990.00'),'shipping',case when new.shipping_cents>0 then new.currency||' '||to_char(new.shipping_cents/100.0,'FM999999990.00') else null end,
      'tax',case when new.tax_cents>0 then new.currency||' '||to_char(new.tax_cents/100.0,'FM999999990.00') else null end,'total',new.currency||' '||to_char(new.total_cents/100.0,'FM999999990.00'),'ordersUrl',orders_url));
  elsif new.status in ('partially_refunded','refunded') and (old.status is distinct from new.status or old.refunded_cents is distinct from new.refunded_cents) then
    outcome:=case when new.status='refunded' then 'refunded' else 'partially_refunded' end;
    perform public.queue_application_email('refund/'||new.id||'/'||new.refunded_cents,'refund_cancellation',1,new.buyer_id,new.customer_email_snapshot,'commerce_order',new.id,
      jsonb_build_object('orderReference','44-'||upper(left(replace(new.id::text,'-',''),6)),'outcome',outcome,'amount',new.currency||' '||to_char(new.refunded_cents/100.0,'FM999999990.00'),'detail','The refund was recorded by the payment provider. Your bank may take several business days to post it.','ordersUrl',orders_url));
  elsif new.status='canceled' and old.status in ('paid','partially_refunded') then
    perform public.queue_application_email('cancellation/'||new.id,'refund_cancellation',1,new.buyer_id,new.customer_email_snapshot,'commerce_order',new.id,
      jsonb_build_object('orderReference','44-'||upper(left(replace(new.id::text,'-',''),6)),'outcome','canceled','detail','This paid order was canceled by an authorized server workflow.','ordersUrl',orders_url));
  end if;
  return new;
end;
$$;

create or replace function public.apply_newsletter_provider_unsubscribe(target_email text,target_provider_contact_id text)
returns void language plpgsql security definer set search_path=public as $$
declare consent_row public.newsletter_consents; was_subscribed boolean;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select status='subscribed' into was_subscribed from public.newsletter_consents where email_normalized=lower(btrim(target_email));
  update public.newsletter_consents set status='unsubscribed',revoked_at=coalesce(revoked_at,now()),provider_contact_id=coalesce(target_provider_contact_id,provider_contact_id),sync_status='synced',sync_claimed_at=null,last_sync_error=null,updated_at=now()
  where email_normalized=lower(btrim(target_email)) returning * into consent_row;
  if consent_row.user_id is not null and coalesce(was_subscribed,false) then
    insert into public.newsletter_consent_events(user_id,action,source,policy_version)
    values(consent_row.user_id,'provider_unsubscribed','resend',consent_row.policy_version);
  end if;
end;
$$;
create trigger commerce_orders_queue_verified_email after update of status,paid_at,refunded_cents on public.commerce_orders for each row execute function public.queue_verified_commerce_email();

create or replace function public.queue_fulfillment_email(target_order_id uuid,target_provider_event_id text,target_status text,target_detail text,target_tracking_url text default null,target_tracking_number text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare order_row public.commerce_orders;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_status not in ('in_production','shipped','delivered','canceled') then raise exception 'Invalid fulfillment email status.' using errcode='22023'; end if;
  if not exists(select 1 from public.provider_webhook_events where provider='printful' and provider_event_id=target_provider_event_id and signature_verified and processing_status='processed') then raise exception 'Verified Printful event required.' using errcode='55000'; end if;
  select * into order_row from public.commerce_orders where id=target_order_id and status in ('paid','fulfilled','partially_refunded');
  if order_row.id is null then raise exception 'Paid order required.' using errcode='55000'; end if;
  return public.queue_application_email('fulfillment/'||target_provider_event_id,'fulfillment_tracking',1,order_row.buyer_id,order_row.customer_email_snapshot,'fulfillment',target_order_id,
    jsonb_build_object('orderReference','44-'||upper(left(replace(order_row.id::text,'-',''),6)),'status',target_status,'detail',target_detail,'trackingUrl',target_tracking_url,'trackingNumber',target_tracking_number,'ordersUrl','https://44os.com/orders'));
end;
$$;

create or replace function public.recover_stale_application_email_claims()
returns integer language plpgsql security definer set search_path=public as $$
declare recovered_count integer;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.email_outbox_events
  set status='failed',claim_token=null,claimed_at=null,
    last_error_code=case when now()<created_at+interval '23 hours' then 'stale_claim_recovered' else 'stale_claim_reconciliation_required' end,
    last_error_at=now(),
    next_attempt_at=case when now()<created_at+interval '23 hours' then now() else 'infinity'::timestamptz end,
    updated_at=now()
  where status='claimed' and claimed_at<now()-interval '10 minutes';
  get diagnostics recovered_count=row_count;
  return recovered_count;
end;
$$;

create or replace function public.claim_application_email(target_event_id uuid,target_claim_token uuid)
returns table(id uuid,event_key text,template_key text,template_version integer,recipient_email text,payload jsonb)
language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if not (select delivery_enabled from public.email_delivery_controls where singleton) then raise exception 'Email delivery is disabled.' using errcode='55000'; end if;
  return query update public.email_outbox_events event set status='claimed',claim_token=target_claim_token,claimed_at=now(),attempt_count=attempt_count+1,updated_at=now()
    where event.id=target_event_id and event.status in ('pending','failed') and event.next_attempt_at<=now()
      and not exists(select 1 from public.email_suppressions suppression where suppression.email_normalized=event.recipient_email)
    returning event.id,event.event_key,event.template_key,event.template_version,event.recipient_email,event.payload;
end;
$$;

create or replace function public.complete_application_email(target_event_id uuid,target_claim_token uuid,target_provider_message_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.email_outbox_events set status='sent',provider_message_id=target_provider_message_id,sent_at=now(),claim_token=null,claimed_at=null,last_error_code=null,updated_at=now()
  where id=target_event_id and status='claimed' and claim_token=target_claim_token;
  if not found then raise exception 'Email claim mismatch.' using errcode='55000'; end if;
end;
$$;

create or replace function public.fail_application_email(target_event_id uuid,target_claim_token uuid,target_error_code text,target_ambiguous boolean default false,target_retryable boolean default true)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.email_outbox_events set status='failed',claim_token=null,claimed_at=null,
    last_error_code=case
      when not target_retryable then 'provider_rejection_review_required'
      when target_ambiguous and now()>=created_at+interval '23 hours' then 'stale_claim_reconciliation_required'
      else left(coalesce(target_error_code,'unknown'),120)
    end,last_error_at=now(),
    next_attempt_at=case
      when not target_retryable then 'infinity'::timestamptz
      when target_ambiguous and now()<created_at+interval '23 hours' then least(now()+interval '5 minutes',created_at+interval '23 hours')
      when target_ambiguous then 'infinity'::timestamptz
      else now()+least(interval '6 hours',interval '5 minutes'*power(2,greatest(0,attempt_count-1)))
    end,updated_at=now()
  where id=target_event_id and status='claimed' and claim_token=target_claim_token;
  if not found then raise exception 'Email claim mismatch.' using errcode='55000'; end if;
end;
$$;

create or replace function public.reconcile_application_email(target_event_id uuid,target_resolution text,target_provider_message_id text,target_reason text)
returns public.email_outbox_events language plpgsql security definer set search_path=public as $$
declare previous public.email_outbox_events; result public.email_outbox_events; normalized_message_id text:=nullif(btrim(target_provider_message_id),'');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_resolution not in ('provider_sent','retry_approved','event_suppressed') then raise exception 'Invalid email reconciliation resolution.' using errcode='22023'; end if;
  if char_length(btrim(coalesce(target_reason,''))) not between 8 and 500 then raise exception 'Reconciliation reason must be between 8 and 500 characters.' using errcode='22023'; end if;
  if target_resolution='provider_sent' and (normalized_message_id is null or char_length(normalized_message_id)>256) then raise exception 'Provider message ID is required.' using errcode='22023'; end if;
  if target_resolution<>'provider_sent' and normalized_message_id is not null then raise exception 'Provider message ID is allowed only when marking sent.' using errcode='22023'; end if;
  select * into previous from public.email_outbox_events where id=target_event_id for update;
  if previous.id is null then raise exception 'Email outbox event not found.' using errcode='P0002'; end if;
  if previous.status<>'failed' or previous.last_error_code not in ('stale_claim_reconciliation_required','provider_rejection_review_required') or previous.next_attempt_at<>'infinity'::timestamptz then
    raise exception 'Only a frozen email delivery failure can be reconciled.' using errcode='55000';
  end if;
  if previous.last_error_code='provider_rejection_review_required' and target_resolution='provider_sent' then
    raise exception 'A known provider rejection cannot be marked sent.' using errcode='55000';
  end if;
  if target_resolution='provider_sent' then
    update public.email_outbox_events set status='sent',provider_message_id=normalized_message_id,sent_at=now(),last_error_code=null,last_error_at=null,updated_at=now()
    where id=target_event_id returning * into result;
  elsif target_resolution='retry_approved' then
    update public.email_outbox_events set status='failed',next_attempt_at=now(),last_error_code='manual_retry_approved',last_error_at=now(),updated_at=now()
    where id=target_event_id returning * into result;
  else
    update public.email_outbox_events set status='suppressed',last_error_code='manual_event_suppressed',last_error_at=now(),updated_at=now()
    where id=target_event_id returning * into result;
  end if;
  insert into public.email_reconciliation_events(outbox_event_id,resolution,previous_error_code,provider_message_id,reconciled_by,reason)
  values(target_event_id,target_resolution,previous.last_error_code,normalized_message_id,auth.uid(),btrim(target_reason));
  return result;
end;
$$;

create or replace function public.record_email_provider_event(target_provider_event_id text,target_event_type text,target_provider_message_id text,target_occurred_at timestamptz,target_failure_class text,target_recipient_email text,target_metadata jsonb default '{}')
returns uuid language plpgsql security definer set search_path=public as $$
declare event_id uuid; normalized_email text:=lower(btrim(target_recipient_email));
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  insert into public.email_provider_events(provider,provider_event_id,event_type,provider_message_id,occurred_at,failure_class,metadata)
  values('resend',target_provider_event_id,target_event_type,target_provider_message_id,target_occurred_at,target_failure_class,coalesce(target_metadata,'{}')-'email' - 'to' - 'from' - 'subject' - 'html' - 'text' - 'headers')
  on conflict(provider,provider_event_id) do nothing returning id into event_id;
  if event_id is null then select id into event_id from public.email_provider_events where provider='resend' and provider_event_id=target_provider_event_id; end if;
  if target_failure_class in ('hard_bounce','complaint') and normalized_email like '%@%' then
    insert into public.email_suppressions(email_normalized,reason,source_provider_event_id) values(normalized_email,target_failure_class,event_id)
    on conflict(email_normalized) do nothing;
    update public.email_outbox_events set status='suppressed',updated_at=now() where recipient_email=normalized_email and status in ('pending','failed');
  end if;
  return event_id;
end;
$$;

create or replace function public.set_newsletter_consent(target_subscribed boolean,target_policy_version text,target_source text default 'settings')
returns public.newsletter_consents language plpgsql security definer set search_path=public as $$
declare account_email text; result public.newsletter_consents;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if target_source<>'settings' then raise exception 'Invalid self-service consent source.' using errcode='22023'; end if;
  select lower(email) into account_email from auth.users where id=auth.uid();
  insert into public.newsletter_consents(user_id,email_normalized,status,consent_source,consented_at,revoked_at,policy_version,sync_status,sync_claimed_at,last_sync_error)
  values(auth.uid(),account_email,case when target_subscribed then 'subscribed' else 'unsubscribed' end,target_source,case when target_subscribed then now() else null end,case when target_subscribed then null else now() end,target_policy_version,'pending',null,null)
  on conflict(user_id) do update set email_normalized=excluded.email_normalized,status=excluded.status,consent_source=excluded.consent_source,consented_at=case when target_subscribed then coalesce(public.newsletter_consents.consented_at,now()) else public.newsletter_consents.consented_at end,revoked_at=excluded.revoked_at,policy_version=excluded.policy_version,sync_status='pending',sync_claimed_at=null,last_sync_error=null,updated_at=now()
  returning * into result;
  insert into public.newsletter_consent_events(user_id,action,source,policy_version) values(auth.uid(),case when target_subscribed then 'consented' else 'revoked' end,target_source,target_policy_version);
  return result;
end;
$$;

create or replace function public.set_email_delivery_control(target_control text,target_enabled boolean,target_reason text)
returns public.email_delivery_controls language plpgsql security definer set search_path=public as $$
declare previous_enabled boolean; result public.email_delivery_controls;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_control not in ('delivery_enabled','support_intake_enabled','newsletter_sync_enabled') then raise exception 'Invalid email control.' using errcode='22023'; end if;
  if char_length(btrim(coalesce(target_reason,''))) not between 8 and 500 then raise exception 'Control-change reason must be between 8 and 500 characters.' using errcode='22023'; end if;
  select case target_control
    when 'delivery_enabled' then delivery_enabled
    when 'support_intake_enabled' then support_intake_enabled
    when 'newsletter_sync_enabled' then newsletter_sync_enabled
  end into previous_enabled from public.email_delivery_controls where singleton for update;
  if previous_enabled is distinct from target_enabled then
    update public.email_delivery_controls set
      delivery_enabled=case when target_control='delivery_enabled' then target_enabled else delivery_enabled end,
      support_intake_enabled=case when target_control='support_intake_enabled' then target_enabled else support_intake_enabled end,
      newsletter_sync_enabled=case when target_control='newsletter_sync_enabled' then target_enabled else newsletter_sync_enabled end,
      approved_at=now(),approved_by=auth.uid(),updated_at=now()
    where singleton returning * into result;
    insert into public.email_control_events(control_name,previous_enabled,new_enabled,changed_by,reason)
    values(target_control,previous_enabled,target_enabled,auth.uid(),btrim(target_reason));
  else
    select * into result from public.email_delivery_controls where singleton;
  end if;
  return result;
end;
$$;

create or replace function public.create_support_case(target_requester_id uuid,target_requester_email text,target_subject text,target_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare case_id uuid; case_ref text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if not (select support_intake_enabled from public.email_delivery_controls where singleton) then raise exception 'Support intake is disabled.' using errcode='55000'; end if;
  if target_requester_id is null then raise exception 'Authenticated requester required.' using errcode='42501'; end if;
  if (select count(*) from public.support_cases where requester_id=target_requester_id and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Support request rate limit exceeded.' using errcode='55000';
  end if;
  insert into public.support_cases(requester_id,requester_email,subject) values(target_requester_id,lower(btrim(target_requester_email)),btrim(target_subject)) returning id into case_id;
  insert into public.support_case_events(case_id,event_type,actor_id,visibility,body) values(case_id,'opened',target_requester_id,'requester',btrim(target_body));
  select 'SUP-'||upper(left(replace(case_id::text,'-',''),6)) into case_ref;
  perform public.queue_application_email('support-ack/'||case_id,'support_acknowledgement',1,target_requester_id,target_requester_email,'support_case',case_id,
    jsonb_build_object('caseReference',case_ref,'subject',target_subject,'receivedAt',now(),'supportUrl','https://44os.com/support'));
  return case_id;
end;
$$;

create or replace function public.update_support_case(target_case_id uuid,target_status text,target_assigned_to uuid,target_reply_owner uuid,target_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare previous public.support_cases;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_status not in ('open','waiting_on_support','waiting_on_requester','resolved','closed') then raise exception 'Invalid support status.' using errcode='22023'; end if;
  select * into previous from public.support_cases where id=target_case_id for update;
  if previous.id is null then raise exception 'Support case not found.' using errcode='P0002'; end if;
  if target_assigned_to is not null and not exists(select 1 from public.profiles where id=target_assigned_to and role='admin') then raise exception 'Support assignee must be an administrator.' using errcode='22023'; end if;
  if target_reply_owner is not null and not exists(select 1 from public.profiles where id=target_reply_owner and role='admin') then raise exception 'Reply owner must be an administrator.' using errcode='22023'; end if;
  update public.support_cases set status=target_status,assigned_to=target_assigned_to,reply_owner=target_reply_owner,resolved_at=case when target_status in ('resolved','closed') then coalesce(resolved_at,now()) else null end,updated_at=now() where id=target_case_id;
  if previous.assigned_to is distinct from target_assigned_to or previous.reply_owner is distinct from target_reply_owner then
    insert into public.support_case_events(case_id,event_type,actor_id,visibility,metadata) values(target_case_id,'assigned',auth.uid(),'internal',jsonb_build_object('assignedTo',target_assigned_to,'replyOwner',target_reply_owner));
  end if;
  if previous.status is distinct from target_status then
    insert into public.support_case_events(case_id,event_type,actor_id,visibility,metadata) values(target_case_id,'status_changed',auth.uid(),'internal',jsonb_build_object('from',previous.status,'to',target_status));
  end if;
  if nullif(btrim(target_note),'') is not null then
    insert into public.support_case_events(case_id,event_type,actor_id,visibility,body) values(target_case_id,'internal_note',auth.uid(),'internal',btrim(target_note));
  end if;
end;
$$;

create or replace function public.record_support_reply(target_case_id uuid,target_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare event_id uuid; support_case public.support_cases;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if nullif(btrim(target_body),'') is null or char_length(btrim(target_body))>10000 then raise exception 'Support reply must be between 1 and 10000 characters.' using errcode='22023'; end if;
  select * into support_case from public.support_cases where id=target_case_id for update;
  if support_case.id is null then raise exception 'Support case not found.' using errcode='P0002'; end if;
  if support_case.reply_owner is distinct from auth.uid() then raise exception 'Claim reply ownership before recording a human reply.' using errcode='55000'; end if;
  insert into public.support_case_events(case_id,event_type,actor_id,visibility,body) values(target_case_id,'support_reply',auth.uid(),'requester',btrim(target_body)) returning id into event_id;
  update public.support_cases set status='waiting_on_requester',updated_at=now() where id=target_case_id;
  return event_id;
end;
$$;

alter table public.email_delivery_controls enable row level security;
alter table public.email_outbox_events enable row level security;
alter table public.email_provider_events enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.newsletter_consents enable row level security;
alter table public.newsletter_contact_retirements enable row level security;
alter table public.newsletter_consent_events enable row level security;
alter table public.support_cases enable row level security;
alter table public.support_case_events enable row level security;
alter table public.email_control_events enable row level security;
alter table public.email_reconciliation_events enable row level security;
create policy newsletter_consents_owner_read on public.newsletter_consents for select to authenticated using(user_id=auth.uid());
create policy newsletter_consent_events_owner_read on public.newsletter_consent_events for select to authenticated using(user_id=auth.uid());
create policy support_cases_owner_read on public.support_cases for select to authenticated using(requester_id=auth.uid() or public.is_platform_admin());
create policy support_case_events_owner_read on public.support_case_events for select to authenticated using(exists(select 1 from public.support_cases support_case where support_case.id=case_id and (support_case.requester_id=auth.uid() or public.is_platform_admin()) and (visibility='requester' or public.is_platform_admin())));
create policy email_delivery_controls_admin_read on public.email_delivery_controls for select to authenticated using(public.is_platform_admin());
create policy email_control_events_admin_read on public.email_control_events for select to authenticated using(public.is_platform_admin());
create policy email_reconciliation_events_admin_read on public.email_reconciliation_events for select to authenticated using(public.is_platform_admin());

revoke all on public.email_delivery_controls,public.email_outbox_events,public.email_provider_events,public.email_suppressions,public.newsletter_consents,public.newsletter_contact_retirements,public.newsletter_consent_events,public.support_cases,public.support_case_events,public.email_control_events,public.email_reconciliation_events from anon,authenticated;
grant select on public.newsletter_consents,public.newsletter_consent_events,public.support_cases,public.support_case_events to authenticated;
grant select on public.email_delivery_controls,public.email_control_events,public.email_reconciliation_events to authenticated;
grant all on public.email_delivery_controls,public.email_outbox_events,public.email_provider_events,public.email_suppressions,public.newsletter_consents,public.newsletter_contact_retirements,public.newsletter_consent_events,public.support_cases,public.support_case_events,public.email_control_events,public.email_reconciliation_events to service_role;

revoke all on function public.rotate_newsletter_contact_on_auth_email_change(),public.queue_application_email(text,text,integer,uuid,text,text,uuid,jsonb),public.queue_welcome_email(uuid,text),public.queue_verified_commerce_email(),public.queue_fulfillment_email(uuid,text,text,text,text,text),public.recover_stale_application_email_claims(),public.claim_application_email(uuid,uuid),public.complete_application_email(uuid,uuid,text),public.fail_application_email(uuid,uuid,text,boolean,boolean),public.reconcile_application_email(uuid,text,text,text),public.record_email_provider_event(text,text,text,timestamptz,text,text,jsonb),public.apply_newsletter_provider_unsubscribe(text,text),public.set_newsletter_consent(boolean,text,text),public.set_email_delivery_control(text,boolean,text),public.create_support_case(uuid,text,text,text),public.update_support_case(uuid,text,uuid,uuid,text),public.record_support_reply(uuid,text) from public,anon,authenticated;
grant execute on function public.queue_application_email(text,text,integer,uuid,text,text,uuid,jsonb),public.queue_welcome_email(uuid,text),public.queue_fulfillment_email(uuid,text,text,text,text,text),public.recover_stale_application_email_claims(),public.claim_application_email(uuid,uuid),public.complete_application_email(uuid,uuid,text),public.fail_application_email(uuid,uuid,text,boolean,boolean),public.record_email_provider_event(text,text,text,timestamptz,text,text,jsonb),public.apply_newsletter_provider_unsubscribe(text,text),public.create_support_case(uuid,text,text,text) to service_role;
grant execute on function public.set_newsletter_consent(boolean,text,text),public.set_email_delivery_control(text,boolean,text),public.reconcile_application_email(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.update_support_case(uuid,text,uuid,uuid,text),public.record_support_reply(uuid,text) to authenticated,service_role;

comment on table public.email_outbox_events is 'Durable application-email intent. Stable event_key is also the provider idempotency key; rendered bodies are not persisted.';
comment on table public.email_provider_events is 'Sanitized, idempotent Resend delivery evidence without message content, headers, or secrets.';
comment on table public.newsletter_consents is 'Explicit newsletter preference authority. Signup, purchase, and support activity never create consent.';
comment on table public.newsletter_contact_retirements is 'Old account-email Contacts that must be opted out before explicit consent is synchronized to a replacement address.';
comment on table public.support_case_events is 'Append-only durable support history; inbound mail remains owned by the monitored support mailbox.';
comment on table public.email_control_events is 'Append-only administrator audit history for fail-closed email activation controls.';
comment on table public.email_reconciliation_events is 'Append-only administrator decisions for ambiguous sends outside the provider idempotency window.';

commit;
