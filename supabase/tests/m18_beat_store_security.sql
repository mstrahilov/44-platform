begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(id,email,raw_user_meta_data) values
 ('51000000-0000-0000-0000-000000000001','beat-buyer@example.test','{"username":"beat_buyer"}'),
 ('51000000-0000-0000-0000-000000000002','beat-creator@example.test','{"username":"beat_creator"}'),
 ('51000000-0000-0000-0000-000000000003','beat-other@example.test','{"username":"beat_other"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator',display_name='Beat Creator' where id='51000000-0000-0000-0000-000000000002';

insert into public.catalog_items(id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,cover_url,status,author_id,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled)
select '61000000-0000-0000-0000-000000000001',category.id,'m18-beat','M18 Beat','Beat Creator','Beat',0,false,false,'{}','https://example.test/beat.jpg','draft','51000000-0000-0000-0000-000000000002','music','digital',true,false
from public.item_categories category where category.slug='music';
insert into public.item_type_assignments(item_id,item_type_id)
select '61000000-0000-0000-0000-000000000001',item_type.id from public.item_types item_type join public.item_categories category on category.id=item_type.category_id where category.slug='music' and item_type.slug='beat';
insert into public.tracks(id,item_id,number,title,duration_seconds,audio_url) values
 ('71000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',1,'Tagged Preview',120,'https://example.test/tagged-preview.mp3');
insert into public.beat_details(item_id,preview_track_id,bpm,key_root,key_mode,time_signature,sample_status)
values('61000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',92,'D','minor','4/4','none');
insert into public.item_assets(id,item_id,asset_type,title,storage_path,is_downloadable,sort_order) values
 ('81000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','beat_mp3','MP3','beats/51000000-0000-0000-0000-000000000002/m18.mp3',true,100),
 ('81000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001','beat_wav','WAV','beats/51000000-0000-0000-0000-000000000002/m18.wav',true,110),
 ('81000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001','beat_stems','Stems','beats/51000000-0000-0000-0000-000000000002/m18.zip',true,120);
insert into public.beat_files(id,item_id,asset_id,file_kind) values
 ('82000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','untagged_mp3'),
 ('82000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','untagged_wav'),
 ('82000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000003','stems_zip');
insert into public.catalog_offers(id,item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type)
values('83000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','beat-basic','beat_license','Basic','Basic license',2500,'USD','draft','license');
insert into public.beat_license_offers(offer_id,template_id)
select '83000000-0000-0000-0000-000000000001',id from public.beat_license_templates where tier_code='basic' and version=1;
insert into public.beat_offer_files(offer_id,beat_file_id) values('83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001');
insert into public.commerce_orders(id,buyer_id,status,currency,subtotal_cents,total_cents,idempotency_key)
values('84000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','paid','USD',2500,2500,'m18-order');
-- This is preserved historical license evidence, not a new launch Checkout
-- operation. The final commerce trigger correctly rejects new Beat orders.
set local session_replication_role=replica;
insert into public.commerce_order_items(id,order_id,offer_id,item_id,seller_id,item_title,offer_title,offer_type,unit_price_cents,line_total_cents,currency)
values('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000002','M18 Beat','Basic','beat_license',2500,2500,'USD');
set local session_replication_role=origin;
insert into public.beat_license_grants(id,license_number,order_item_id,buyer_id,item_id,offer_id,template_id,tier_code,is_exclusive,terms_text,terms_sha256,price_cents,currency,seller_id,seller_snapshot,collaborator_snapshot,file_manifest)
select '86000000-0000-0000-0000-000000000001','44B-M18TEST','85000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',template.id,'basic',false,template.terms_text,template.terms_sha256,2500,'USD','51000000-0000-0000-0000-000000000002','{}','[]','[{"beatFileId":"82000000-0000-0000-0000-000000000001","assetId":"81000000-0000-0000-0000-000000000001","kind":"untagged_mp3"}]'
from public.beat_license_templates template where template.tier_code='basic' and template.version=1;

select ok(public.is_beat_item('61000000-0000-0000-0000-000000000001'),'Beat identity comes from the assigned Music Item Type or capability');
select is((select review_surfaces_enabled from public.beat_runtime_controls where singleton),false,'review surfaces default off');
select is((select catalog_enabled from public.beat_runtime_controls where singleton),false,'Beat catalog defaults off');
select is((select checkout_enabled from public.beat_runtime_controls where singleton),false,'Beat checkout defaults off');
select is((select status from public.beat_license_templates where tier_code='basic' and version=1),'draft','standard seed terms remain draft');
select is((select revenue_share_bps from public.beat_collaborator_splits where item_id='61000000-0000-0000-0000-000000000001' and profile_id='51000000-0000-0000-0000-000000000002'),10000,'new Beats receive the owner-only revenue split');
select is((select publishing_share_bps from public.beat_collaborator_splits where item_id='61000000-0000-0000-0000-000000000001' and profile_id='51000000-0000-0000-0000-000000000002'),10000,'new Beats receive the owner-only publishing split');
select throws_ok($$insert into public.beat_details(item_id,preview_track_id,bpm,key_root,key_mode) values('61000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001',241,'C','major')$$,'23514',null,'BPM outside 40–240 is rejected');
select throws_ok($$update public.beat_details set sample_status='royalty_free',sample_disclosure=null where item_id='61000000-0000-0000-0000-000000000001'$$,'23514',null,'declared samples require disclosure');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.beat_details where item_id='61000000-0000-0000-0000-000000000001'),0,'anonymous users cannot read draft Beat metadata while catalog is off');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000003',true);
select is((select count(*)::integer from public.beat_details where item_id='61000000-0000-0000-0000-000000000001'),0,'foreign members cannot read creator draft Beat metadata');
select throws_ok($$insert into public.beat_license_grants(id,license_number,order_item_id,buyer_id,item_id,offer_id,template_id,tier_code,is_exclusive,terms_text,terms_sha256,price_cents,currency,seller_id,seller_snapshot,collaborator_snapshot,file_manifest) select gen_random_uuid(),'DENIED','85000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',id,'basic',false,terms_text,terms_sha256,2500,'USD','51000000-0000-0000-0000-000000000002','{}','[]','[]' from public.beat_license_templates where tier_code='basic' and version=1$$,'42501',null,'members cannot mint licenses directly');
select throws_ok($$update public.beat_runtime_controls set catalog_enabled=true where singleton$$,'42501',null,'members cannot activate Beat runtime controls');
select throws_ok($$select public.reserve_exclusive_beat_offer('83000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000003','disabled-test')$$,'42501',null,'exclusive reservation RPC is service-only');

