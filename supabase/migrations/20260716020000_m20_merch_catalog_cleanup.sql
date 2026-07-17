begin;

-- M20: remove the reviewed 44OS test-content footprint and make Merch taxonomy
-- and public galleries first-class Store data. The UUID allow-list prevents a
-- title collision from ever deleting a newly-created Item with the same name.

do $$
declare
  unexpected record;
begin
  select item.id, item.title into unexpected
  from public.catalog_items item
  where item.id in (
    '00c49339-4be7-4352-84ce-8ad0cb209dba',
    '3bbc3370-7fad-4356-a27d-1600c2ecbb6d',
    '4239cd36-9209-441d-977f-62675d87092f',
    '5f7d5505-5bf1-4f39-92f7-62bbe004a4da',
    '82d0a690-380e-4e17-bbfe-6b3a54744f0a',
    'b0a87fe3-061c-4993-8261-3e7b9a985fb5',
    'd762d96f-5cf4-4c7b-a665-b2c7b6697426',
    'd8eb05b8-15ca-48cd-a286-4aedb84c4fc2',
    '65d3f562-0699-4ac6-9ef3-8d87c5557afc'
  )
  and (item.id, lower(item.title)) not in (
    ('00c49339-4be7-4352-84ce-8ad0cb209dba'::uuid, 'patch'),
    ('3bbc3370-7fad-4356-a27d-1600c2ecbb6d'::uuid, 'guardian t-shirt'),
    ('4239cd36-9209-441d-977f-62675d87092f'::uuid, 'sticker'),
    ('5f7d5505-5bf1-4f39-92f7-62bbe004a4da'::uuid, 'byzantine sweatshirt'),
    ('82d0a690-380e-4e17-bbfe-6b3a54744f0a'::uuid, 'iphone case iii'),
    ('b0a87fe3-061c-4993-8261-3e7b9a985fb5'::uuid, 'byzantine hoodie'),
    ('d762d96f-5cf4-4c7b-a665-b2c7b6697426'::uuid, 'iphone case ii'),
    ('d8eb05b8-15ca-48cd-a286-4aedb84c4fc2'::uuid, 'iphone case i'),
    ('65d3f562-0699-4ac6-9ef3-8d87c5557afc'::uuid, 'prayers for a rotten seed')
  )
  limit 1;

  if found then
    raise exception 'M20 test-Item identity mismatch for % (%)', unexpected.id, unexpected.title;
  end if;
end;
$$;

-- The legacy reply table is still the compatibility write source. Removing
-- these ten 44OS replies also removes the two audited test-profile children by
-- FK cascade and mirrors the deletion to the canonical content spine.
delete from public.post_replies
where author_id = '26a43db5-2c83-4980-a7e7-21764f899505'
   or id in (
     'c0a85afd-044c-48cd-8b2a-4303fde3149a',
     '39dea583-d85b-409c-b004-553464580e6d'
   );

delete from public.content_replies
where author_id = '26a43db5-2c83-4980-a7e7-21764f899505'
   or id in (
     'c0a85afd-044c-48cd-8b2a-4303fde3149a',
     '39dea583-d85b-409c-b004-553464580e6d'
   );

delete from public.post_likes where profile_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.reply_likes where profile_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.content_entry_reactions where profile_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.content_reply_reactions where profile_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.community_question_votes where profile_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.community_question_answers where author_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.community_collaboration_responses where author_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.community_questions where author_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.community_collaborations where author_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.posts where author_id = '26a43db5-2c83-4980-a7e7-21764f899505';
delete from public.content_entries
where author_id = '26a43db5-2c83-4980-a7e7-21764f899505'
  and content_type in ('discussion', 'question', 'collaboration');

-- Seed controlled Merch tags. Jacket is included so every retained product,
-- including Windbreaker, receives an accurate specific tag.
insert into public.item_categories (id, slug, name, sort_order)
values ('c55c14a8-20b7-4d79-b80e-2330bb0267b7', 'merch', 'Merch', 40)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into public.item_tags (id, category_id, label, slug, sort_order, is_active)
select tag.id, category.id, tag.label, tag.slug, tag.sort_order, true
from public.item_categories category
cross join (values
  ('f1200000-0000-4000-8000-000000000001'::uuid, 'T-Shirt', 't-shirt', 10),
  ('f1200000-0000-4000-8000-000000000002'::uuid, 'Sweatshirt', 'sweatshirt', 20),
  ('f1200000-0000-4000-8000-000000000003'::uuid, 'Hoodie', 'hoodie', 30),
  ('f1200000-0000-4000-8000-000000000004'::uuid, 'Shorts', 'shorts', 40),
  ('f1200000-0000-4000-8000-000000000005'::uuid, 'Sweatpants', 'sweatpants', 50),
  ('f1200000-0000-4000-8000-000000000006'::uuid, 'Headwear', 'headwear', 60),
  ('f1200000-0000-4000-8000-000000000007'::uuid, 'Bags', 'bags', 70),
  ('f1200000-0000-4000-8000-000000000008'::uuid, 'Jacket', 'jacket', 80)
) tag(id, label, slug, sort_order)
where category.slug = 'merch'
on conflict (category_id, slug) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

