begin;

-- Follow-up to the reviewed M20 cleanup: keep exactly eight launch Merch Items
-- and make the existing catalog_items.sort_order field the platform-wide
-- presentation authority for Merch. Lower numbers appear first.

do $$
declare
  unexpected record;
begin
  select item.id, item.title into unexpected
  from public.catalog_items item
  where item.id in (
    'c6738f40-9ddb-4035-82f3-243f979ecd8e',
    '12ccdbaa-307b-49cd-be82-189ac994a581',
    'c2d596fa-ea19-4674-896f-9bf61d411ca9'
  )
  and (item.id, lower(item.title)) not in (
    ('c6738f40-9ddb-4035-82f3-243f979ecd8e'::uuid, 'hoodie'),
    ('12ccdbaa-307b-49cd-be82-189ac994a581'::uuid, 'shorts'),
    ('c2d596fa-ea19-4674-896f-9bf61d411ca9'::uuid, 'sweatpants')
  )
  limit 1;

  if found then
    raise exception 'M20 launch Merch identity mismatch for % (%)', unexpected.id, unexpected.title;
  end if;
end;
$$;

delete from public.catalog_items
where id in (
  'c6738f40-9ddb-4035-82f3-243f979ecd8e',
  '12ccdbaa-307b-49cd-be82-189ac994a581',
  'c2d596fa-ea19-4674-896f-9bf61d411ca9'
);

update public.catalog_items item
set sort_order = launch.sort_order,
    updated_at = now()
from (values
  ('befd4ee9-6a11-48dc-893d-3d8fc65cb6cb'::uuid, 10::bigint), -- T-Shirt / Apparel
  ('5d9ffe4d-cdab-418e-afd5-6773d87d6e39'::uuid, 20::bigint), -- Sweatshirt / Apparel
  ('73c06043-e1cd-4229-bd36-cef0612d9135'::uuid, 30::bigint), -- 44 Hoodie / Apparel
  ('62610e6b-a5f2-48bc-b01e-6c2055f8505a'::uuid, 40::bigint), -- Windbreaker / Apparel
  ('417f3804-9c9f-49e6-829d-8694fb0921e9'::uuid, 50::bigint), -- Beanie / Accessories
  ('955bb70e-1369-49b4-82f0-b7294bd03d2c'::uuid, 60::bigint), -- Hat / Accessories
  ('b123ebf5-cea7-4c71-aef9-37ef1576fb44'::uuid, 70::bigint), -- Bag / Accessories
  ('40ff7beb-6314-4e04-9681-c16d98bd9e43'::uuid, 80::bigint)  -- Tote / Accessories
) launch(item_id, sort_order)
where item.id = launch.item_id
  and item.experience_type = 'merch';

commit;
