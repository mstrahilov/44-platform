-- The Discover "New Creators" shelf should show effectively everyone
-- eligible, not just the newest 12 — raise the cap well past today's
-- creator count while keeping the payload bounded.
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
      from (select * from public.profiles where role in ('creator','admin') and is_published and avatar_url is not null order by created_at desc,id desc limit 100) profile
    ),'[]'::jsonb),
    'followed_profile_ids',coalesce((
      select jsonb_agg(follow.following_id order by follow.created_at desc)
      from public.profile_follows follow where follow.follower_id=auth.uid()
    ),'[]'::jsonb),
    'cursors',jsonb_build_object('browse',jsonb_build_object('offset',30))
  );
$$;
