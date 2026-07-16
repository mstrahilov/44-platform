-- M13 Admin Control Center.
-- Adds bounded administrator read models and audited role/content operations.
-- Runtime activation controls remain read-only and unchanged.

create table public.admin_profile_role_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  previous_role text not null check (previous_role in ('member','creator','admin')),
  new_role text not null check (new_role in ('member','creator','admin')),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check (previous_role <> new_role)
);
create index admin_profile_role_events_profile_idx on public.admin_profile_role_events(profile_id,created_at desc,id desc);

create table public.admin_item_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  action text not null check (action in ('publish','unpublish','archive')),
  previous_status text not null check (previous_status in ('draft','published','archived')),
  new_status text not null check (new_status in ('draft','published','archived')),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check (previous_status <> new_status)
);
create index admin_item_lifecycle_events_item_idx on public.admin_item_lifecycle_events(item_id,created_at desc,id desc);

create or replace function public.reject_admin_audit_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Administrator audit history is immutable.' using errcode='55000';
end;
$$;
create trigger admin_profile_role_events_immutable before update or delete on public.admin_profile_role_events for each row execute function public.reject_admin_audit_mutation();
create trigger admin_item_lifecycle_events_immutable before update or delete on public.admin_item_lifecycle_events for each row execute function public.reject_admin_audit_mutation();

alter table public.admin_profile_role_events enable row level security;
alter table public.admin_item_lifecycle_events enable row level security;
create policy admin_profile_role_events_admin_read on public.admin_profile_role_events for select to authenticated using(public.is_platform_admin());
create policy admin_item_lifecycle_events_admin_read on public.admin_item_lifecycle_events for select to authenticated using(public.is_platform_admin());
revoke all on public.admin_profile_role_events,public.admin_item_lifecycle_events from public,anon,authenticated;
grant select on public.admin_profile_role_events,public.admin_item_lifecycle_events to authenticated;
grant all on public.admin_profile_role_events,public.admin_item_lifecycle_events to service_role;

create or replace function public.get_admin_dashboard_summary()
returns jsonb language plpgsql security definer stable set search_path=public,auth as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  select jsonb_build_object(
    'people_count',(select count(*) from auth.users),
    'creator_count',(select count(*) from public.profiles where role='creator'),
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

create or replace function public.list_admin_people(
  target_query text default null,
  target_role text default null,
  target_limit integer default 8,
  target_offset integer default 0
)
returns table(
  profile_id uuid,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,
  signed_up_at timestamptz,display_name text,username text,avatar_url text,profile_role text,
  creator_type text,item_count bigint,profile_missing boolean,total_count bigint
)
language plpgsql security definer stable set search_path=public,auth as $$
declare normalized_query text := nullif(btrim(target_query),''); normalized_role text := nullif(lower(btrim(target_role)),'');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid people paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_role is not null and normalized_role not in ('member','creator','admin') then raise exception 'Invalid profile role.' using errcode='22023'; end if;
  return query
    select u.id,u.email::text,u.email_confirmed_at,u.last_sign_in_at,u.created_at,
      p.display_name,p.username,p.avatar_url,coalesce(p.role,'member'),p.creator_type,
      (select count(*) from public.catalog_items item where item.author_id=u.id),
      p.id is null,count(*) over()
    from auth.users u
    left join public.profiles p on p.id=u.id
    where (normalized_role is null or coalesce(p.role,'member')=normalized_role)
      and (normalized_query is null
        or coalesce(u.email,'') ilike '%'||normalized_query||'%'
        or coalesce(p.display_name,'') ilike '%'||normalized_query||'%'
        or coalesce(p.username,'') ilike '%'||normalized_query||'%')
    order by u.created_at desc,u.id desc
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
    'account',jsonb_build_object(
      'id',u.id,'email',u.email,'email_confirmed_at',u.email_confirmed_at,
      'last_sign_in_at',u.last_sign_in_at,'created_at',u.created_at
    ),
    'profile',case when p.id is null then null else jsonb_build_object(
      'id',p.id,'display_name',p.display_name,'username',p.username,'avatar_url',p.avatar_url,
      'bio',p.bio,'role',p.role,'slug',p.slug,'creator_type',p.creator_type,
      'is_official',p.is_official,'is_published',p.is_published,'created_at',p.created_at,'updated_at',p.updated_at
    ) end,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'title',i.title,'slug',i.slug,'cover_url',i.cover_url,'status',i.status,
      'experience_type',i.experience_type,'item_type',i.item_type,'created_at',i.created_at,'updated_at',i.updated_at
    ) order by i.created_at desc,i.id desc) from public.catalog_items i where i.author_id=u.id),'[]'::jsonb),
    'role_history',coalesce((select jsonb_agg(jsonb_build_object(
      'id',event.id,'previous_role',event.previous_role,'new_role',event.new_role,
      'reason',event.reason,'created_at',event.created_at,'changed_by',coalesce(actor.display_name,actor.username,'44 Admin')
    ) order by event.created_at desc,event.id desc)
      from public.admin_profile_role_events event left join public.profiles actor on actor.id=event.changed_by
      where event.profile_id=u.id),'[]'::jsonb)
  ) into result
  from auth.users u left join public.profiles p on p.id=u.id where u.id=target_profile_id;
  return result;
