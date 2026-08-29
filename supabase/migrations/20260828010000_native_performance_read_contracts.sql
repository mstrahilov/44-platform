-- Versioned, bounded read contracts for native Home, Browse, and Radio.

create or replace function public.catalog_item_public_payload_v1(target_item_id uuid)
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',item.id,
    'author_id',item.author_id,
    'slug',item.slug,
    'title',item.title,
    'creator',item.creator,
    'item_type',item.item_type,
    'short_description',item.short_description,
    'price_cents',item.price_cents,
    'is_free',item.is_free,
    'cover_url',item.cover_url,
    'hero_url',item.hero_url,
    'experience_type',item.experience_type,
    'fulfillment_type',item.fulfillment_type,
    'year',item.year,
    'release_date',item.release_date,
    'sort_order',item.sort_order,
    'created_at',item.created_at,
    'creators',case when profile.id is null then null else jsonb_build_object(
      'id',profile.id,
      'username',profile.username,
      'display_name',profile.display_name,
      'avatar_url',profile.avatar_url
    ) end,
    'discovery',jsonb_build_object(
      'browseType',(
      select jsonb_build_object(
        'id',item_type.id,
        'category_id',item_type.category_id,
        'label',item_type.label,
        'slug',item_type.slug,
        'sort_order',item_type.sort_order
      )
      from public.item_type_assignments assignment
      join public.item_types item_type on item_type.id=assignment.item_type_id and item_type.is_active
      where assignment.item_id=item.id
      order by item_type.sort_order,item_type.id
      limit 1
    ),
      'tags',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',tag.id,
        'category_id',tag.category_id,
        'item_type_id',tag.item_type_id,
        'label',tag.label,
        'slug',tag.slug,
        'sort_order',tag.sort_order
      ) order by tag.sort_order,tag.id)
      from public.item_tag_assignments assignment
      join public.item_tags tag on tag.id=assignment.item_tag_id and tag.is_active
      where assignment.item_id=item.id
    ),'[]'::jsonb),
      'capabilities',coalesce((
      select jsonb_agg(capability.capability_key order by capability.capability_key)
      from public.item_capabilities capability
      where capability.item_id=item.id and capability.is_enabled
      ),'[]'::jsonb)
    )
  )
  from public.catalog_items item
  left join public.profiles profile on profile.id=item.author_id and profile.is_published
  where item.id=target_item_id and item.status='published';
$$;

