alter table public.profiles
  add column if not exists last_active_at timestamptz;

create or replace function public.record_current_user_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  activity_time timestamptz := clock_timestamp();
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  insert into public.profiles (id, last_active_at)
  values (actor_id, activity_time)
  on conflict (id) do update
    set last_active_at = excluded.last_active_at
    where profiles.last_active_at is null
       or profiles.last_active_at <= activity_time - interval '5 minutes';
end;
$$;

revoke all on function public.record_current_user_activity() from public, anon;
grant execute on function public.record_current_user_activity() to authenticated;

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
      'country_code',coalesce(nullif(upper(account.raw_user_meta_data->>'country_code'),''),profile.country_code),
      'last_active_at',profile.last_active_at,
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

revoke all on function public.get_admin_person_detail(uuid) from public,anon,authenticated;
grant execute on function public.get_admin_person_detail(uuid) to authenticated,service_role;
