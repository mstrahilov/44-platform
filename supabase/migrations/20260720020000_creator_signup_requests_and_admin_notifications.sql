begin;

-- New signup intent is recorded separately from the effective profile role.
-- Existing accounts are deliberately not backfilled, so every current member,
-- creator, and administrator retains exactly the access they have today.
create table public.creator_access_requests (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','approved','rejected')),
  request_source text not null default 'signup' check(request_source='signup'),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  decision_reason text check(decision_reason is null or char_length(btrim(decision_reason)) between 3 and 500),
  updated_at timestamptz not null default now(),
  check(
    (status='pending' and reviewed_at is null and reviewed_by is null and decision_reason is null)
    or (status in('approved','rejected') and reviewed_at is not null and reviewed_by is not null and decision_reason is not null)
  )
);
create index creator_access_requests_queue_idx on public.creator_access_requests(status,requested_at);

alter table public.creator_access_requests enable row level security;
revoke all on public.creator_access_requests from public,anon,authenticated;
grant select on public.creator_access_requests to authenticated;
grant all on public.creator_access_requests to service_role;
create policy creator_access_requests_owner_or_admin_read on public.creator_access_requests
for select to authenticated using(profile_id=auth.uid() or public.is_platform_admin());

-- Extend the reviewed application-email allowlists. Events remain durable,
-- idempotent, fail-closed, and subject to the existing delivery control.
alter table public.email_outbox_events drop constraint if exists email_outbox_events_template_key_check;
alter table public.email_outbox_events add constraint email_outbox_events_template_key_check
  check(template_key in(
    'welcome','purchase_confirmation','refund_cancellation','fulfillment_tracking','support_acknowledgement',
    'admin_signup_notification','admin_release_notification'
  ));
alter table public.email_outbox_events drop constraint if exists email_outbox_events_source_kind_check;
alter table public.email_outbox_events add constraint email_outbox_events_source_kind_check
  check(source_kind in('account','commerce_order','commerce_adjustment','fulfillment','support_case','admin_notification'));

-- Keep profile creation, optional Creator-request recording, and the signup
-- notification in one transaction. A checked box never promotes the account.
create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  requested_username text;
  fallback_username text;
  requested_country text;
  requested_creator boolean:=lower(coalesce(new.raw_user_meta_data->>'creator_account_requested','false'))='true';
  member_name text;
begin
  requested_username:=trim(coalesce(new.raw_user_meta_data->>'username',''));
  fallback_username:=lower(regexp_replace(split_part(new.email,'@',1),'[^a-zA-Z0-9_]+','_','g'));
  fallback_username:=trim(both '_' from fallback_username);
  requested_country:=upper(trim(coalesce(new.raw_user_meta_data->>'country_code','')));
  member_name:=coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),
    nullif(trim(new.raw_user_meta_data->>'name'),''),split_part(new.email,'@',1),'44 Member');
  if requested_username !~ '^[A-Za-z0-9_]{3,32}$' then
    requested_username:=left(coalesce(nullif(fallback_username,''),'member'),23)||'_'||left(new.id::text,8);
  end if;
  if requested_country !~ '^[A-Z]{2}$' then requested_country:=null; end if;
  insert into public.profiles(id,display_name,username,country_code,home_country_code)
  values(new.id,member_name,requested_username,requested_country,requested_country)
  on conflict(id) do update set
    country_code=coalesce(public.profiles.country_code,excluded.country_code),
    home_country_code=coalesce(public.profiles.home_country_code,excluded.home_country_code);

  if requested_creator then
    insert into public.creator_access_requests(profile_id) values(new.id)
    on conflict(profile_id) do nothing;
  end if;

  insert into public.email_outbox_events(
    event_key,template_key,template_version,recipient_email,source_kind,source_id,payload
  ) values(
    'admin-signup/'||new.id,'admin_signup_notification',1,'support@44os.com','admin_notification',new.id,
    jsonb_build_object(
      'displayName',member_name,
      'username',requested_username,
      'email',new.email,
      'countryCode',requested_country,
      'creatorRequested',requested_creator,
      'signedUpAt',new.created_at,
      'adminUrl','https://44os.com/admin/people/'||new.id
    )
  ) on conflict(event_key) do nothing;
  return new;
end;
$$;