create or replace function public.get_home_landing_v1()
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  with published as (
    select item.*,
      exists(
        select 1 from public.item_type_assignments assignment
        join public.item_types item_type on item_type.id=assignment.item_type_id
        where assignment.item_id=item.id and item_type.slug='beat'
      ) as is_beat
    from public.catalog_items item
    where item.status='published'
  ),
  featured as (
    select entry.item_id as id,entry.position
    from public.home_shelf_entries entry
    join published item on item.id=entry.item_id
    where entry.shelf_key='featured' and not item.is_beat
    order by entry.position
    limit 8
  ),
  music_candidates as (
    select item.*,
      row_number() over(partition by coalesce(item.author_id::text,lower(item.creator)) order by item.release_date desc nulls last,item.created_at desc,item.id desc) as creator_rank
    from published item
    where item.experience_type='music' and not item.is_beat
  ),
  new_releases as (
    select item.id
    from music_candidates item
    where item.creator_rank=1 and not exists(select 1 from featured where featured.id=item.id)
    order by item.release_date desc nulls last,item.created_at desc,item.id desc
    limit 8
  ),
  browse_music as (
    select item.id
    from music_candidates item
    where not exists(select 1 from featured where featured.id=item.id)
      and not exists(select 1 from new_releases where new_releases.id=item.id)
    order by item.release_date desc nulls last,item.created_at desc,item.id desc
    limit 8
  ),
  followed as (
    select item.id,
      row_number() over(partition by item.author_id order by item.release_date desc nulls last,item.created_at desc,item.id desc) as creator_rank
    from published item
    join public.profile_follows follow on follow.following_id=item.author_id and follow.follower_id=auth.uid()
  ),
  followed_items as (
    select id from followed where creator_rank=1 limit 8
  ),
  category_ranked as (
    select item.id,
      case
        when item.is_beat then 'beats'
        when item.experience_type='asset' then 'samples'
        when item.experience_type='book' then 'books'
        when item.experience_type='game' then 'games'
        when item.fulfillment_type='physical' or item.experience_type='merch' then 'merch'
      end as shelf_key,
      row_number() over(
        partition by case
          when item.is_beat then 'beats'
          when item.experience_type='asset' then 'samples'
          when item.experience_type='book' then 'books'
          when item.experience_type='game' then 'games'
          when item.fulfillment_type='physical' or item.experience_type='merch' then 'merch'
        end
        order by item.release_date desc nulls last,item.created_at desc,item.id desc
      ) as shelf_rank
    from published item
    where item.is_beat or item.experience_type in ('asset','book','game','merch') or item.fulfillment_type='physical'
  ),
  category_items as (
    select id,shelf_key from category_ranked where shelf_key is not null and shelf_rank<=8
  ),
  selected_ids as (
    select id from featured
    union select id from new_releases
    union select id from browse_music
    union select id from followed_items
    union select id from category_items
  ),
  shelves as (
    select jsonb_build_object(
      'featured',coalesce((select jsonb_agg(id order by position) from featured),'[]'::jsonb),
      'new_releases',coalesce((select jsonb_agg(id) from new_releases),'[]'::jsonb),
      'following',coalesce((select jsonb_agg(id) from followed_items),'[]'::jsonb),
      'browse_music',coalesce((select jsonb_agg(id) from browse_music),'[]'::jsonb),
      'beats',coalesce((select jsonb_agg(id) from category_items where shelf_key='beats'),'[]'::jsonb),
      'samples',coalesce((select jsonb_agg(id) from category_items where shelf_key='samples'),'[]'::jsonb),
      'merch',coalesce((select jsonb_agg(id) from category_items where shelf_key='merch'),'[]'::jsonb),
      'books',coalesce((select jsonb_agg(id) from category_items where shelf_key='books'),'[]'::jsonb),
      'games',coalesce((select jsonb_agg(id) from category_items where shelf_key='games'),'[]'::jsonb)
    ) as value
  )
  select jsonb_build_object(
    'contract_version',1,
    'featured_item_id',(select id from featured order by position limit 1),
    'items',coalesce((select jsonb_agg(public.catalog_item_public_payload_v1(id)) from selected_ids),'[]'::jsonb),
    'shelves',(select value from shelves),
    'category_keys',coalesce((select jsonb_agg(distinct shelf_key) from category_items),'[]'::jsonb),
    'new_creators',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',profile.id,
        'slug',profile.slug,
        'username',profile.username,
        'display_name',profile.display_name,
        'avatar_url',profile.avatar_url,
        'bio',profile.bio,
        'role',profile.role,
        'creator_type',profile.creator_type
      ) order by profile.created_at desc,profile.id desc)
      from (select * from public.profiles where role in ('creator','admin') and is_published and avatar_url is not null order by created_at desc,id desc limit 12) profile
    ),'[]'::jsonb),
    'followed_profile_ids',coalesce((
      select jsonb_agg(follow.following_id order by follow.created_at desc)
      from public.profile_follows follow where follow.follower_id=auth.uid()
    ),'[]'::jsonb),
    'cursors',jsonb_build_object('browse',jsonb_build_object('offset',30))
  );
$$;

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
        or (normalized_category='books' and item.experience_type='book'))
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

create or replace function public.radio_track_public_payload_v1(target_entry_id uuid)
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',track.id,
    'playlist_entry_id',entry.id,
    'artist_key',coalesce(item.author_id::text,profile.username,item.creator),
    'title',track.title,
    'artist_name',coalesce(profile.display_name,profile.username,nullif(item.creator,''),'44 Creator'),
    'artwork_url',coalesce(item.cover_url,item.hero_url),
    'audio_url',track.audio_url,
    'duration',track.duration_seconds,
    'item_id',item.id,
    'release_title',item.title,
    'track_number',track.number,
    'sort_order',entry.sort_order,
    'added_at',entry.added_at
  )
  from public.radio_playlist_entries entry
  join public.tracks track on track.id=entry.track_id and track.audio_url is not null and track.duration_seconds>0
  join public.catalog_items item on item.id=track.item_id and item.status='published' and item.experience_type='music' and item.streaming_enabled
  left join public.profiles profile on profile.id=item.author_id and profile.is_published
  where entry.id=target_entry_id and entry.is_active;
$$;

create or replace function public.list_radio_rotation_v1(version text default null)
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  with playable_base as (
    select entry.id,entry.sort_order,entry.added_at,entry.updated_at,track.id as track_id,track.duration_seconds
    from public.radio_playlist_entries entry
    join public.tracks track on track.id=entry.track_id and track.audio_url is not null and track.duration_seconds>0
    join public.catalog_items item on item.id=track.item_id and item.status='published' and item.experience_type='music' and item.streaming_enabled
    where entry.is_active
    order by entry.sort_order,entry.added_at,entry.id
    limit 500
  ),
  version_value as (
    select md5(coalesce(string_agg(id::text||':'||updated_at::text||':'||track_id::text||':'||duration_seconds::text,'|' order by sort_order,added_at,id),'empty')) as rotation_version
    from playable_base
  ),
  playable as (
    select playable_base.*,version_value.rotation_version
    from playable_base cross join version_value
  )
  select jsonb_build_object(
    'contract_version',1,
    'version',coalesce((select rotation_version from playable limit 1),md5('empty')),
    'unchanged',version is not null and version=coalesce((select rotation_version from playable limit 1),md5('empty')),
    'tracks',case when version is not null and version=coalesce((select rotation_version from playable limit 1),md5('empty'))
      then '[]'::jsonb
      else coalesce((select jsonb_agg(public.radio_track_public_payload_v1(id) order by sort_order,added_at,id) from playable),'[]'::jsonb) end
  );
