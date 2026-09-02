-- Fix `browse_catalog_v1`: the "Beats" and "Games" Browse tabs always
-- returned zero results, regardless of catalog contents. `normalized_category`
-- arrives as the plural tab id ('beats', 'games') straight from the iOS/web
-- client, but the WHERE clause only special-cased 'samples' and 'books' —
-- 'beats' had no matching branch at all (a Beat is a `catalog_items` row
-- with experience_type='music', distinguished only by an item_type
-- assignment with slug='beat', exactly as `get_home_landing_v1` already
-- computes its own `is_beat` flag a few functions above this one), and
-- 'games' relied on the generic `item.experience_type=normalized_category`
-- branch, which never matches because the stored value is the singular
-- 'game', not the plural 'games' the client sends.
create or replace function public.browse_catalog_v1(
  category text default null,
  query text default null,
  sort text default 'release_date',
  type text default null,
  tag text default null,
  creator text default null,
  cursor jsonb default null,
  "limit" integer default 30
)
returns jsonb
language plpgsql
security definer
stable
set search_path=public
as $$
declare
  bounded_limit integer := least(greatest(coalesce("limit",30),1),60);
  page_offset integer := least(greatest(coalesce((cursor->>'offset')::integer,0),0),10000);
  normalized_category text := lower(nullif(btrim(category),''));
  normalized_query text := nullif(btrim(query),'');
  normalized_sort text := coalesce(nullif(btrim(sort),''),'release_date');
  normalized_type text := lower(nullif(btrim(type),''));
  normalized_tag text := lower(nullif(btrim(tag),''));
  normalized_creator text := nullif(btrim(creator),'');
  result jsonb;
begin
  if normalized_query is not null and char_length(normalized_query)>100 then
    raise exception 'Browse query must be at most 100 characters.' using errcode='22023';
  end if;
  if normalized_sort not in ('release_date','recently_added','title') then
    raise exception 'Unsupported Browse sort.' using errcode='22023';
  end if;

  with filtered as (
    select item.id,item.release_date,item.created_at,item.title
    from public.catalog_items item
    left join public.item_categories item_category on item_category.id=item.item_category_id
    where item.status='published'
      and (normalized_category is null or normalized_category='all' or item_category.slug=normalized_category
        or item.experience_type=normalized_category
        or (normalized_category='physical' and item.fulfillment_type='physical')
        or (normalized_category='samples' and item.experience_type='asset')
        or (normalized_category='books' and item.experience_type='book')
        or (normalized_category='games' and item.experience_type='game')
        or (normalized_category='beats' and exists(
          select 1 from public.item_type_assignments assignment
          join public.item_types item_type on item_type.id=assignment.item_type_id
          where assignment.item_id=item.id and item_type.slug='beat'
        )))
      and (normalized_query is null or item.title ilike '%'||normalized_query||'%'
        or item.creator ilike '%'||normalized_query||'%'
        or coalesce(item.short_description,'') ilike '%'||normalized_query||'%')
      and (normalized_type is null or normalized_type='all' or exists(
        select 1 from public.item_type_assignments assignment
        join public.item_types item_type on item_type.id=assignment.item_type_id and item_type.is_active
        where assignment.item_id=item.id
          and (item_type.slug=normalized_type or lower(item_type.label)=normalized_type)
      ))
      and (normalized_tag is null or normalized_tag='all' or exists(
        select 1 from public.item_tag_assignments assignment
        join public.item_tags item_tag on item_tag.id=assignment.item_tag_id and item_tag.is_active
        where assignment.item_id=item.id
          and (item_tag.slug=normalized_tag or lower(item_tag.label)=normalized_tag)
      ))
      and (normalized_creator is null or lower(normalized_creator)='all'
        or (lower(normalized_creator)='following' and exists(
          select 1 from public.profile_follows follow
          where follow.follower_id=auth.uid() and follow.following_id=item.author_id
        ))
        or item.author_id::text=normalized_creator
        or lower(item.creator)=lower(normalized_creator))
  ),
  ordered as (
    select * from filtered
    order by
      case when normalized_sort='title' then lower(title) end asc,
      case when normalized_sort='recently_added' then created_at end desc,
      case when normalized_sort='release_date' then release_date end desc nulls last,
      created_at desc,id desc
    offset page_offset
    limit bounded_limit+1
  ),
  page as (select * from ordered limit bounded_limit)
  select jsonb_build_object(
    'contract_version',1,
    'items',coalesce((select jsonb_agg(public.catalog_item_public_payload_v1(id)) from page),'[]'::jsonb),
    'next_cursor',case when (select count(*) from ordered)>bounded_limit
      then jsonb_build_object('offset',page_offset+bounded_limit)
      else null end
  ) into result;
  return result;
exception when invalid_text_representation then
  raise exception 'Invalid Browse cursor.' using errcode='22023';
end;
$$;