create or replace function public.queue_admin_music_release_notification()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare creator_name text; creator_email text;
begin
  if new.status<>'published' or new.experience_type<>'music'
    or (tg_op='UPDATE' and old.status='published') then return new; end if;
  select coalesce(profile.display_name,profile.username,new.creator),account.email
    into creator_name,creator_email
  from public.profiles profile left join auth.users account on account.id=profile.id
  where profile.id=new.author_id;
  insert into public.email_outbox_events(
    event_key,template_key,template_version,recipient_email,source_kind,source_id,payload
  ) values(
    'admin-release/'||new.id,'admin_release_notification',1,'support@44os.com','admin_notification',new.id,
    jsonb_build_object(
      'title',new.title,
      'creatorName',coalesce(creator_name,new.creator,'Unknown creator'),
      'creatorEmail',creator_email,
      'itemType',new.item_type,
      'publishedAt',coalesce(new.updated_at,now()),
      'adminUrl','https://44os.com/admin/content/'||new.id
    )
  ) on conflict(event_key) do nothing;
  return new;
end;
$$;
drop trigger if exists catalog_items_queue_admin_music_release on public.catalog_items;
create trigger catalog_items_queue_admin_music_release
after insert or update of status on public.catalog_items
for each row execute function public.queue_admin_music_release_notification();

drop function public.list_admin_people(text,text,integer,integer);
create function public.list_admin_people(
  target_query text default null,
  target_role text default null,
  target_limit integer default 8,
  target_offset integer default 0
)
returns table(
  profile_id uuid,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,
  signed_up_at timestamptz,display_name text,username text,avatar_url text,profile_role text,
  creator_type text,item_count bigint,profile_missing boolean,creator_request_status text,
  creator_request_requested_at timestamptz,total_count bigint
)
language plpgsql security definer stable set search_path=public,auth as $$
declare normalized_query text:=nullif(btrim(target_query),''); normalized_role text:=nullif(lower(btrim(target_role)),'');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid people paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_role is not null and normalized_role not in('member','creator','admin','creator_request') then raise exception 'Invalid profile role.' using errcode='22023'; end if;
  return query
    select account.id,account.email::text,account.email_confirmed_at,account.last_sign_in_at,account.created_at,
      profile.display_name,profile.username,profile.avatar_url,coalesce(profile.role,'member'),profile.creator_type,
      (select count(*) from public.catalog_items item where item.author_id=account.id),profile.id is null,
      request.status,request.requested_at,count(*) over()
    from auth.users account
    left join public.profiles profile on profile.id=account.id
    left join public.creator_access_requests request on request.profile_id=account.id
    where (
      normalized_role is null
      or (normalized_role='creator_request' and request.status='pending')
      or (normalized_role<>'creator_request' and coalesce(profile.role,'member')=normalized_role)
    ) and (normalized_query is null
      or coalesce(account.email,'') ilike '%'||normalized_query||'%'
      or coalesce(profile.display_name,'') ilike '%'||normalized_query||'%'
      or coalesce(profile.username,'') ilike '%'||normalized_query||'%')
    order by case when request.status='pending' then 0 else 1 end,account.created_at desc,account.id desc
    limit target_limit offset target_offset;
end;
$$;

create or replace function public.get_admin_person_detail(target_profile_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,auth as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if not exists(select 1 from auth.users where id=target_profile_id) then raise exception 'Account not found.' using errcode='P0002'; end if;
  select jsonb_build_object(
    'account',jsonb_build_object('id',account.id,'email',account.email,'email_confirmed_at',account.email_confirmed_at,
      'last_sign_in_at',account.last_sign_in_at,'created_at',account.created_at),
    'profile',case when profile.id is null then null else jsonb_build_object(
      'id',profile.id,'display_name',profile.display_name,'username',profile.username,'avatar_url',profile.avatar_url,
      'bio',profile.bio,'role',profile.role,'slug',profile.slug,'creator_type',profile.creator_type,
      'is_official',profile.is_official,'is_published',profile.is_published,'created_at',profile.created_at,'updated_at',profile.updated_at) end,
    'creator_request',(select jsonb_build_object(
      'status',request.status,'requested_at',request.requested_at,'reviewed_at',request.reviewed_at,
      'decision_reason',request.decision_reason,'reviewed_by',coalesce(reviewer.display_name,reviewer.username)
    ) from public.creator_access_requests request left join public.profiles reviewer on reviewer.id=request.reviewed_by
      where request.profile_id=account.id),
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',item.id,'title',item.title,'slug',item.slug,'cover_url',item.cover_url,'status',item.status,
      'experience_type',item.experience_type,'item_type',item.item_type,'created_at',item.created_at,'updated_at',item.updated_at)
      order by item.created_at desc,item.id desc) from public.catalog_items item where item.author_id=account.id),'[]'::jsonb),
    'role_history',coalesce((select jsonb_agg(jsonb_build_object(
      'id',event.id,'previous_role',event.previous_role,'new_role',event.new_role,'reason',event.reason,
      'created_at',event.created_at,'changed_by',coalesce(actor.display_name,actor.username,'44 Admin'))
      order by event.created_at desc,event.id desc) from public.admin_profile_role_events event
      left join public.profiles actor on actor.id=event.changed_by where event.profile_id=account.id),'[]'::jsonb)
  ) into result from auth.users account left join public.profiles profile on profile.id=account.id where account.id=target_profile_id;
  return result;
