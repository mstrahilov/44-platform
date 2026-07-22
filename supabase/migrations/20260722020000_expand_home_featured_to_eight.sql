-- Expand the editorial New Releases shelf from four to eight ordered Items.

alter table public.home_shelf_entries
  drop constraint home_shelf_entries_position_check;

alter table public.home_shelf_entries
  add constraint home_shelf_entries_position_check check (position between 1 and 8);

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
  if cardinality(normalized_item_ids)>8 then
    raise exception 'Featured supports at most eight Items.' using errcode='22023';
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

revoke all on function public.set_admin_home_featured_items(uuid[],text) from public,anon,authenticated;
grant execute on function public.set_admin_home_featured_items(uuid[],text) to authenticated,service_role;

comment on function public.set_admin_home_featured_items(uuid[],text) is
  'Atomically replaces the eight-slot New Releases shelf after admin, eligibility, uniqueness, and reason validation.';
