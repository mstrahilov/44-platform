-- Keep accounts that are pending deletion out of administrator directories.
-- Their protected transaction records remain available through their owning
-- tables, but the deleted account should not appear as an active person.

create or replace function public.get_admin_dashboard_summary()
returns jsonb language plpgsql security definer stable set search_path=public,auth as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  select jsonb_build_object(
    'people_count',(select count(*) from auth.users account left join public.profiles profile on profile.id=account.id where profile.deletion_requested_at is null),
    'creator_count',(select count(*) from public.profiles where role='creator' and deletion_requested_at is null),
    'pending_review_count',(select count(*) from public.item_submissions where status='pending'),
    'recent_error_count',(select count(*) from public.ops_error_events where occurred_at>=now()-interval '24 hours'),
    'content_count',(select count(*) from public.catalog_items),
    'published_count',(select count(*) from public.catalog_items where status='published'),
    'draft_count',(select count(*) from public.catalog_items where status='draft'),
    'archived_count',(select count(*) from public.catalog_items where status='archived'),
    'publishing',(
      select jsonb_build_object(
        'phase',phase,
        'label',case when review_required then 'Admin review required' else 'Approved creators publish directly' end,
        'enabled',review_required
      ) from public.publishing_runtime_controls where singleton
    ),
    'email_delivery',(
      select jsonb_build_object('enabled',enabled,'label',case when enabled then 'On' else 'Off' end)
      from public.notification_delivery_controls where singleton
    ),
    'payments',(
      select jsonb_build_object(
        'enabled',(checkout_enabled and stripe_payments_enabled),
        'label',case when checkout_enabled and stripe_payments_enabled then 'On' else 'Off' end
      ) from public.commerce_runtime_controls where singleton
    ),
    'beat_store',(
      select jsonb_build_object(
        'enabled',catalog_enabled,
        'label',case
          when catalog_enabled and checkout_enabled then 'Live'
          when catalog_enabled and nonexclusive_pilot_enabled then 'Pilot'
          when review_surfaces_enabled then 'Private review'
          else 'Off'
        end
      ) from public.beat_runtime_controls where singleton
    )
  ) into result;
  return result;
end;
$$;

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
  creator_request_requested_at timestamptz,team_access boolean,total_count bigint
)
language plpgsql security definer stable set search_path=public,auth as $$
declare normalized_query text:=nullif(btrim(target_query),''); normalized_role text:=nullif(lower(btrim(target_role)),'');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid people paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_role is not null and normalized_role not in('member','creator','admin','creator_request','team') then raise exception 'Invalid profile role.' using errcode='22023'; end if;
  return query
    select account.id,account.email::text,account.email_confirmed_at,account.last_sign_in_at,account.created_at,
      profile.display_name,profile.username,profile.avatar_url,coalesce(profile.role,'member'),profile.creator_type,
      (select count(*) from public.catalog_items item where item.author_id=account.id),profile.id is null,
      request.status,request.requested_at,
      (coalesce(profile.role,'member')='admin' or coalesce(team_grant.is_active,false)),count(*) over()
    from auth.users account
    left join public.profiles profile on profile.id=account.id
    left join public.creator_access_requests request on request.profile_id=account.id
    left join public.team_access_grants team_grant on team_grant.profile_id=account.id
    where profile.deletion_requested_at is null
      and (
        normalized_role is null
        or (normalized_role='creator_request' and request.status='pending')
        or (normalized_role='team' and (coalesce(profile.role,'member')='admin' or coalesce(team_grant.is_active,false)))
        or (normalized_role not in('creator_request','team') and coalesce(profile.role,'member')=normalized_role)
      ) and (normalized_query is null
        or coalesce(account.email,'') ilike '%'||normalized_query||'%'
        or coalesce(profile.display_name,'') ilike '%'||normalized_query||'%'
        or coalesce(profile.username,'') ilike '%'||normalized_query||'%')
    order by case when request.status='pending' then 0 else 1 end,account.created_at desc,account.id desc
    limit target_limit offset target_offset;
end;
$$;

grant execute on function public.get_admin_dashboard_summary(),public.list_admin_people(text,text,integer,integer) to authenticated,service_role;
