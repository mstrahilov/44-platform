begin;

-- The owner approves the current invited Creator cohort for paid digital sales
-- while paperwork is handled manually. The due date is an Admin-only follow-up
-- record, not an automated suspension, payout approval, or customer-visible fact.
alter table public.creator_paid_sales_access
  add column if not exists paperwork_due_at timestamptz;

alter table public.creator_paid_sales_access
  drop constraint if exists creator_paid_sales_access_paperwork_due_check;

alter table public.creator_paid_sales_access
  add constraint creator_paid_sales_access_paperwork_due_check check (
    paperwork_due_at is null or admin_status='approved'
  );

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
  where account.creator_id=target_creator_id and account.provider='wise_manual'
  order by
    case account.status
      when 'verified' then 0 when 'pending' then 1 when 'unverified' then 2
      when 'restricted' then 3 when 'country_unavailable' then 4 else 5 end,
    account.updated_at desc,account.id
  limit 1;
  if found and payout_row.status='verified' then return 'enabled'; end if;

  -- Expiry is deliberately not a sales switch. Admin records and resolves the
  -- paperwork follow-up, then explicitly disables or reinstates paid offers.
  return 'grace';
end;
$$;

create or replace function public.is_creator_paid_sales_enabled(target_creator_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select public.creator_paid_sales_state_code(target_creator_id) in ('enabled','grace');
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
  where account.creator_id=target_creator_id and account.provider='wise_manual'
  order by
    case account.status
      when 'verified' then 0 when 'pending' then 1 when 'unverified' then 2
      when 'restricted' then 3 when 'country_unavailable' then 4 else 5 end,
    account.updated_at desc,account.id
  limit 1;
  state_code:=public.creator_paid_sales_state_code(target_creator_id);

  return jsonb_build_object(
    'creator_id',target_creator_id,
    'can_sell_paid',state_code in ('enabled','grace'),
    'state',state_code,
    'is_platform_seller',is_platform_seller,
    'admin_status',case when is_platform_seller then 'approved' else coalesce(access_row.admin_status,'not_reviewed') end,
    'decision_reason',access_row.decision_reason,
    'approved_at',access_row.approved_at,
    'paperwork_due_at',access_row.paperwork_due_at,
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

create or replace function public.set_admin_creator_paid_sales(
  target_creator_id uuid,target_status text,target_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare previous_status text;
declare normalized_reason text:=btrim(target_reason);
declare due_at timestamptz;
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
  due_at:=case when target_status='approved' then now()+interval '30 days' else null end;

  insert into public.creator_paid_sales_access(
    creator_id,admin_status,decision_reason,approved_by,approved_at,disabled_at,paperwork_due_at
  ) values(
    target_creator_id,target_status,normalized_reason,auth.uid(),
    case when target_status='approved' then now() else null end,
    case when target_status='disabled' then now() else null end,due_at
  ) on conflict(creator_id) do update set
    admin_status=excluded.admin_status,decision_reason=excluded.decision_reason,
    approved_by=excluded.approved_by,approved_at=excluded.approved_at,
    disabled_at=excluded.disabled_at,paperwork_due_at=excluded.paperwork_due_at,updated_at=now();

  insert into public.creator_paid_sales_access_events(
    creator_id,previous_status,new_status,changed_by,reason
  ) values(target_creator_id,previous_status,target_status,auth.uid(),normalized_reason);
  perform public.refresh_creator_paid_offers(target_creator_id);
  return public.get_creator_paid_sales_state(target_creator_id);
end;
$$;

-- The owner explicitly approved every existing Admin-promoted Creator for the
-- launch grace cohort. New Creators still require an Admin decision through the
-- audited function above.
with inserted as (
  insert into public.creator_paid_sales_access(
    creator_id,admin_status,decision_reason,approved_by,approved_at,paperwork_due_at
  )
  select profile.id,'approved','Owner-approved 30-day manual paperwork grace for the current invited Creator cohort.',admin.id,now(),now()+interval '30 days'
  from public.profiles profile
  cross join lateral (
    select id from public.profiles where role='admin' order by created_at,id limit 1
  ) admin
  where profile.role in ('creator','admin')
  on conflict(creator_id) do nothing
  returning creator_id,approved_by,decision_reason
)
insert into public.creator_paid_sales_access_events(
  creator_id,previous_status,new_status,changed_by,reason
)
select creator_id,'not_reviewed','approved',approved_by,decision_reason from inserted;

select public.refresh_creator_paid_offers(profile.id)
from public.profiles profile where profile.role in ('creator','admin');

-- Wise onboarding and payout execution remain separate from publication and
-- sales. An Admin alone decides Creator role access; that decision starts the
-- documented manual paperwork window and never creates a payout capability.
create or replace function public.set_admin_creator_access(target_profile_id uuid,target_role text,target_reason text)
returns void language plpgsql security definer set search_path=public,auth as $$
declare existing_profile_role text;
declare account_email text;
declare account_country text;
declare previous_access_status text;
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
  select profile.role into existing_profile_role from public.profiles profile where profile.id=target_profile_id for update;
  if existing_profile_role='admin' then raise exception 'Administrator roles cannot be changed from this control.' using errcode='42501'; end if;
  if existing_profile_role=target_role then raise exception 'This account already has that role.' using errcode='55000'; end if;
  update public.profiles set role=target_role,updated_at=now() where id=target_profile_id;
  insert into public.admin_profile_role_events(profile_id,previous_role,new_role,changed_by,reason)
  values(target_profile_id,existing_profile_role,target_role,auth.uid(),normalized_reason);
  if target_role='creator' then
    select admin_status into previous_access_status from public.creator_paid_sales_access
    where creator_id=target_profile_id for update;
    insert into public.creator_seller_onboarding(creator_id,status,promoted_at)
    values(target_profile_id,'required',now())
    on conflict(creator_id) do update set status='required',promoted_at=now(),ready_at=null,suspended_at=null,updated_at=now();
    insert into public.creator_paid_sales_access(
      creator_id,admin_status,decision_reason,approved_by,approved_at,paperwork_due_at
    ) values(target_profile_id,'approved',normalized_reason,auth.uid(),now(),now()+interval '30 days')
    on conflict(creator_id) do update set admin_status='approved',decision_reason=excluded.decision_reason,
      approved_by=excluded.approved_by,approved_at=excluded.approved_at,disabled_at=null,
      paperwork_due_at=excluded.paperwork_due_at,updated_at=now();
    insert into public.creator_paid_sales_access_events(creator_id,previous_status,new_status,changed_by,reason)
    values(target_profile_id,coalesce(previous_access_status,'not_reviewed'),'approved',auth.uid(),normalized_reason);
    perform public.refresh_creator_paid_offers(target_profile_id);
    insert into public.creator_seller_notifications(creator_id,event_key,title,body)
    values(target_profile_id,'seller-paperwork-follow-up','Complete creator paperwork',
      'Complete the requested tax and payout paperwork within 30 days. Sales remain manually reviewed by 44OS.')
    on conflict(creator_id,event_key) do nothing;
  else
    update public.creator_seller_onboarding set status='suspended',suspended_at=now(),ready_at=null where creator_id=target_profile_id;
    insert into public.creator_paid_sales_access(creator_id,admin_status,decision_reason,approved_by,disabled_at,paperwork_due_at)
    values(target_profile_id,'disabled',normalized_reason,auth.uid(),now(),null)
    on conflict(creator_id) do update set admin_status='disabled',decision_reason=excluded.decision_reason,
      approved_by=excluded.approved_by,approved_at=null,disabled_at=excluded.disabled_at,paperwork_due_at=null,updated_at=now();
    perform public.refresh_creator_paid_offers(target_profile_id);
  end if;
end;
$$;

create or replace function public.enforce_creator_item_creation_ready()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  return new;
end;
$$;

comment on function public.enforce_creator_item_creation_ready() is
  'Creator role promotion permits digital Item creation. Creator Merch remains platform-only; documents and payout onboarding do not block publication.';

comment on column public.creator_paid_sales_access.paperwork_due_at is
  'Admin-only manual paperwork follow-up date. It is not a customer-facing status or automated suspension trigger.';
comment on function public.is_creator_paid_sales_enabled(uuid) is
  'Creator paid sales require an Admin approval or the platform seller. Grace-window proceeds remain pending and do not make payout capability true.';

commit;
