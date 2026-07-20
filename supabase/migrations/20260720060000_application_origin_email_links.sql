begin;

-- Newly queued application email actions use the canonical application origin.
-- Historical outbox rows and applied migrations remain immutable; the permanent
-- apex redirects keep already-sent links operational.
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
      'displayName',member_name,'username',requested_username,'email',new.email,
      'countryCode',requested_country,'creatorRequested',requested_creator,
      'signedUpAt',new.created_at,'adminUrl','https://app.44os.com/admin/people/'||new.id
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
      'title',new.title,'creatorName',coalesce(creator_name,new.creator,'Unknown creator'),
      'creatorEmail',creator_email,'itemType',new.item_type,
      'publishedAt',coalesce(new.updated_at,now()),
      'adminUrl','https://app.44os.com/admin/content/'||new.id
    )
  ) on conflict(event_key) do nothing;
  return new;
end;
$$;

create or replace function public.queue_verified_commerce_email()
returns trigger language plpgsql security definer set search_path=public as $$
declare event_key text; template_key text; outcome text; lines jsonb; orders_url text:='https://app.44os.com/orders';
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
    jsonb_build_object('orderReference','44-'||upper(left(replace(order_row.id::text,'-',''),6)),'status',target_status,'detail',target_detail,'trackingUrl',target_tracking_url,'trackingNumber',target_tracking_number,'ordersUrl','https://app.44os.com/orders'));
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
    jsonb_build_object('caseReference',case_ref,'subject',target_subject,'receivedAt',now(),'supportUrl','https://app.44os.com/support'));
  return case_id;
end;
$$;

create or replace function public.queue_creator_access_granted()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare account_email text; account_name text;
begin
  if new.new_role<>'creator' then return new; end if;
  select account.email,coalesce(nullif(profile.display_name,''),nullif(profile.username,''),'Creator')
  into account_email,account_name from auth.users account
  left join public.profiles profile on profile.id=account.id where account.id=new.profile_id;
  if account_email is null then return new; end if;
  insert into public.email_outbox_events(
    event_key,template_key,template_version,recipient_user_id,recipient_email,source_kind,source_id,payload
  ) values(
    'creator-access-granted/'||new.id,'creator_access_granted',1,new.profile_id,account_email,'account',new.profile_id,
    jsonb_build_object('displayName',account_name,'studioUrl','https://app.44os.com/studio')
  ) on conflict(event_key) do nothing;
  insert into public.achievement_events(user_id,event_type,metadata)
  values(new.profile_id,'creator_access_granted',jsonb_build_object('studio_url','/studio'));
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile(),public.queue_admin_music_release_notification(),
  public.queue_verified_commerce_email(),public.queue_creator_access_granted() from public,anon,authenticated;
revoke all on function public.queue_fulfillment_email(uuid,text,text,text,text,text),
  public.create_support_case(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.queue_fulfillment_email(uuid,text,text,text,text,text),
  public.create_support_case(uuid,text,text,text) to service_role;

commit;
