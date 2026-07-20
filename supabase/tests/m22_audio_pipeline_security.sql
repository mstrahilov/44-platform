begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select ok((select not public and file_size_limit=524288000 from storage.buckets where id='audio-sources'),'audio sources are private and accept 500 MiB files');
select ok((select public and file_size_limit=262144000 from storage.buckets where id='audio-streams'),'streaming derivatives use a dedicated public bucket');
select ok((select not public from storage.buckets where id='audio-quarantine'),'audio quarantine is private');
select is((select file_size_limit from storage.buckets where id='uploads'),52428800::bigint,'the general public uploads bucket remains capped at 50 MiB');

insert into auth.users(id,email,raw_user_meta_data) values
  ('a7100000-0000-4000-8000-000000000001','audio-owner@example.test','{"username":"audio_owner","display_name":"Audio Owner","country_code":"US"}'),
  ('a7100000-0000-4000-8000-000000000002','audio-outsider@example.test','{"username":"audio_outsider","display_name":"Audio Outsider","country_code":"US"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='a7100000-0000-4000-8000-000000000001';

insert into public.catalog_items(id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
select fixture.id,category.id,fixture.slug,fixture.title,'Audio Owner','Single',fixture.price,fixture.free,'draft','a7100000-0000-4000-8000-000000000001','music','digital',fixture.paid
from public.item_categories category cross join (values
  ('a7200000-0000-4000-8000-000000000001'::uuid,'audio-paid','Audio Paid',900,false,true),
  ('a7200000-0000-4000-8000-000000000002'::uuid,'audio-free','Audio Free',0,true,false),
  ('a7200000-0000-4000-8000-000000000003'::uuid,'audio-history','Audio History',0,true,false)
) fixture(id,slug,title,price,free,paid) where category.slug='music';
insert into public.tracks(id,item_id,number,title,audio_url) values
  ('a7300000-0000-4000-8000-000000000001','a7200000-0000-4000-8000-000000000001',1,'Paid Track','https://example.test/old-paid.wav'),
  ('a7300000-0000-4000-8000-000000000002','a7200000-0000-4000-8000-000000000002',1,'Free Track','https://example.test/old-free.wav'),
  ('a7300000-0000-4000-8000-000000000003','a7200000-0000-4000-8000-000000000003',1,'History Track','https://example.test/old-history.wav');

insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id)
values('a7100000-0000-4000-8000-000000000002','a7200000-0000-4000-8000-000000000003','download','revoked','order','a7400000-0000-4000-8000-000000000001');

insert into public.audio_assets(id,owner_id,status,source_path,original_filename,source_content_type,source_byte_size,source_sha256,
  stream_bucket,stream_path,stream_public_url,stream_byte_size,stream_sha256,stream_bitrate_kbps,stream_duration_seconds,ready_at)
values
  ('a7500000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','ready','a7100000-0000-4000-8000-000000000001/paid.wav','paid.wav','audio/wav',1000,repeat('a',64),'audio-streams','a7/paid.mp3','https://example.test/paid.mp3',500,repeat('b',64),320,120,now()),
  ('a7500000-0000-4000-8000-000000000002','a7100000-0000-4000-8000-000000000001','ready','a7100000-0000-4000-8000-000000000001/free.wav','free.wav','audio/wav',1000,repeat('c',64),'audio-streams','a7/free.mp3','https://example.test/free.mp3',500,repeat('d',64),320,121,now()),
  ('a7500000-0000-4000-8000-000000000003','a7100000-0000-4000-8000-000000000001','ready','a7100000-0000-4000-8000-000000000001/history.wav','history.wav','audio/wav',1000,repeat('e',64),'audio-streams','a7/history.mp3','https://example.test/history.mp3',500,repeat('f',64),320,122,now());

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a7100000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.audio_assets),3,'the creator can read only their audio assets');
select is(public.attach_ready_audio_asset('a7500000-0000-4000-8000-000000000001','a7300000-0000-4000-8000-000000000001'),'retain','paid releases retain their source master');
select is((select audio_url from public.tracks where id='a7300000-0000-4000-8000-000000000001'),'https://example.test/paid.mp3','attachment atomically switches playback to the verified stream');
select is(public.attach_ready_audio_asset('a7500000-0000-4000-8000-000000000002','a7300000-0000-4000-8000-000000000002'),'cleanup_after_grace','free releases schedule their source for delayed cleanup');
select ok(not has_table_privilege('authenticated','public.audio_cleanup_queue','select'),'creators cannot directly inspect the service cleanup queue');
select is(public.attach_ready_audio_asset('a7500000-0000-4000-8000-000000000003','a7300000-0000-4000-8000-000000000003'),'retain','a historical download entitlement permanently retains the source');
select is(jsonb_array_length(public.attach_ready_audio_assets('[{"asset_id":"a7500000-0000-4000-8000-000000000001","track_id":"a7300000-0000-4000-8000-000000000001"}]'::jsonb)),1,'release audio attachments can be committed in one transaction');

