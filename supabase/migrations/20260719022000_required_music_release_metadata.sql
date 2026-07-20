-- Music publishing requires the metadata needed for reliable release-date
-- discovery. Item Type and complete Tracks already participate in this health
-- boundary; this revision adds the missing Release Date requirement.

insert into public.item_types(category_id,label,slug,sort_order,is_active)
select category.id,seed.label,seed.slug,seed.sort_order,true
from public.item_categories category
cross join(values
  ('Album','album',10),
  ('EP','ep',20),
  ('Single','single',30),
  ('Mixtape','mixtape',40)
) seed(label,slug,sort_order)
where category.slug='music'
on conflict(category_id,slug) do update set
  label=excluded.label,
  sort_order=excluded.sort_order,
  is_active=true,
  updated_at=now();

create or replace function public.catalog_item_health(target_item_id uuid)
returns table(code text,message text) language sql stable security definer set search_path=public as $$
  with item as (select * from public.catalog_items where id=target_item_id)
  select 'missing_title','Add an Item title.' from item where nullif(btrim(title),'') is null
  union all select 'missing_creator','Add a creator name.' from item where nullif(btrim(creator),'') is null
  union all select 'missing_category','Choose a Category.' from item where item_category_id is null
  union all select 'missing_type','Choose an approved Item Type.' from item where not exists(
    select 1 from public.item_type_assignments a join public.item_types t on t.id=a.item_type_id where a.item_id=target_item_id and t.is_active and t.category_id=item.item_category_id
  )
  union all select 'missing_artwork','Upload catalog artwork.' from item where nullif(btrim(cover_url),'') is null
  union all select 'missing_release_date','Choose a Release Date.' from item where experience_type='music' and release_date is null
  union all select 'invalid_year','Use a release year between 1000 and next year.' from item where year is not null and(year<1000 or year>extract(year from now())::integer+1)
  union all select 'missing_music_tracks','Music needs at least one complete audio track.' from item where experience_type='music' and not exists(
    select 1 from public.tracks where item_id=target_item_id and nullif(btrim(title),'') is not null and nullif(btrim(audio_url),'') is not null
  )
  union all select 'incomplete_music_track','Every music track needs a title and audio file.' from item where experience_type='music' and exists(
    select 1 from public.tracks where item_id=target_item_id and(nullif(btrim(title),'') is null or nullif(btrim(audio_url),'') is null)
  )
  union all select 'missing_book_file','Books need an uploaded book file.' from item where experience_type='book' and not exists(
    select 1 from public.item_assets where item_id=target_item_id and asset_type='book' and coalesce(nullif(btrim(storage_path),''),nullif(btrim(file_url),'')) is not null
  )
  union all select 'missing_asset_file','Sample Packs need an uploaded downloadable ZIP.' from item where experience_type='asset' and not exists(
    select 1 from public.item_assets where item_id=target_item_id and asset_type in ('sample_pack','music','template','other') and is_downloadable and coalesce(nullif(btrim(storage_path),''),nullif(btrim(file_url),'')) is not null
  )
  union all select health.code,health.message from public.beat_configuration_health(target_item_id) health where public.is_beat_item(target_item_id);
$$;

revoke all on function public.catalog_item_health(uuid) from public;
grant execute on function public.catalog_item_health(uuid) to authenticated,service_role;

comment on function public.catalog_item_health(uuid) is
  'Server-authoritative publication health for permanent Items; Music requires an approved Item Type, Release Date, and complete Tracks.';
