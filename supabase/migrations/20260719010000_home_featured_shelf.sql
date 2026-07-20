-- Ordered, audited Home Featured shelf.
-- Public discovery reads only eligible published Music Items through a bounded RPC.

create table public.home_shelf_entries (
  shelf_key text not null check (shelf_key in ('featured')),
  position smallint not null check (position between 1 and 4),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (shelf_key,position),
  unique (shelf_key,item_id)
);

create table public.admin_home_shelf_events (
  id uuid primary key default gen_random_uuid(),
  shelf_key text not null check (shelf_key in ('featured')),
  previous_items jsonb not null,
  new_items jsonb not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(previous_items)='array'),
  check (jsonb_typeof(new_items)='array')
);

create index admin_home_shelf_events_shelf_idx
  on public.admin_home_shelf_events(shelf_key,created_at desc,id desc);

create trigger admin_home_shelf_events_immutable
before update or delete on public.admin_home_shelf_events
for each row execute function public.reject_admin_audit_mutation();

alter table public.home_shelf_entries enable row level security;
alter table public.admin_home_shelf_events enable row level security;

create policy admin_home_shelf_events_admin_read
on public.admin_home_shelf_events for select to authenticated
using(public.is_platform_admin());

revoke all on public.home_shelf_entries,public.admin_home_shelf_events from public,anon,authenticated;
grant select on public.admin_home_shelf_events to authenticated;
grant all on public.home_shelf_entries,public.admin_home_shelf_events to service_role;

-- Preserve any existing editorial choices as the initial ordered shelf.
insert into public.home_shelf_entries(shelf_key,position,item_id)
select 'featured',row_number() over (
  order by item.release_date desc nulls last,item.created_at desc,item.id
)::smallint,item.id
from public.catalog_items item
where item.featured
  and item.status='published'
  and item.experience_type='music'
  and lower(item.item_type)<>'beat'
  and not exists(
    select 1
    from public.item_type_assignments assignment
    join public.item_types item_type on item_type.id=assignment.item_type_id
    where assignment.item_id=item.id and item_type.slug='beat'
  )
order by item.release_date desc nulls last,item.created_at desc,item.id
limit 4;

create or replace function public.list_home_featured_item_ids()
returns table(item_id uuid,slot_position smallint)
language sql
security definer
stable
set search_path=public
as $$
  select entry.item_id,entry.position as slot_position
  from public.home_shelf_entries entry
  join public.catalog_items item on item.id=entry.item_id
  where entry.shelf_key='featured'
    and item.status='published'
    and item.experience_type='music'
    and lower(item.item_type)<>'beat'
    and not exists(
      select 1
      from public.item_type_assignments assignment
      join public.item_types item_type on item_type.id=assignment.item_type_id
      where assignment.item_id=item.id and item_type.slug='beat'
    )
  order by entry.position;
$$;