$$;

create or replace function public.get_radio_station_snapshot_v1()
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  with playable_base as (
    select entry.id,entry.sort_order,entry.added_at,entry.updated_at,track.id as track_id,track.duration_seconds
    from public.radio_playlist_entries entry
    join public.tracks track on track.id=entry.track_id and track.audio_url is not null and track.duration_seconds>0
    join public.catalog_items item on item.id=track.item_id and item.status='published' and item.experience_type='music' and item.streaming_enabled
    where entry.is_active
    order by entry.sort_order,entry.added_at,entry.id
    limit 500
  ),
  version_value as (
    select md5(coalesce(string_agg(id::text||':'||updated_at::text||':'||track_id::text||':'||duration_seconds::text,'|' order by sort_order,added_at,id),'empty')) as rotation_version
    from playable_base
  ),
  playable as (
    select playable_base.id,playable_base.sort_order,playable_base.added_at,playable_base.duration_seconds,
      row_number() over(order by playable_base.sort_order,playable_base.added_at,playable_base.id) as position,
      sum(playable_base.duration_seconds) over(order by playable_base.sort_order,playable_base.added_at,playable_base.id rows between unbounded preceding and 1 preceding) as starts_at,
      sum(playable_base.duration_seconds) over() as total_duration,
      count(*) over() as track_count,
      version_value.rotation_version
    from playable_base
    cross join version_value
  ),
  clock as (
    select mod(greatest(extract(epoch from (now()-'2026-01-01 00:00:00+00'::timestamptz)),0)::numeric,total_duration::numeric) as elapsed
    from playable where total_duration>0 limit 1
  ),
  current_entry as (
    select playable.*,clock.elapsed
    from playable cross join clock
    where clock.elapsed>=coalesce(playable.starts_at,0)
      and clock.elapsed<coalesce(playable.starts_at,0)+playable.duration_seconds
    limit 1
  ),
  upcoming as (
    select playable.*
    from playable cross join current_entry
    where playable.id<>current_entry.id
    order by mod((playable.position-current_entry.position+current_entry.track_count)::numeric,current_entry.track_count::numeric)
    limit 12
  )
  select jsonb_build_object(
    'contract_version',1,
    'current_track',(select public.radio_track_public_payload_v1(id) from current_entry),
    'playback_offset',coalesce((select elapsed-coalesce(starts_at,0) from current_entry),0),
    'rotation_version',coalesce((select rotation_version from current_entry),md5('empty')),
    'upcoming_queue',coalesce((select jsonb_agg(public.radio_track_public_payload_v1(id) order by position) from upcoming),'[]'::jsonb)
  );
$$;

revoke all on function public.catalog_item_public_payload_v1(uuid) from public,anon,authenticated;
revoke all on function public.radio_track_public_payload_v1(uuid) from public,anon,authenticated;
revoke all on function public.get_home_landing_v1() from public,anon,authenticated;
revoke all on function public.browse_catalog_v1(text,text,text,text,text,text,jsonb,integer) from public,anon,authenticated;
revoke all on function public.get_radio_station_snapshot_v1() from public,anon,authenticated;
revoke all on function public.list_radio_rotation_v1(text) from public,anon,authenticated;

grant execute on function public.get_home_landing_v1() to anon,authenticated,service_role;
grant execute on function public.browse_catalog_v1(text,text,text,text,text,text,jsonb,integer) to anon,authenticated,service_role;
grant execute on function public.get_radio_station_snapshot_v1() to anon,authenticated,service_role;
grant execute on function public.list_radio_rotation_v1(text) to anon,authenticated,service_role;

comment on function public.get_home_landing_v1() is 'v1 bounded published-only native Home landing payload; private identity is derived from auth.uid().';
comment on function public.browse_catalog_v1(text,text,text,text,text,text,jsonb,integer) is 'v1 bounded published-only server-filtered native catalog page.';
comment on function public.get_radio_station_snapshot_v1() is 'v1 bounded published-only current Radio snapshot for immediate native playback.';
comment on function public.list_radio_rotation_v1(text) is 'v1 bounded published-only Radio rotation with version revalidation.';
