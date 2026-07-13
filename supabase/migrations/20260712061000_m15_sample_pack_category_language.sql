-- M15 final naming cutover: Sample Packs are the only public product category
-- represented by the stable internal `asset` experience. Generic item_assets,
-- storage paths, permanent Item IDs, and ownership history remain untouched.

update public.item_categories
set name = 'Sample Packs', slug = 'sample-packs'
where slug = 'assets';

insert into public.item_types (category_id, label, slug, sort_order, is_active)
select category.id, 'Sample Packs', 'sample-packs', 10, true
from public.item_categories category
where category.slug = 'sample-packs'
on conflict (category_id, slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;

update public.item_type_assignments assignment
set item_type_id = sample_type.id
from public.item_types current_type
join public.item_categories category on category.id = current_type.category_id and category.slug = 'sample-packs'
join public.item_types sample_type on sample_type.category_id = category.id and sample_type.slug = 'sample-packs'
where assignment.item_type_id = current_type.id
  and assignment.item_type_id <> sample_type.id;

update public.item_tags tag
set item_type_id = sample_type.id
from public.item_categories category
join public.item_types sample_type on sample_type.category_id = category.id and sample_type.slug = 'sample-packs'
where tag.category_id = category.id
  and tag.item_type_id is not null
  and tag.item_type_id <> sample_type.id;

update public.item_types item_type
set is_active = (item_type.slug = 'sample-packs'),
    updated_at = now()
from public.item_categories category
where item_type.category_id = category.id
  and category.slug = 'sample-packs';

update public.catalog_items
set item_type = 'Sample Packs', updated_at = now()
where experience_type = 'asset';

comment on table public.item_categories is '44OS system-defined Categories. Sample Packs is the public product category backed by the stable internal asset experience; generic item_assets remain cross-category infrastructure.';

create or replace function public.catalog_item_health(target_item_id uuid)
returns table(code text, message text)
language sql
stable
security definer
set search_path = public
as $$
  with item as (select * from public.catalog_items where id = target_item_id)
  select 'missing_title', 'Add an Item title.' from item where nullif(btrim(title), '') is null
  union all select 'missing_creator', 'Add a creator name.' from item where nullif(btrim(creator), '') is null
  union all select 'missing_category', 'Choose a Category.' from item where item_category_id is null
  union all select 'missing_type', 'Choose an approved Item Type.' from item where not exists (
    select 1 from public.item_type_assignments a join public.item_types t on t.id = a.item_type_id
    where a.item_id = target_item_id and t.is_active and t.category_id = item.item_category_id
  )
  union all select 'missing_artwork', 'Upload catalog artwork.' from item where nullif(btrim(cover_url), '') is null
  union all select 'invalid_year', 'Use a release year between 1000 and next year.' from item
    where year is not null and (year < 1000 or year > extract(year from now())::integer + 1)
  union all select 'missing_music_tracks', 'Music needs at least one complete audio track.' from item
    where experience_type = 'music' and not exists (
      select 1 from public.tracks where item_id = target_item_id
        and nullif(btrim(title), '') is not null and nullif(btrim(audio_url), '') is not null
    )
  union all select 'incomplete_music_track', 'Every music track needs a title and audio file.' from item
    where experience_type = 'music' and exists (
      select 1 from public.tracks where item_id = target_item_id
        and (nullif(btrim(title), '') is null or nullif(btrim(audio_url), '') is null)
    )
  union all select 'missing_book_file', 'Books need an uploaded book file.' from item
    where experience_type = 'book' and not exists (
      select 1 from public.item_assets where item_id = target_item_id and asset_type = 'book'
        and coalesce(nullif(btrim(storage_path), ''), nullif(btrim(file_url), '')) is not null
    )
  union all select 'missing_asset_file', 'Sample Packs need an uploaded downloadable ZIP.' from item
    where experience_type = 'asset' and not exists (
      select 1 from public.item_assets where item_id = target_item_id
        and asset_type in ('sample_pack', 'music', 'template', 'other') and is_downloadable
        and coalesce(nullif(btrim(storage_path), ''), nullif(btrim(file_url), '')) is not null
    );
$$;

revoke all on function public.catalog_item_health(uuid) from public;
grant execute on function public.catalog_item_health(uuid) to authenticated, service_role;