select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type)
values('51000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','download','active','admin');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select ok(public.can_access_item_file('beats/51000000-0000-0000-0000-000000000002/m18.mp3'),'Basic buyer can retrieve the granted MP3');
select ok(not public.can_access_item_file('beats/51000000-0000-0000-0000-000000000002/m18.wav'),'generic Item download entitlement cannot reveal the Beat WAV');
select ok(not public.can_access_item_file('beats/51000000-0000-0000-0000-000000000002/m18.zip'),'generic Item download entitlement cannot reveal Beat stems');
select is((select count(*)::integer from public.list_item_asset_manifest('61000000-0000-0000-0000-000000000001')),1,'buyer manifest contains only files granted by the selected offer');
select lives_ok($$select public.record_beat_file_download('86000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001')$$,'buyer can record an authorized download');
select throws_ok($$select public.record_beat_file_download('86000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000002')$$,'42501','Active Beat file license required.','buyer cannot record a WAV download outside the license manifest');
select throws_ok($$update public.beat_license_grants set terms_text='changed' where id='86000000-0000-0000-0000-000000000001'$$,'42501',null,'buyers cannot alter immutable contract snapshots');

select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000002',true);
select ok(public.can_access_item_file('beats/51000000-0000-0000-0000-000000000002/m18.wav'),'creator can retrieve a managed private Beat file');
select throws_ok($$select public.save_owned_beat_draft(null,'Blocked Beat','Description','https://example.test/cover.jpg','2026-07-15','https://example.test/tagged.mp3',120,100,'C','minor',false,'4/4','none','','','{}','{}','{}','{}')$$,'55000','Beat review surfaces are disabled.','transactional Beat save is fail-closed at the database control');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.beat_license_templates set terms_text='DRAFT — replacement text that remains legally inactive.' where tier_code='basic' and version=1;
select isnt((select terms_text from public.beat_license_templates where tier_code='basic' and version=1),(select terms_text from public.beat_license_grants where id='86000000-0000-0000-0000-000000000001'),'template edits do not mutate an existing buyer contract snapshot');
update public.beat_collaborator_splits set revenue_share_bps=9000 where item_id='61000000-0000-0000-0000-000000000001';
select ok(exists(select 1 from public.beat_configuration_health('61000000-0000-0000-0000-000000000001') where code='invalid_split_total'),'commerce health detects split totals below 10,000 basis points');

select * from finish();
rollback;
