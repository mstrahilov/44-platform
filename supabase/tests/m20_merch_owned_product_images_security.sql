begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_table('public','merch_product_images','44OS-owned Merch image assignments exist');
select has_column('public','merch_product_images','role','Merch images distinguish main, color, and bonus use');
select has_column('public','merch_product_images','color_value','Merch images can target one canonical color');

insert into auth.users(id,email,raw_user_meta_data) values
  ('a4200000-0000-4000-8000-000000000001','merch-images-admin@example.test','{"username":"merch_images_admin"}'),
  ('a4200000-0000-4000-8000-000000000002','merch-images-member@example.test','{"username":"merch_images_member"}');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='a4200000-0000-4000-8000-000000000001';
update public.commerce_runtime_controls
set platform_seller_id='a4200000-0000-4000-8000-000000000001'
where singleton;

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,author_id,experience_type,fulfillment_type
)
select fixture.id,category.id,fixture.slug,fixture.title,'44OS','Apparel',5000,false,fixture.status,
  'a4200000-0000-4000-8000-000000000001','merch','physical'
from public.item_categories category
cross join (values
  ('a4210000-0000-4000-8000-000000000001'::uuid,'merch-images-published','Merch Images Published','published'),
  ('a4210000-0000-4000-8000-000000000002'::uuid,'merch-images-draft','Merch Images Draft','draft')
) fixture(id,slug,title,status)
where category.slug='merch';

insert into public.merch_variants(id,item_id,code,display_name,option_values,status,sort_order) values
  ('a4220000-0000-4000-8000-000000000001','a4210000-0000-4000-8000-000000000001','black-s','Black / S','{"color":"Black","size":"S"}','active',1),
  ('a4220000-0000-4000-8000-000000000002','a4210000-0000-4000-8000-000000000001','black-m','Black / M','{"color":"Black","size":"M"}','active',2),
  ('a4220000-0000-4000-8000-000000000003','a4210000-0000-4000-8000-000000000001','navy-m','Navy / M','{"color":"Navy","size":"M"}','active',3),
  ('a4220000-0000-4000-8000-000000000004','a4210000-0000-4000-8000-000000000002','draft-black','Black','{"color":"Black"}','draft',1);

select lives_ok($$
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','main',null,'Main',
    'https://example.test/main.jpg','merch/a4210000-0000-4000-8000-000000000001/main.jpg',
    'a4200000-0000-4000-8000-000000000001'
  )
$$,'service-only assignment saves a main product image');
select is((select cover_url from public.catalog_items where id='a4210000-0000-4000-8000-000000000001'),
  'https://example.test/main.jpg','the main assignment becomes the canonical Store card image');

select lives_ok($$
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','main',null,'Replacement',
    'https://example.test/main-two.jpg','merch/a4210000-0000-4000-8000-000000000001/main-two.jpg',
    'a4200000-0000-4000-8000-000000000001'
  )
$$,'replacing a main image is atomic');
select is((select count(*)::integer from public.merch_product_images where item_id='a4210000-0000-4000-8000-000000000001' and role='main'),
  1,'each product retains exactly one main image');

select lives_ok($$
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','color','black','Black',
    'https://example.test/black.jpg','merch/a4210000-0000-4000-8000-000000000001/black.jpg',
    'a4200000-0000-4000-8000-000000000001'
  )
$$,'a color assignment accepts case-insensitive imported color identity');
select is((select count(*)::integer from public.merch_variants where item_id='a4210000-0000-4000-8000-000000000001' and option_values->>'color'='Black' and image_url='https://example.test/black.jpg'),
  2,'one color image propagates to every size in that color');
select is((select image_url from public.merch_variants where id='a4220000-0000-4000-8000-000000000003'),
  null::text,'a color image never leaks to a different color');
select throws_ok($$
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','color','Orange','Orange',
    'https://example.test/orange.jpg','merch/a4210000-0000-4000-8000-000000000001/orange.jpg',
    'a4200000-0000-4000-8000-000000000001'
  )
$$,'23514','The image color must match an imported canonical Merch color.','unknown colors fail closed');

select lives_ok($$
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','bonus',null,'Detail',
    'https://example.test/detail.jpg','merch/a4210000-0000-4000-8000-000000000001/detail.jpg',
    'a4200000-0000-4000-8000-000000000001'
  );
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','bonus',null,'Label',
    'https://example.test/label.jpg','merch/a4210000-0000-4000-8000-000000000001/label.jpg',
    'a4200000-0000-4000-8000-000000000001'
  )
$$,'products can retain multiple ordered bonus images');
select is((select count(*)::integer from public.merch_product_images where item_id='a4210000-0000-4000-8000-000000000001' and role='bonus'),
  2,'bonus images do not replace each other');

select public.set_merch_product_image(
  'a4210000-0000-4000-8000-000000000002','main',null,'Draft Main',
  'https://example.test/draft.jpg','merch/a4210000-0000-4000-8000-000000000002/draft.jpg',
  'a4200000-0000-4000-8000-000000000001'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select is((select count(*)::integer from public.merch_product_images where item_id='a4210000-0000-4000-8000-000000000001'),
  4,'anonymous customers can read the complete published 44OS gallery');
select is((select count(*)::integer from public.merch_product_images where item_id='a4210000-0000-4000-8000-000000000002'),
  0,'draft product images remain private');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a4200000-0000-4000-8000-000000000002',true);
select throws_ok($$
  insert into public.merch_product_images(item_id,role,title,file_url,storage_path,created_by)
  values(
    'a4210000-0000-4000-8000-000000000001','bonus','Injected',
    'https://example.test/injected.jpg','merch/a4210000-0000-4000-8000-000000000001/injected.jpg',
    'a4200000-0000-4000-8000-000000000002'
  )
$$,'42501',null,'members cannot inject public product imagery');
select throws_ok($$
  select public.set_merch_product_image(
    'a4210000-0000-4000-8000-000000000001','bonus',null,'Injected',
    'https://example.test/injected.jpg','merch/a4210000-0000-4000-8000-000000000001/injected.jpg',
    'a4200000-0000-4000-8000-000000000002'
  )
$$,'42501',null,'browser roles cannot execute the image assignment function');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($$
  select public.delete_merch_product_image(
    (select id from public.merch_product_images
     where item_id='a4210000-0000-4000-8000-000000000001' and role='color')
  )
$$,'service-only deletion removes one exact color assignment');
select is((select count(*)::integer from public.merch_variants where item_id='a4210000-0000-4000-8000-000000000001' and image_url is not null),
  0,'deleting a color assignment clears its variant image references');

select * from finish();
rollback;
