begin;

-- Keep the monitored Support mailbox as the canonical recipient, while also
-- giving every administrator an individually tracked copy of operational
-- signup and release notifications.
create or replace function public.queue_admin_notification_emails(
  target_event_key text,
  target_template_key text,
  target_template_version integer,
  target_source_id uuid,
  target_payload jsonb
) returns void
language plpgsql
security definer
set search_path=public,auth as $$
declare
  admin_row record;
begin
  insert into public.email_outbox_events(
    event_key,template_key,template_version,recipient_email,source_kind,source_id,payload
  ) values(
    target_event_key,target_template_key,target_template_version,
    'support@44os.com','admin_notification',target_source_id,target_payload
  ) on conflict(event_key) do nothing;

  for admin_row in
    select profile.id as profile_id, lower(btrim(account.email)) as email
    from public.profiles profile
    join auth.users account on account.id=profile.id
    where profile.role='admin'
      and account.email is not null
      and lower(btrim(account.email))<>'support@44os.com'
  loop
    insert into public.email_outbox_events(
      event_key,template_key,template_version,recipient_user_id,recipient_email,
      source_kind,source_id,payload
    ) values(
      target_event_key||'/admin/'||admin_row.profile_id,
      target_template_key,target_template_version,admin_row.profile_id,admin_row.email,
      'admin_notification',target_source_id,target_payload
    ) on conflict(event_key) do nothing;
  end loop;
end;
$$;

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

  perform public.queue_admin_notification_emails(
    'admin-signup/'||new.id,'admin_signup_notification',1,new.id,
    jsonb_build_object(
      'displayName',member_name,
      'username',requested_username,
      'email',new.email,
      'countryCode',requested_country,
      'creatorRequested',requested_creator,
      'signedUpAt',new.created_at,
      'adminUrl','https://app.44os.com/admin/people/'||new.id
    )
  );
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
  perform public.queue_admin_notification_emails(
    'admin-release/'||new.id,'admin_release_notification',1,new.id,
    jsonb_build_object(
      'title',new.title,
      'creatorName',coalesce(creator_name,new.creator,'Unknown creator'),
      'creatorEmail',creator_email,
      'itemType',new.item_type,
      'publishedAt',coalesce(new.updated_at,now()),
      'adminUrl','https://app.44os.com/admin/content/'||new.id
    )
  );
  return new;
end;
$$;

revoke all on function public.queue_admin_notification_emails(text,text,integer,uuid,jsonb) from public,anon,authenticated;

commit;
