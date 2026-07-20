begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users(id,email,raw_user_meta_data) values
  ('98600000-0000-0000-0000-000000000001','book-asset-creator@example.test','{"username":"book_asset_creator","display_name":"Book Asset Creator","country_code":"US"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='98600000-0000-0000-0000-000000000001';

insert into public.catalog_items(
  id,slug,title,creator,item_type,price_cents,is_free,cover_url,status,
  author_id,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled
) values (
  '98700000-0000-0000-0000-000000000001','paid-readable-book','Paid Readable Book',
  'Book Asset Creator','Book',1200,false,'https://example.test/book.jpg','published',
  '98600000-0000-0000-0000-000000000001','book','digital',true,true
);

select ok(exists(select 1 from public.catalog_offers where item_id='98700000-0000-0000-0000-000000000001' and code='library-access' and status='active' and price_cents=0),'a paid-download Book retains free Library access');
select ok(exists(select 1 from public.offer_entitlements entitlement join public.catalog_offers offer on offer.id=entitlement.offer_id where offer.item_id='98700000-0000-0000-0000-000000000001' and entitlement.entitlement_type='read'),'the free Book offer grants full reader access');
select ok(exists(select 1 from public.catalog_offers where item_id='98700000-0000-0000-0000-000000000001' and code='digital-download-usd'),'the same Book can expose a separate paid download offer');

select throws_ok($$
  insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,cover_url,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
  values ('98700000-0000-0000-0000-000000000002','free-pack-blocked','Free Pack Blocked','Book Asset Creator','Sample Pack',0,true,'https://example.test/pack.jpg','published','98600000-0000-0000-0000-000000000001','asset','digital',true)
$$,'23514','Published Sample Packs require a paid download price.','a new free Sample Pack cannot publish');

select lives_ok($$
  insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,cover_url,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
  values ('98700000-0000-0000-0000-000000000003','paid-pack','Paid Pack','Book Asset Creator','Sample Pack',900,false,'https://example.test/pack.jpg','published','98600000-0000-0000-0000-000000000001','asset','digital',true)
$$,'a priced downloadable Sample Pack can publish');
select ok(exists(select 1 from public.catalog_offers where item_id='98700000-0000-0000-0000-000000000003' and code='digital-download-usd'),'a published Sample Pack receives its paid download offer');

insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,cover_url,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
values ('98700000-0000-0000-0000-000000000004','draft-pack','Draft Pack','Book Asset Creator','Sample Pack',0,true,'https://example.test/draft-pack.jpg','draft','98600000-0000-0000-0000-000000000001','asset','digital',false);
select throws_ok($$update public.catalog_items set status='published' where id='98700000-0000-0000-0000-000000000004'$$,'23514','Published Sample Packs require a paid download price.','a free Sample Pack draft cannot transition to published');
select lives_ok($$update public.catalog_items set price_cents=700,is_free=false,download_purchase_enabled=true,status='published' where id='98700000-0000-0000-0000-000000000004'$$,'a Sample Pack draft publishes after receiving a valid download price');

select * from finish();
rollback;