create or replace function public.get_admin_home_featured_state()
returns jsonb
language plpgsql
security definer
stable
set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'mutation_ready',true,
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'position',entry.position,
        'item_id',item.id,
        'title',item.title,
        'creator_name',coalesce(profile.display_name,profile.username,item.creator),
        'cover_url',item.cover_url,
        'release_date',item.release_date,
        'created_at',item.created_at
      ) order by entry.position)
      from public.home_shelf_entries entry
      join public.catalog_items item on item.id=entry.item_id
      left join public.profiles profile on profile.id=item.author_id
      where entry.shelf_key='featured'
    ),'[]'::jsonb),
    'candidates',coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id',candidate.item_id,
        'title',candidate.title,
        'creator_name',candidate.creator_name,
        'cover_url',candidate.cover_url,
        'release_date',candidate.release_date,
        'created_at',candidate.created_at
      ) order by candidate.release_date desc nulls last,candidate.created_at desc,candidate.item_id)
      from (
        select item.id as item_id,item.title,
          coalesce(profile.display_name,profile.username,item.creator) as creator_name,
          item.cover_url,item.release_date,item.created_at
        from public.catalog_items item
        left join public.profiles profile on profile.id=item.author_id
        where item.status='published'
          and item.experience_type='music'
          and lower(item.item_type)<>'beat'
          and not exists(
            select 1
            from public.item_type_assignments assignment
            join public.item_types item_type on item_type.id=assignment.item_type_id
            where assignment.item_id=item.id and item_type.slug='beat'
          )
      ) candidate
    ),'[]'::jsonb),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',history.id,
        'previous_items',history.previous_items,
        'new_items',history.new_items,
        'reason',history.reason,
        'created_at',history.created_at,
        'changed_by',coalesce(profile.display_name,profile.username,'44 Admin')
      ) order by history.created_at desc,history.id desc)
      from (
        select * from public.admin_home_shelf_events
        where shelf_key='featured'
        order by created_at desc,id desc
        limit 20
      ) history
      left join public.profiles profile on profile.id=history.changed_by
    ),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.set_admin_home_featured_items(
  target_item_ids uuid[],
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  normalized_item_ids uuid[] := coalesce(target_item_ids,array[]::uuid[]);
  normalized_reason text := btrim(target_reason);
  previous_items jsonb;
  next_items jsonb;
  item_count integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then
    raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023';
  end if;
  if cardinality(normalized_item_ids)>4 then
    raise exception 'Featured supports at most four Items.' using errcode='22023';
  end if;
  if (select count(*) from unnest(normalized_item_ids) item_id)
    <> (select count(distinct item_id) from unnest(normalized_item_ids) item_id) then
    raise exception 'Featured Items must be unique.' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('home_shelf:featured'));
  perform 1 from public.catalog_items item
  where item.id=any(normalized_item_ids)
  for share;

  select count(*) into item_count
  from public.catalog_items item
  where item.id=any(normalized_item_ids)
    and item.status='published'
    and item.experience_type='music'
    and lower(item.item_type)<>'beat'
    and not exists(
      select 1
      from public.item_type_assignments assignment
      join public.item_types item_type on item_type.id=assignment.item_type_id
      where assignment.item_id=item.id and item_type.slug='beat'
    );
  if item_count<>cardinality(normalized_item_ids) then
    raise exception 'Every Featured selection must be a published Music release.' using errcode='23514';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id',item.id,'title',item.title,
    'creator_name',coalesce(profile.display_name,profile.username,item.creator),
    'position',entry.position
  ) order by entry.position),'[]'::jsonb)
  into previous_items
  from public.home_shelf_entries entry
  join public.catalog_items item on item.id=entry.item_id
  left join public.profiles profile on profile.id=item.author_id
  where entry.shelf_key='featured';

  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id',item.id,'title',item.title,
    'creator_name',coalesce(profile.display_name,profile.username,item.creator),
    'position',chosen.ordinality
  ) order by chosen.ordinality),'[]'::jsonb)
  into next_items
  from unnest(normalized_item_ids) with ordinality chosen(item_id,ordinality)
  join public.catalog_items item on item.id=chosen.item_id
  left join public.profiles profile on profile.id=item.author_id;

  if previous_items=next_items then
    raise exception 'The Featured shelf is already in this order.' using errcode='55000';
  end if;

  delete from public.home_shelf_entries where shelf_key='featured';
  insert into public.home_shelf_entries(shelf_key,position,item_id,created_by)
  select 'featured',chosen.ordinality::smallint,chosen.item_id,auth.uid()
  from unnest(normalized_item_ids) with ordinality chosen(item_id,ordinality);

  insert into public.admin_home_shelf_events(
    shelf_key,previous_items,new_items,changed_by,reason
  ) values(
    'featured',previous_items,next_items,auth.uid(),normalized_reason
  );

  return public.get_admin_home_featured_state();
end;
$$;

revoke all on function public.list_home_featured_item_ids() from public,anon,authenticated;
revoke all on function public.get_admin_home_featured_state() from public,anon,authenticated;
revoke all on function public.set_admin_home_featured_items(uuid[],text) from public,anon,authenticated;
grant execute on function public.list_home_featured_item_ids() to anon,authenticated,service_role;
grant execute on function public.get_admin_home_featured_state() to authenticated,service_role;
grant execute on function public.set_admin_home_featured_items(uuid[],text) to authenticated,service_role;

comment on table public.home_shelf_entries is
  'Ordered editorial Home shelf entries. Public reads are restricted to eligible published Items by RPC.';
comment on table public.admin_home_shelf_events is
  'Immutable administrator audit of ordered Home shelf changes with before/after Item snapshots.';
comment on function public.list_home_featured_item_ids() is
  'Public ordered IDs for the Featured Home shelf, excluding unavailable and ineligible Items.';
comment on function public.set_admin_home_featured_items(uuid[],text) is
  'Atomically replaces the four-slot Featured shelf after admin, eligibility, uniqueness, and reason validation.';