select set_config('request.jwt.claim.sub','a7100000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.audio_assets),0,'an unrelated authenticated user cannot read creator source metadata');
select throws_ok($$select public.attach_ready_audio_asset('a7500000-0000-4000-8000-000000000001','a7300000-0000-4000-8000-000000000001')$$,'42501',null,'an unrelated user cannot attach another creator audio asset');
select ok(not has_function_privilege('authenticated','public.claim_audio_processing_job(uuid)','execute'),'authenticated users cannot claim processing jobs');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select ok(not has_table_privilege('anon','public.audio_assets','select'),'anonymous users cannot inspect audio source records');
select ok(not has_function_privilege('anon','public.attach_ready_audio_asset(uuid,uuid)','execute'),'anonymous users cannot attach audio assets');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
insert into public.audio_assets(id,owner_id,status,source_path,original_filename,source_content_type,source_byte_size) values
  ('a7500000-0000-4000-8000-000000000004','a7100000-0000-4000-8000-000000000001','uploaded','a7/queue-1.wav','queue-1.wav','audio/wav',1000),
  ('a7500000-0000-4000-8000-000000000005','a7100000-0000-4000-8000-000000000001','uploaded','a7/queue-2.wav','queue-2.wav','audio/wav',1000),
  ('a7500000-0000-4000-8000-000000000006','a7100000-0000-4000-8000-000000000001','uploaded','a7/queue-3.wav','queue-3.wav','audio/wav',1000);
insert into public.audio_processing_jobs(audio_asset_id) values
  ('a7500000-0000-4000-8000-000000000004'),('a7500000-0000-4000-8000-000000000005'),('a7500000-0000-4000-8000-000000000006');
select is((select count(*)::integer from public.claim_audio_processing_job('a7600000-0000-4000-8000-000000000001')),1,'the worker claims the first due job');
select is((select count(*)::integer from public.claim_audio_processing_job('a7600000-0000-4000-8000-000000000002')),1,'the worker claims a second concurrent job');
select is((select count(*)::integer from public.claim_audio_processing_job('a7600000-0000-4000-8000-000000000003')),0,'the database enforces the two-job conversion concurrency cap');

update public.audio_assets set source_delete_after=now()-interval '1 minute' where id='a7500000-0000-4000-8000-000000000002';
select ok(public.audio_source_can_be_deleted('a7500000-0000-4000-8000-000000000002'),'a verified free source becomes cleanup-eligible only after its grace period');
select isnt(public.audio_source_can_be_deleted('a7500000-0000-4000-8000-000000000001'),true,'a paid master can never pass the cleanup authorization check');
select isnt(public.audio_source_can_be_deleted('a7500000-0000-4000-8000-000000000003'),true,'historical buyer access prevents cleanup even after paid sales are disabled');

select * from finish();
rollback;
