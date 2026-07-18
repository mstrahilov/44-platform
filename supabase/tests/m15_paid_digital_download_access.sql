begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users(id,email,raw_user_meta_data) values
  ('f7100000-0000-4000-8000-000000000001','download-owner@example.test','{"username":"download_owner","display_name":"Download Owner","country_code":"US"}'),
  ('f7100000-0000-4000-8000-000000000002','download-buyer@example.test','{"username":"download_buyer","display_name":"Download Buyer","country_code":"US"}'),
  ('f7100000-0000-4000-8000-000000000003','download-reader@example.test','{"username":"download_reader","display_name":"Download Reader","country_code":"US"}'),
  ('f7100000-0000-4000-8000-000000000004','download-outsider@example.test','{"username":"download_outsider","display_name":"Download Outsider","country_code":"US"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='f7100000-0000-4000-8000-000000000001';

insert into public.catalog_items(id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
select 'f7200000-0000-4000-8000-000000000001',id,'paid-book-download-test','Paid Book Download Test','Download Owner','book',999,false,'published','f7100000-0000-4000-8000-000000000001','book','digital',true
from public.item_categories order by sort_order limit 1;
insert into public.item_assets(id,item_id,asset_type,title,storage_path,is_downloadable,sort_order)
values('f7300000-0000-4000-8000-000000000001','f7200000-0000-4000-8000-000000000001','book','Paid book file','books/f7100000-0000-4000-8000-000000000001/paid-book.pdf',true,0);

insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id) values
  ('f7100000-0000-4000-8000-000000000002','f7200000-0000-4000-8000-000000000001','download','active','order','f7400000-0000-4000-8000-000000000001'),
  ('f7100000-0000-4000-8000-000000000003','f7200000-0000-4000-8000-000000000001','read','active','free_offer','f7400000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f7100000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.list_item_asset_manifest('f7200000-0000-4000-8000-000000000001')),1,'a paid download entitlement exposes the protected book manifest row');
select ok((select is_unlocked from public.list_item_asset_manifest('f7200000-0000-4000-8000-000000000001') limit 1),'the paid book file is unlocked');
select is((select storage_path from public.list_item_asset_manifest('f7200000-0000-4000-8000-000000000001') limit 1),'books/f7100000-0000-4000-8000-000000000001/paid-book.pdf','the unlocked manifest returns the protected storage path');
select ok(public.can_access_item_file('books/f7100000-0000-4000-8000-000000000001/paid-book.pdf'),'the paid buyer may request a signed storage URL');

select set_config('request.jwt.claim.sub','f7100000-0000-4000-8000-000000000003',true);
select is((select count(*)::integer from public.list_item_asset_manifest('f7200000-0000-4000-8000-000000000001')),1,'read access continues to expose the protected book file');
select ok(public.can_access_item_file('books/f7100000-0000-4000-8000-000000000001/paid-book.pdf'),'the reader path remains authorized');

select set_config('request.jwt.claim.sub','f7100000-0000-4000-8000-000000000004',true);
select is((select count(*)::integer from public.list_item_asset_manifest('f7200000-0000-4000-8000-000000000001')),0,'an unrelated member receives no manifest row');
select isnt(public.can_access_item_file('books/f7100000-0000-4000-8000-000000000001/paid-book.pdf'),true,'an unrelated member cannot request the file');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.entitlements set status='revoked',revoked_at=now()
where user_id='f7100000-0000-4000-8000-000000000002' and item_id='f7200000-0000-4000-8000-000000000001' and entitlement_type='download';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f7100000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.list_item_asset_manifest('f7200000-0000-4000-8000-000000000001')),0,'refund revocation removes the protected manifest row');
select isnt(public.can_access_item_file('books/f7100000-0000-4000-8000-000000000001/paid-book.pdf'),true,'refund revocation closes signed-file access');

select * from finish();
rollback;