insert into public.item_tag_assignments (item_id, item_tag_id)
select assignment.item_id, tag.id
from (values
  ('befd4ee9-6a11-48dc-893d-3d8fc65cb6cb'::uuid, 't-shirt'),
  ('5d9ffe4d-cdab-418e-afd5-6773d87d6e39'::uuid, 'sweatshirt'),
  ('c6738f40-9ddb-4035-82f3-243f979ecd8e'::uuid, 'hoodie'),
  ('73c06043-e1cd-4229-bd36-cef0612d9135'::uuid, 'hoodie'),
  ('12ccdbaa-307b-49cd-be82-189ac994a581'::uuid, 'shorts'),
  ('c2d596fa-ea19-4674-896f-9bf61d411ca9'::uuid, 'sweatpants'),
  ('417f3804-9c9f-49e6-829d-8694fb0921e9'::uuid, 'headwear'),
  ('955bb70e-1369-49b4-82f0-b7294bd03d2c'::uuid, 'headwear'),
  ('b123ebf5-cea7-4c71-aef9-37ef1576fb44'::uuid, 'bags'),
  ('40ff7beb-6314-4e04-9681-c16d98bd9e43'::uuid, 'bags'),
  ('62610e6b-a5f2-48bc-b01e-6c2055f8505a'::uuid, 'jacket')
) assignment(item_id, tag_slug)
join public.catalog_items item on item.id = assignment.item_id and item.experience_type = 'merch'
join public.item_categories category on category.id = item.item_category_id and category.slug = 'merch'
join public.item_tags tag on tag.category_id = category.id and tag.slug = assignment.tag_slug
on conflict do nothing;

-- Public product galleries contain only creator-designated, non-downloadable
-- images on published Items. Protected and downloadable assets remain behind
-- the existing entitlement policy.
drop policy if exists item_assets_published_gallery_read on public.item_assets;
create policy item_assets_published_gallery_read
on public.item_assets for select to anon, authenticated
using (
  asset_type = 'gallery_image'
  and is_downloadable = false
  and file_url is not null
  and exists (
    select 1 from public.catalog_items item
    where item.id = item_assets.item_id and item.status = 'published'
  )
);

-- These exact test Items have no orders or third-party grants. The archived
-- book's creator-only test entitlement/history is intentionally removed too.
create temporary table m20_test_items (id uuid primary key) on commit drop;
insert into m20_test_items(id) values
  ('00c49339-4be7-4352-84ce-8ad0cb209dba'),
  ('3bbc3370-7fad-4356-a27d-1600c2ecbb6d'),
  ('4239cd36-9209-441d-977f-62675d87092f'),
  ('5f7d5505-5bf1-4f39-92f7-62bbe004a4da'),
  ('82d0a690-380e-4e17-bbfe-6b3a54744f0a'),
  ('b0a87fe3-061c-4993-8261-3e7b9a985fb5'),
  ('d762d96f-5cf4-4c7b-a665-b2c7b6697426'),
  ('d8eb05b8-15ca-48cd-a286-4aedb84c4fc2'),
  ('65d3f562-0699-4ac6-9ef3-8d87c5557afc');

delete from public.entitlement_events where item_id in (select id from m20_test_items);
delete from public.entitlements where item_id in (select id from m20_test_items);
delete from public.reading_bookmarks where item_id in (select id from m20_test_items);
delete from public.reading_progress where item_id in (select id from m20_test_items);
delete from public.commerce_order_items where item_id in (select id from m20_test_items);
delete from public.merch_order_items where item_id in (select id from m20_test_items);
delete from public.beat_license_grants where item_id in (select id from m20_test_items);

-- Remove native children while their parent still exists. The M15 delete
-- trigger writes the disabled reader capability, then the explicit capability
-- deletion clears that compatibility row before the parent Item is removed.
delete from public.book_contents where item_id in (select id from m20_test_items);
delete from public.item_capabilities where item_id in (select id from m20_test_items);

alter table public.item_rights_attestations disable trigger item_rights_attestations_immutable;
delete from public.item_rights_attestations where item_id in (select id from m20_test_items);
alter table public.item_rights_attestations enable trigger item_rights_attestations_immutable;

delete from public.catalog_items where id in (select id from m20_test_items);

commit;
