begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(id,email,raw_user_meta_data) values
 ('50000000-0000-0000-0000-000000000001','m15-member@example.test','{"username":"m15_member"}'),
 ('50000000-0000-0000-0000-000000000002','m15-creator@example.test','{"username":"m15_creator"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='50000000-0000-0000-0000-000000000002';
insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
values
 ('60000000-0000-0000-0000-000000000001','m15-book','M15 Book','M15 Creator','Book',0,true,false,'{}','published','50000000-0000-0000-0000-000000000002','book','digital',true),
 ('60000000-0000-0000-0000-000000000002','m15-pack','M15 Pack','M15 Creator','Sample Pack',900,false,false,'{}','published','50000000-0000-0000-0000-000000000002','asset','digital',true);
insert into public.item_assets(id,item_id,asset_type,title,storage_path,is_downloadable,sort_order) values
 ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','book','Full PDF','products/books/50000000-0000-0000-0000-000000000002/book.pdf',true,0),
 ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','sample_pack','Full Pack','products/assets/50000000-0000-0000-0000-000000000002/pack.zip',true,0),
 ('70000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000002','sample','Kick.wav','products/assets/50000000-0000-0000-0000-000000000002/kick.wav',true,1);
insert into public.book_contents(item_id,file_asset_id,preview_url,total_pages,sample_page_limit,language_code)
values('60000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','https://example.test/book-sample.pdf',120,12,'en');
insert into public.sample_pack_files(id,item_id,source_asset_id,title,preview_url,duration_seconds,waveform_peaks,sort_order)
values('80000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003','Kick','https://example.test/kick.mp3',4.2,'[0.1,0.8,0.3]',0);
insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id)
values('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','download','active','order','90000000-0000-0000-0000-000000000001');

set local role anon;
select is((select preview_url from public.book_contents where item_id='60000000-0000-0000-0000-000000000001'),'https://example.test/book-sample.pdf','published book sample metadata is public');
select is((select count(*)::integer from public.sample_pack_files where item_id='60000000-0000-0000-0000-000000000002'),1,'published sample preview metadata is public');
select throws_ok($$select public.save_reading_progress('60000000-0000-0000-0000-000000000001',2,120,'{}')$$,'42501',null,'anonymous users cannot save reading progress');
select throws_ok($$select public.save_sample_playback_progress('80000000-0000-0000-0000-000000000001',1,4.2)$$,'42501',null,'anonymous users cannot save sample progress');
select throws_ok($$select public.toggle_reading_bookmark('60000000-0000-0000-0000-000000000001',2)$$,'42501',null,'anonymous users cannot save reader bookmarks');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
select throws_ok($$insert into public.reading_progress(user_id,item_id) values('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001')$$,'42501',null,'direct progress writes are revoked');
select throws_ok($$select public.save_reading_progress('60000000-0000-0000-0000-000000000001',2,120,'{}')$$,'42501','active read access required','read progress requires read entitlement');
select throws_ok($$select public.toggle_reading_bookmark('60000000-0000-0000-0000-000000000001',2)$$,'42501','active read access required','reader bookmarks require read entitlement');
select lives_ok($$select public.save_item_to_library('60000000-0000-0000-0000-000000000001')$$,'member can claim the free book');
select ok(public.has_item_entitlement('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','read'),'free book claim grants read access');
select lives_ok($$select public.save_reading_progress('60000000-0000-0000-0000-000000000001',999,120,'{"theme":"sepia","fit":"page","zoom":1.2}')$$,'entitled reader can save progress');
select is((select page_number from public.reading_progress where user_id='50000000-0000-0000-0000-000000000001' and item_id='60000000-0000-0000-0000-000000000001'),120,'reading page is clamped to the PDF length');
select is((select progress_percent from public.reading_progress where user_id='50000000-0000-0000-0000-000000000001' and item_id='60000000-0000-0000-0000-000000000001'),100.00::numeric,'reading percent is server-derived');
select is(public.toggle_reading_bookmark('60000000-0000-0000-0000-000000000001',12),true,'entitled reader can add a bookmark');
select is(public.toggle_reading_bookmark('60000000-0000-0000-0000-000000000001',12),false,'bookmark action toggles the saved page off');
select ok(public.can_access_item_file('products/books/50000000-0000-0000-0000-000000000002/book.pdf'),'read entitlement authorizes the protected PDF');
select throws_ok($$select public.save_item_to_library('60000000-0000-0000-0000-000000000002')$$,'P0001','free Library access is not available for this Item','a paid Sample Pack cannot be claimed through the free Library path');
select ok(public.has_item_entitlement('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','download'),'a paid Sample Pack download entitlement is recognized');
select ok(public.can_access_item_file('products/assets/50000000-0000-0000-0000-000000000002/pack.zip'),'paid download entitlement authorizes the full pack');
select ok(public.can_access_item_file('products/assets/50000000-0000-0000-0000-000000000002/kick.wav'),'paid download entitlement authorizes an individual sample');
select lives_ok($$select public.save_sample_playback_progress('80000000-0000-0000-0000-000000000001',99,4.2)$$,'authenticated preview progress is saved');
select is((select position_seconds from public.sample_playback_progress where user_id='50000000-0000-0000-0000-000000000001' and sample_file_id='80000000-0000-0000-0000-000000000001'),4.200::numeric,'sample progress is clamped to duration');

select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.update_owned_item('60000000-0000-0000-0000-000000000001','{"long_description":"Creator-written book description"}')$$,'creator can edit the canonical Book description');
select is((select long_description from public.catalog_items where id='60000000-0000-0000-0000-000000000001'),'Creator-written book description','Book description edit is saved without a parallel content field');
select throws_ok($$insert into public.book_contents(item_id,file_asset_id,preview_url) values('60000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002','https://example.test/wrong.pdf')$$,'23514','Book content requires a book Item.','cross-type book contracts are rejected');

select * from finish();
rollback;
