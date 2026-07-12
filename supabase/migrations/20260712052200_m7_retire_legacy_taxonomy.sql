-- Correct the two ambiguous music backfills using the canonical Single Type.
update public.item_type_assignments assignment
set item_type_id = type.id
from public.item_types type
join public.item_categories category on category.id = type.category_id
where assignment.item_id in (
  '33ef99ca-5b11-473f-b53f-f982c82c7ac6'::uuid,
  'b8a1b08a-47f0-48ff-bd28-38df7bdf311c'::uuid
)
and category.slug = 'music'
and type.slug = 'single';

drop table public.item_taxonomy_terms;
drop table public.catalog_taxonomy_terms;

comment on column public.catalog_items.item_type is
  'Compatibility display value synchronized from the canonical item_type_assignments relationship; do not use for taxonomy filtering.';
comment on column public.catalog_items.tags is
  'Deprecated compatibility metadata; canonical public Tags use item_tag_assignments and item_tags.';