end;
$$;

create or replace function public.set_admin_creator_access(target_profile_id uuid,target_role text,target_reason text)
returns void language plpgsql security definer set search_path=public,auth as $$
declare existing_profile_role text; account_email text; normalized_reason text := btrim(target_reason);
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_role not in ('member','creator') then raise exception 'Only member and creator access can be changed here.' using errcode='22023'; end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023'; end if;
  select email into account_email from auth.users where id=target_profile_id;
  if not found then raise exception 'Account not found.' using errcode='P0002'; end if;
  insert into public.profiles(id,display_name,username,slug,role)
  values(
    target_profile_id,
    coalesce(nullif(split_part(account_email,'@',1),''),'44 Member'),
    'member_'||left(replace(target_profile_id::text,'-',''),8),
    'member-'||left(replace(target_profile_id::text,'-',''),8),
    'member'
  ) on conflict(id) do nothing;
  select profile.role into existing_profile_role from public.profiles profile where profile.id=target_profile_id for update;
  if existing_profile_role='admin' then raise exception 'Administrator roles cannot be changed from this control.' using errcode='42501'; end if;
  if existing_profile_role=target_role then raise exception 'This account already has that role.' using errcode='55000'; end if;
  update public.profiles set role=target_role,updated_at=now() where id=target_profile_id;
  insert into public.admin_profile_role_events(profile_id,previous_role,new_role,changed_by,reason)
  values(target_profile_id,existing_profile_role,target_role,auth.uid(),normalized_reason);
end;
$$;

create or replace function public.list_admin_content(
  target_query text default null,
  target_status text default null,
  target_type text default null,
  target_limit integer default 8,
  target_offset integer default 0
)
returns table(
  item_id uuid,title text,slug text,cover_url text,creator_id uuid,creator_name text,creator_username text,
  experience_type text,item_type text,assigned_type text,publication_status text,review_status text,
  pending_submission_id uuid,created_at timestamptz,updated_at timestamptz,total_count bigint
)
language plpgsql security definer stable set search_path=public as $$
declare normalized_query text := nullif(btrim(target_query),''); normalized_status text := nullif(lower(btrim(target_status)),''); normalized_type text := nullif(lower(btrim(target_type)),'');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid content paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_status is not null and normalized_status not in ('draft','published','archived','pending','approved','rejected','withdrawn') then raise exception 'Invalid content status.' using errcode='22023'; end if;
  return query
    select i.id,i.title,i.slug,i.cover_url,i.author_id,coalesce(p.display_name,i.creator),p.username,
      i.experience_type,i.item_type,assigned.label,i.status,coalesce(review.status,'none'),
      case when review.status='pending' then review.id else null end,i.created_at,i.updated_at,count(*) over()
    from public.catalog_items i
    left join public.profiles p on p.id=i.author_id
    left join public.item_type_assignments assignment on assignment.item_id=i.id
    left join public.item_types assigned on assigned.id=assignment.item_type_id
    left join lateral (
      select submission.id,submission.status from public.item_submissions submission
      where submission.item_id=i.id
      order by (submission.status='pending') desc,submission.submitted_at desc,submission.id desc limit 1
    ) review on true
    where (normalized_query is null or i.title ilike '%'||normalized_query||'%' or i.creator ilike '%'||normalized_query||'%' or coalesce(p.username,'') ilike '%'||normalized_query||'%')
      and (normalized_status is null or (normalized_status in ('draft','published','archived') and i.status=normalized_status) or (normalized_status in ('pending','approved','rejected','withdrawn') and review.status=normalized_status))
      and (normalized_type is null or lower(i.experience_type)=normalized_type or lower(i.item_type)=normalized_type or lower(coalesce(assigned.slug,''))=normalized_type or lower(coalesce(assigned.label,''))=normalized_type)
    order by i.created_at desc,i.id desc
    limit target_limit offset target_offset;
