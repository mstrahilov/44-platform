begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(id,email,raw_user_meta_data) values
 ('f6100000-0000-4000-8000-000000000001','offer-admin@example.test','{"username":"offer_admin","display_name":"Offer Admin","country_code":"US"}'),
 ('f6100000-0000-4000-8000-000000000002','offer-seller@example.test','{"username":"offer_seller","display_name":"Offer Seller","country_code":"US"}'),
 ('f6100000-0000-4000-8000-000000000003','offer-buyer@example.test','{"username":"offer_buyer","display_name":"Offer Buyer","country_code":"US"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='f6100000-0000-4000-8000-000000000001';
update public.profiles set role='creator' where id='f6100000-0000-4000-8000-000000000002';
update public.commerce_runtime_controls set platform_seller_id='f6100000-0000-4000-8000-000000000002' where singleton;

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,cover_url,status,author_id,experience_type,fulfillment_type
)
select 'f6200000-0000-4000-8000-000000000001',id,'offer-lifecycle-test','Offer Lifecycle Test','Offer Seller','single',99,false,false,'{}','https://example.test/cover.jpg','published','f6100000-0000-4000-8000-000000000002','music','digital'
from public.item_categories where slug='music';
insert into public.catalog_offers(id,item_id,code,offer_type,title,price_cents,currency,status,fulfillment_type)
values('f6300000-0000-4000-8000-000000000001','f6200000-0000-4000-8000-000000000001','p6-offer-lifecycle','digital_download','Digital download',99,'USD','active','entitlement');
insert into public.offer_entitlements(offer_id,entitlement_type)
values('f6300000-0000-4000-8000-000000000001','download');
insert into public.commerce_orders(id,buyer_id,status,currency,subtotal_cents,total_cents,idempotency_key,paid_at)
values('f6400000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000003','paid','USD',99,99,'offer-lifecycle-order',now());
insert into public.commerce_order_items(id,order_id,offer_id,item_id,seller_id,item_title,offer_title,offer_type,quantity,unit_price_cents,line_total_cents,currency,fulfillment_status)
values('f6500000-0000-4000-8000-000000000001','f6400000-0000-4000-8000-000000000001','f6300000-0000-4000-8000-000000000001','f6200000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000002','Offer Lifecycle Test','Digital download','digital_download',1,99,99,'USD','not_required');
insert into public.entitlements(id,user_id,item_id,entitlement_type,status,source_type,source_id)
values('f6600000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000003','f6200000-0000-4000-8000-000000000001','download','active','order','f6400000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.set_admin_offer_lifecycle('f6300000-0000-4000-8000-000000000001','pause','Unauthorized pause')$$,
  '42501','Administrator access required.','buyers cannot pause paid offers'
);

select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);
select is(
  public.set_admin_offer_lifecycle('f6300000-0000-4000-8000-000000000001','pause','P6 rollback rehearsal'),
  'draft','an admin can pause an active paid digital offer'
);
select is((select status from public.catalog_items where id='f6200000-0000-4000-8000-000000000001'),'published','pausing preserves Item publication');
select is((select status from public.catalog_offers where id='f6300000-0000-4000-8000-000000000001'),'draft','pause closes only the offer');
select is((select count(*)::integer from public.commerce_orders where id='f6400000-0000-4000-8000-000000000001'),1,'pause preserves the order');
select is((select count(*)::integer from public.commerce_order_items where id='f6500000-0000-4000-8000-000000000001'),1,'pause preserves the order line');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select status from public.entitlements where id='f6600000-0000-4000-8000-000000000001'),'active','pause preserves buyer access');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.offer_entitlements where offer_id='f6300000-0000-4000-8000-000000000001'),1,'pause preserves offer entitlement configuration');
select is((select count(*)::integer from public.admin_offer_lifecycle_events where offer_id='f6300000-0000-4000-8000-000000000001' and action='pause'),1,'pause records immutable audit history');
select throws_ok(
  $$select public.set_admin_offer_lifecycle('f6300000-0000-4000-8000-000000000001','pause','Duplicate pause')$$,
  '55000','Only active paid offers can be paused.','a paused offer cannot be paused twice'
);
select is(
  public.set_admin_offer_lifecycle('f6300000-0000-4000-8000-000000000001','restore','P6 forward repair rehearsal'),
  'active','an admin can restore the paused offer'
);
select is((select status from public.catalog_offers where id='f6300000-0000-4000-8000-000000000001'),'active','restore reopens the same offer');
select is((select count(*)::integer from public.catalog_offers where id='f6300000-0000-4000-8000-000000000001'),1,'restore preserves offer identity');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select status from public.entitlements where id='f6600000-0000-4000-8000-000000000001'),'active','restore leaves buyer access unchanged');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.admin_offer_lifecycle_events where offer_id='f6300000-0000-4000-8000-000000000001'),2,'pause and restore each append one audit event');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok(
  $$update public.admin_offer_lifecycle_events set reason='changed' where offer_id='f6300000-0000-4000-8000-000000000001'$$,
  '55000','Administrator audit history is immutable.','offer lifecycle audit cannot be rewritten'
);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$select public.set_admin_offer_lifecycle('f6300000-0000-4000-8000-000000000001','restore','Duplicate restore')$$,
  '55000','Only paused paid offers can be restored.','an active offer cannot be restored twice'
);
select throws_ok(
  $$select public.set_admin_offer_lifecycle('f6300000-0000-4000-8000-000000000001','invalid','Invalid action')$$,
  '22023','Invalid offer lifecycle action.','unknown actions fail closed'
);

select * from finish();
rollback;