end;
$$;

create or replace function public.review_creator_access_request(
  target_profile_id uuid,target_decision text,target_reason text
) returns text language plpgsql security definer set search_path=public,auth as $$
declare request public.creator_access_requests; normalized_reason text:=btrim(target_reason);
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_decision not in('approved','rejected') then raise exception 'Choose approve or reject.' using errcode='22023'; end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023'; end if;
  select * into request from public.creator_access_requests where profile_id=target_profile_id for update;
  if request.profile_id is null then raise exception 'Creator request not found.' using errcode='P0002'; end if;
  if request.status<>'pending' then raise exception 'This Creator request has already been reviewed.' using errcode='55000'; end if;
  if target_decision='approved' then
    perform public.set_admin_creator_access(target_profile_id,'creator',normalized_reason);
  end if;
  update public.creator_access_requests set status=target_decision,reviewed_at=now(),reviewed_by=auth.uid(),
    decision_reason=normalized_reason,updated_at=now() where profile_id=target_profile_id;
  return target_decision;
end;
$$;

create or replace function public.get_admin_dashboard_summary()
returns jsonb language plpgsql security definer stable set search_path=public,auth as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  select jsonb_build_object(
    'people_count',(select count(*) from auth.users),
    'creator_count',(select count(*) from public.profiles where role='creator'),
    'pending_creator_request_count',(select count(*) from public.creator_access_requests where status='pending'),
    'pending_review_count',(select count(*) from public.item_submissions where status='pending'),
    'recent_error_count',(select count(*) from public.ops_error_events where occurred_at>=now()-interval '24 hours'),
    'content_count',(select count(*) from public.catalog_items),
    'published_count',(select count(*) from public.catalog_items where status='published'),
    'draft_count',(select count(*) from public.catalog_items where status='draft'),
    'archived_count',(select count(*) from public.catalog_items where status='archived'),
    'publishing',(select jsonb_build_object('phase',phase,'label',case when review_required then 'Admin review required' else 'Approved creators publish directly' end,'enabled',review_required) from public.publishing_runtime_controls where singleton),
    'email_delivery',(select jsonb_build_object('enabled',enabled,'label',case when enabled then 'On' else 'Off' end) from public.notification_delivery_controls where singleton),
    'payments',(select jsonb_build_object('enabled',(checkout_enabled and stripe_payments_enabled),'label',case when checkout_enabled and stripe_payments_enabled then 'On' else 'Off' end) from public.commerce_runtime_controls where singleton),
    'beat_store',(select jsonb_build_object('enabled',catalog_enabled,'label',case when catalog_enabled and checkout_enabled then 'Live' when catalog_enabled and nonexclusive_pilot_enabled then 'Pilot' when review_surfaces_enabled then 'Private review' else 'Off' end) from public.beat_runtime_controls where singleton)
  ) into result;
  return result;
end;
$$;

revoke all on function public.queue_admin_music_release_notification() from public,anon,authenticated;
revoke all on function public.list_admin_people(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.get_admin_person_detail(uuid) from public,anon,authenticated;
revoke all on function public.review_creator_access_request(uuid,text,text) from public,anon,authenticated;
revoke all on function public.get_admin_dashboard_summary() from public,anon,authenticated;
grant execute on function public.list_admin_people(text,text,integer,integer),public.get_admin_person_detail(uuid),
  public.review_creator_access_request(uuid,text,text),public.get_admin_dashboard_summary() to authenticated,service_role;

comment on table public.creator_access_requests is
  'Signup-time request for Creator publishing access. Pending requests never change the effective member role.';

commit;