end;
$$;

create or replace function public.get_admin_content_detail(target_item_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare result jsonb; item_row public.catalog_items;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  select * into item_row from public.catalog_items where id=target_item_id;
  if not found then raise exception 'Content not found.' using errcode='P0002'; end if;
  select jsonb_build_object(
    'item',jsonb_build_object(
      'id',item_row.id,'title',item_row.title,'slug',item_row.slug,'creator',item_row.creator,
      'cover_url',item_row.cover_url,'hero_url',item_row.hero_url,'status',item_row.status,
      'experience_type',item_row.experience_type,'item_type',item_row.item_type,'year',item_row.year,
      'short_description',item_row.short_description,'long_description',item_row.long_description,
      'price_cents',item_row.price_cents,'is_free',item_row.is_free,'featured',item_row.featured,
      'fulfillment_type',item_row.fulfillment_type,'created_at',item_row.created_at,'updated_at',item_row.updated_at
    ),
    'creator',(select jsonb_build_object('id',p.id,'display_name',p.display_name,'username',p.username,'avatar_url',p.avatar_url,'role',p.role) from public.profiles p where p.id=item_row.author_id),
    'taxonomy',jsonb_build_object(
      'type',(select jsonb_build_object('id',t.id,'label',t.label,'slug',t.slug) from public.item_type_assignments a join public.item_types t on t.id=a.item_type_id where a.item_id=item_row.id),
      'tags',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'slug',t.slug) order by t.label) from public.item_tag_assignments a join public.item_tags t on t.id=a.item_tag_id where a.item_id=item_row.id),'[]'::jsonb)
    ),
    'tracks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'number',t.number,'title',t.title,'duration_seconds',t.duration_seconds,'has_audio',nullif(btrim(t.audio_url),'') is not null) order by t.number,t.id) from public.tracks t where t.item_id=item_row.id),'[]'::jsonb),
    'assets',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'asset_type',a.asset_type,'title',a.title,'is_downloadable',a.is_downloadable,'has_file',coalesce(nullif(btrim(a.storage_path),''),nullif(btrim(a.file_url),'')) is not null) order by a.sort_order,a.id) from public.item_assets a where a.item_id=item_row.id),'[]'::jsonb),
    'offers',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'title',o.title,'offer_type',o.offer_type,'status',o.status,'price_cents',o.price_cents,'currency',o.currency,'fulfillment_type',o.fulfillment_type) order by o.created_at,o.id) from public.catalog_offers o where o.item_id=item_row.id),'[]'::jsonb),
    'health',coalesce((select jsonb_agg(jsonb_build_object('code',h.code,'message',h.message) order by h.code) from public.catalog_item_health(item_row.id) h),'[]'::jsonb),
    'submissions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'status',s.status,'submission_kind',s.submission_kind,'submitted_at',s.submitted_at,'decided_at',s.decided_at,'decision_reason',s.decision_reason,'proposed_item',(select to_jsonb(snapshot) from public.item_submission_items snapshot where snapshot.submission_id=s.id)) order by s.submitted_at desc,s.id desc) from public.item_submissions s where s.item_id=item_row.id),'[]'::jsonb),
    'lifecycle_history',coalesce((select jsonb_agg(jsonb_build_object('id',event.id,'action',event.action,'previous_status',event.previous_status,'new_status',event.new_status,'reason',event.reason,'created_at',event.created_at,'changed_by',coalesce(actor.display_name,actor.username,'44 Admin')) order by event.created_at desc,event.id desc) from public.admin_item_lifecycle_events event left join public.profiles actor on actor.id=event.changed_by where event.item_id=item_row.id),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.set_admin_item_lifecycle(target_item_id uuid,target_action text,target_reason text)
returns text language plpgsql security definer set search_path=public as $$
declare item_row public.catalog_items; normalized_reason text := btrim(target_reason); next_status text; problem record;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_action not in ('publish','unpublish','archive') then raise exception 'Invalid lifecycle action.' using errcode='22023'; end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023'; end if;
  select * into item_row from public.catalog_items where id=target_item_id for update;
  if not found then raise exception 'Content not found.' using errcode='P0002'; end if;
  if exists(select 1 from public.item_submissions where item_id=target_item_id and status='pending') then raise exception 'Resolve the pending review before changing publication state.' using errcode='55000'; end if;
  if target_action='publish' then
    if item_row.status<>'draft' then raise exception 'Only draft content can be published.' using errcode='55000'; end if;
    select * into problem from public.catalog_item_health(target_item_id) limit 1;
    if found then raise exception 'Publication blocked: %',problem.message using errcode='23514'; end if;
    next_status := 'published';
  elsif target_action='unpublish' then
    if item_row.status<>'published' then raise exception 'Only published content can be unpublished.' using errcode='55000'; end if;
    if exists(select 1 from public.entitlements where item_id=target_item_id and status='active')
      or exists(select 1 from public.commerce_order_items line join public.commerce_orders order_row on order_row.id=line.order_id where line.item_id=target_item_id and order_row.status not in ('draft','canceled','failed')) then
      raise exception 'Content with purchases or active access must be archived to preserve buyer access.' using errcode='55000';
    end if;
    next_status := 'draft';
  else
    if item_row.status='archived' then raise exception 'Archived content is already final.' using errcode='55000'; end if;
    next_status := 'archived';
  end if;
  perform set_config('os44.review_apply','1',true);
  update public.catalog_items set status=next_status,updated_at=now() where id=target_item_id;
  if target_action='archive' then update public.catalog_offers set status='archived',updated_at=now() where item_id=target_item_id and status<>'archived'; end if;
  insert into public.admin_item_lifecycle_events(item_id,action,previous_status,new_status,changed_by,reason)
  values(target_item_id,target_action,item_row.status,next_status,auth.uid(),normalized_reason);
  return next_status;
end;
$$;

create or replace function public.list_admin_error_events_page(
  target_release text default null,target_path text default null,target_since timestamptz default null,
  target_limit integer default 8,target_offset integer default 0
)
returns table(id uuid,occurred_at timestamptz,release text,runtime text,method text,path text,error_name text,error_digest text,error_code text,safe_message text,framework_context jsonb,total_count bigint)
language plpgsql security definer stable set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid error-event paging.' using errcode='22023'; end if;
  return query select e.id,e.occurred_at,e.release,e.runtime,e.method,e.path,e.error_name,e.error_digest,e.error_code,e.safe_message,e.framework_context,count(*) over()
    from public.ops_error_events e
    where (nullif(btrim(target_release),'') is null or e.release=nullif(btrim(target_release),''))
      and (nullif(btrim(target_path),'') is null or e.path ilike '%'||btrim(target_path)||'%')
      and (target_since is null or e.occurred_at>=target_since)
    order by e.occurred_at desc,e.id desc limit target_limit offset target_offset;
end;
$$;

drop policy if exists catalog_offers_read on public.catalog_offers;
create policy catalog_offers_read on public.catalog_offers for select using(
  public.can_manage_item(item_id) or (
    status='active' and exists(select 1 from public.catalog_items item where item.id=item_id and item.status='published')
  )
);
drop policy if exists offer_entitlements_read on public.offer_entitlements;
create policy offer_entitlements_read on public.offer_entitlements for select using(
  exists(select 1 from public.catalog_offers offer join public.catalog_items item on item.id=offer.item_id where offer.id=offer_id and (public.can_manage_item(offer.item_id) or (offer.status='active' and item.status='published')))
);

revoke all on function public.reject_admin_audit_mutation() from public,anon,authenticated;
revoke all on function public.get_admin_dashboard_summary(),public.list_admin_people(text,text,integer,integer),public.get_admin_person_detail(uuid),public.set_admin_creator_access(uuid,text,text),public.list_admin_content(text,text,text,integer,integer),public.get_admin_content_detail(uuid),public.set_admin_item_lifecycle(uuid,text,text),public.list_admin_error_events_page(text,text,timestamptz,integer,integer) from public,anon,authenticated;
grant execute on function public.get_admin_dashboard_summary(),public.list_admin_people(text,text,integer,integer),public.get_admin_person_detail(uuid),public.set_admin_creator_access(uuid,text,text),public.list_admin_content(text,text,text,integer,integer),public.get_admin_content_detail(uuid),public.set_admin_item_lifecycle(uuid,text,text),public.list_admin_error_events_page(text,text,timestamptz,integer,integer) to authenticated,service_role;

comment on table public.admin_profile_role_events is 'Immutable administrator audit for member and creator access changes.';
comment on table public.admin_item_lifecycle_events is 'Immutable administrator audit for publication, unpublication, and archival actions.';
comment on function public.list_admin_people(text,text,integer,integer) is 'Admin-only allow-listed auth account directory; passwords, tokens, phone, and metadata are never returned.';
