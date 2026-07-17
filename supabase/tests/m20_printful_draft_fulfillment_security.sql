begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_table('public','printful_runtime_controls','Printful runtime controls exist');
select has_table('public','merch_variants','canonical Merch variants exist');
select has_table('public','printful_product_mappings','Printful product mappings exist');
select has_table('public','printful_variant_mappings','Printful variant mappings exist');
select has_table('public','printful_shipping_quotes','Printful quote evidence exists');
select has_table('public','printful_fulfillment_orders','Printful draft-order evidence exists');
select has_column('public','merch_variants','price_cents','canonical variants can own customer retail prices');
select has_column('public','commerce_order_items','merch_variant_snapshot','order lines preserve the selected local variant snapshot');

insert into auth.users(id,email,raw_user_meta_data) values
  ('a3200000-0000-4000-8000-000000000001','printful-member@example.test','{"username":"printful_member"}'),
  ('a3200000-0000-4000-8000-000000000002','printful-admin@example.test','{"username":"printful_admin"}'),
  ('a3200000-0000-4000-8000-000000000003','printful-other-admin@example.test','{"username":"printful_other_admin"}');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id in ('a3200000-0000-4000-8000-000000000002','a3200000-0000-4000-8000-000000000003');
update public.commerce_runtime_controls set platform_seller_id='a3200000-0000-4000-8000-000000000002' where singleton;

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,author_id,experience_type,fulfillment_type
)
select fixture.id,category.id,fixture.slug,fixture.title,'44OS','Apparel',5000,false,'published',fixture.author_id,'merch','physical'
from public.item_categories category
cross join (values
  ('a3210000-0000-4000-8000-000000000001'::uuid,'printful-platform-merch','Printful Platform Merch','a3200000-0000-4000-8000-000000000002'::uuid),
  ('a3210000-0000-4000-8000-000000000002'::uuid,'printful-platform-merch-two','Printful Platform Merch Two','a3200000-0000-4000-8000-000000000002'::uuid),
  ('a3210000-0000-4000-8000-000000000003'::uuid,'printful-other-merch','Printful Other Merch','a3200000-0000-4000-8000-000000000003'::uuid)
) fixture(id,slug,title,author_id)
where category.slug='merch';

select is((select confirmation_enabled from public.printful_runtime_controls where singleton),false,'Printful confirmation defaults off');
select throws_ok(
  $$update public.printful_runtime_controls set confirmation_enabled=true where singleton$$,
  '23514',null,'the database hard-lock rejects confirmation enablement'
);

select lives_ok($$
  insert into public.merch_variants(id,item_id,code,display_name,option_values,status)
  values('a3220000-0000-4000-8000-000000000001','a3210000-0000-4000-8000-000000000001','black-m','Black / M','{"color":"Black","size":"M"}','draft')
$$,'service role can create a canonical variant for the platform Merch Item');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a3200000-0000-4000-8000-000000000001',true);
select throws_ok($$
  insert into public.merch_variants(item_id,code,display_name)
  values('a3210000-0000-4000-8000-000000000001','injected','Injected')
$$,'42501',null,'members cannot create provider-backed Merch variants');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.merch_variants where item_id='a3210000-0000-4000-8000-000000000001'),0,'draft variants remain private');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.merch_variants set status='active' where id='a3220000-0000-4000-8000-000000000001';
update public.merch_variants set is_default=true where id='a3220000-0000-4000-8000-000000000001';
select throws_ok($$
  insert into public.merch_variants(item_id,code,display_name,is_default)
  values('a3210000-0000-4000-8000-000000000001','duplicate-default','Duplicate default',true)
$$,'23505',null,'each Merch Item can expose only one default variant');
set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select is((select count(*)::integer from public.merch_variants where item_id='a3210000-0000-4000-8000-000000000001'),1,'only active variants of published Merch become public');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok($$
  insert into public.printful_product_mappings(item_id,store_id,sync_product_id,provider_name)
  values('a3210000-0000-4000-8000-000000000001',440044,1001,'Unverified product')
$$,'55000','Printful store has not passed the server verification gate.','provider mappings fail before store verification');

update public.printful_runtime_controls set
  store_id=440044,provider_connected=true,catalog_import_enabled=true,
  shipping_quotes_enabled=true,draft_orders_enabled=true,
  verified_at=now(),approved_by='a3200000-0000-4000-8000-000000000002'
where singleton;

select lives_ok($$
  insert into public.printful_product_mappings(id,item_id,store_id,sync_product_id,provider_name)
  values('a3230000-0000-4000-8000-000000000001','a3210000-0000-4000-8000-000000000001',440044,1001,'Verified product')
$$,'verified platform Merch can receive a provider product mapping');

select throws_ok($$
  insert into public.printful_product_mappings(item_id,store_id,sync_product_id,provider_name)
  values('a3210000-0000-4000-8000-000000000003',440044,1002,'Wrong owner')
$$,'42501','Printful mappings are restricted to 44-owned Merch.','non-platform Merch cannot receive a Printful mapping');

insert into public.merch_variants(id,item_id,code,display_name,status)
values('a3220000-0000-4000-8000-000000000002','a3210000-0000-4000-8000-000000000002','other-m','Other / M','draft');
select throws_ok($$
  insert into public.printful_variant_mappings(product_mapping_id,merch_variant_id,sync_variant_id,catalog_variant_id,provider_name,availability_status)
  values('a3230000-0000-4000-8000-000000000001','a3220000-0000-4000-8000-000000000002',2002,3002,'Wrong item','active')
$$,'23514','Printful variant mapping does not belong to the mapped 44 Item.','cross-Item variant mappings fail closed');

select lives_ok($$
  insert into public.provider_webhook_events(provider,provider_event_id,event_type,signature_verified,processing_status,payload)
  values('printful','pf_test_event','order_created',true,'processed','{}')
$$,'the signed provider inbox accepts Printful evidence');

select lives_ok($$
  insert into public.commerce_reconciliation_runs(provider,scope,window_start,window_end,status)
  values('printful','fulfillment',now()-interval '1 hour',now(),'matched')
$$,'reconciliation supports the Printful fulfillment scope');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a3200000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.printful_product_mappings where id='a3230000-0000-4000-8000-000000000001'),1,'administrators can inspect the provider product mapping created by this fixture');
select throws_ok($$
  insert into public.printful_product_mappings(item_id,store_id,sync_product_id,provider_name)
  values('a3210000-0000-4000-8000-000000000001',440044,1999,'Injected mapping')
$$,'42501',null,'administrators cannot bypass service-only provider writes');

select * from finish();
rollback;
