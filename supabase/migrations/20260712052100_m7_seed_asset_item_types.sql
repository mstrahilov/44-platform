insert into public.item_types (category_id, label, slug, sort_order, is_active)
select category.id, seed.label, seed.slug, seed.sort_order, true
from public.item_categories category
cross join (values
  ('Sample Packs', 'sample-packs', 10),
  ('Remix Packs', 'remix-packs', 20),
  ('Game Assets', 'game-assets', 30)
) as seed(label, slug, sort_order)
where category.slug = 'assets'
on conflict (category_id, slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order;
