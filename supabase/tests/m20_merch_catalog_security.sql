begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(id,email,raw_user_meta_data) values
  ('a2000000-0000-4000-8000-000000000001','m20-member@example.test','{"username":"m20_member"}'),
  ('a2000000-0000-4000-8000-000000000002','m20-creator@example.test','{"username":"m20_creator"}'),
  ('a2000000-0000-4000-8000-000000000003','m20-admin@example.test','{"username":"m20_admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='a2000000-0000-4000-8000-000000000002';
update public.profiles set role='admin' where id='a2000000-0000-4000-8000-000000000003';

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,
  status,author_id,experience_type,fulfillment_type,cover_url,long_description
)
select fixture.id,category.id,fixture.slug,fixture.title,'M20 Creator','Apparel',2500,false,false,'{}',
  fixture.status,'a2000000-0000-4000-8000-000000000002','merch','physical',
  'https://example.test/merch-cover.jpg','A complete product description.'
from public.item_categories category
cross join (values
  ('a2100000-0000-4000-8000-000000000001'::uuid,'m20-published-merch','M20 Published Merch','published'),
  ('a2100000-0000-4000-8000-000000000002'::uuid,'m20-draft-merch','M20 Draft Merch','draft')
) fixture(id,slug,title,status)
where category.slug='merch';

insert into public.item_assets(id,item_id,asset_type,title,file_url,storage_path,is_downloadable,sort_order) values
  ('a2200000-0000-4000-8000-000000000001','a2100000-0000-4000-8000-000000000001','gallery_image','Front','https://example.test/front.jpg',null,false,0),
  ('a2200000-0000-4000-8000-000000000002','a2100000-0000-4000-8000-000000000002','gallery_image','Draft','https://example.test/draft.jpg',null,false,0),
  ('a2200000-0000-4000-8000-000000000003','a2100000-0000-4000-8000-000000000001','merch','Private fulfillment file',null,'products/merch/private.zip',true,1);

select is((
  select count(*)::integer from public.item_tags tag
  join public.item_categories category on category.id=tag.category_id
  where category.slug='merch' and tag.is_active
),8,'Merch has the complete controlled tag vocabulary');
select is((
  select array_agg(tag.label order by tag.sort_order) from public.item_tags tag
  join public.item_categories category on category.id=tag.category_id
  where category.slug='merch' and tag.slug in ('t-shirt','sweatshirt','hoodie','shorts','sweatpants','headwear','bags')
),array['T-Shirt','Sweatshirt','Hoodie','Shorts','Sweatpants','Headwear','Bags'],'the requested Merch tags are active and ordered');
select ok(exists(
  select 1 from public.item_tags tag join public.item_categories category on category.id=tag.category_id
  where category.slug='merch' and tag.slug='jacket' and tag.is_active
),'Windbreaker has an accurate Jacket tag available');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.item_assets where item_id='a2100000-0000-4000-8000-000000000001'),1,'anonymous Store visitors can read a published product gallery image');
select is((select count(*)::integer from public.item_assets where item_id='a2100000-0000-4000-8000-000000000002'),0,'draft product gallery images remain private');
select is((select count(*)::integer from public.item_assets where id='a2200000-0000-4000-8000-000000000003'),0,'downloadable Merch assets never enter the public gallery');
select is((select file_url from public.item_assets where id='a2200000-0000-4000-8000-000000000001'),'https://example.test/front.jpg','the public gallery exposes only its intended image URL');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.item_assets where item_id='a2100000-0000-4000-8000-000000000001'),1,'members can read the same published gallery');
select is((select count(*)::integer from public.item_assets where item_id='a2100000-0000-4000-8000-000000000002'),0,'members cannot inspect a creator draft gallery');
select throws_ok($$insert into public.item_assets(item_id,asset_type,title,file_url,is_downloadable) values('a2100000-0000-4000-8000-000000000001','gallery_image','Injected','https://example.test/injected.jpg',false)$$,'42501',null,'members cannot add gallery images to another creator Item');

select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.item_assets where item_id='a2100000-0000-4000-8000-000000000002'),1,'the creator can inspect their own draft gallery');
select is((select count(*)::integer from public.item_assets where id='a2200000-0000-4000-8000-000000000003'),1,'the creator retains access to their protected fulfillment asset');
select throws_ok($$
  insert into public.catalog_items(author_id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,experience_type,fulfillment_type)
  select 'a2000000-0000-4000-8000-000000000002',id,'creator-merch-blocked','Blocked Creator Merch','M20 Creator','Apparel',2500,false,'draft','merch','physical'
  from public.item_categories where slug='merch'
$$,'42501','Merch publishing is currently limited to 44.','approved creators cannot bypass the app to publish Merch');

select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000003',true);
select lives_ok($$
  insert into public.catalog_items(author_id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,experience_type,fulfillment_type)
  select 'a2000000-0000-4000-8000-000000000003',id,'admin-merch-allowed','Admin Merch','44OS','Apparel',2500,false,'draft','merch','physical'
  from public.item_categories where slug='merch'
$$,'platform administrators retain the 44-owned Merch management boundary');

select * from finish();
rollback;
