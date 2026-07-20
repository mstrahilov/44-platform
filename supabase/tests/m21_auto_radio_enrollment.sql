begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id,email,raw_user_meta_data) values
  ('98300000-0000-0000-0000-000000000001','radio-creator@example.test','{"username":"radio_creator","display_name":"Radio Creator","country_code":"US"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='98300000-0000-0000-0000-000000000001';

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,cover_url,status,
  author_id,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled
)
select fixture.item_id,category.id,fixture.slug,fixture.title,'Radio Creator',fixture.item_type,
  0,true,'https://example.test/radio.jpg',fixture.status,'98300000-0000-0000-0000-000000000001',
  fixture.experience_type,'digital',fixture.streaming_enabled,false
from public.item_categories category cross join (values
  ('98400000-0000-0000-0000-000000000001'::uuid,'radio-published','Radio Published','Album','published','music',true),
  ('98400000-0000-0000-0000-000000000002'::uuid,'radio-draft','Radio Draft','Single','draft','music',true),
  ('98400000-0000-0000-0000-000000000003'::uuid,'radio-streaming-off','Radio Streaming Off','EP','published','music',false),
  ('98400000-0000-0000-0000-000000000004'::uuid,'radio-book','Radio Book','Book','published','book',true)
) fixture(item_id,slug,title,item_type,status,experience_type,streaming_enabled)
where category.slug='music';

insert into public.tracks(id,item_id,number,title,audio_url) values
  ('98500000-0000-0000-0000-000000000001','98400000-0000-0000-0000-000000000001',1,'Published Track','https://example.test/published.mp3'),
  ('98500000-0000-0000-0000-000000000002','98400000-0000-0000-0000-000000000002',1,'Draft Track','https://example.test/draft.mp3'),
  ('98500000-0000-0000-0000-000000000003','98400000-0000-0000-0000-000000000003',1,'Disabled Track','https://example.test/disabled.mp3'),
  ('98500000-0000-0000-0000-000000000004','98400000-0000-0000-0000-000000000004',1,'Book Track','https://example.test/book.mp3');

select ok(exists(select 1 from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000001' and is_active),'a published streaming Music track automatically joins Radio');
select is((select added_by from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000001'),'98300000-0000-0000-0000-000000000001'::uuid,'automatic Radio enrollment records the creator');
select ok(not exists(select 1 from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000002'),'draft Music stays out of Radio');
select ok(not exists(select 1 from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000003'),'Music with streaming disabled stays out of Radio');
select ok(not exists(select 1 from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000004'),'non-Music Items stay out of Radio');

update public.catalog_items set status='published' where id='98400000-0000-0000-0000-000000000002';
select ok(exists(select 1 from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000002' and is_active),'publishing a draft enrolls its existing playable tracks');

insert into public.tracks(id,item_id,number,title,audio_url)
values('98500000-0000-0000-0000-000000000005','98400000-0000-0000-0000-000000000002',2,'Second Track','https://example.test/second.mp3');
select ok(exists(select 1 from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000005' and is_active),'a track added to published Music joins Radio');

update public.tracks set title='Second Track Updated' where id='98500000-0000-0000-0000-000000000005';
select is((select count(*)::integer from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000005'),1,'Radio enrollment remains idempotent');

update public.radio_playlist_entries set is_active=false where track_id='98500000-0000-0000-0000-000000000005';
update public.tracks set audio_url='https://example.test/second-v2.mp3' where id='98500000-0000-0000-0000-000000000005';
select is((select is_active from public.radio_playlist_entries where track_id='98500000-0000-0000-0000-000000000005'),false,'automatic sync preserves an Admin-disabled playlist entry');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select ok(not has_function_privilege('anon','public.sync_item_tracks_to_radio(uuid)','execute'),'anonymous users cannot invoke Radio enrollment directly');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','98300000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.update_owned_item('98400000-0000-0000-0000-000000000002','{"price_cents":900,"is_free":false,"streaming_enabled":true,"download_purchase_enabled":true}'::jsonb)$$,'creators can enable a paid download while keeping streaming enabled');
select ok((select streaming_enabled and download_purchase_enabled and not is_free and price_cents=900 from public.catalog_items where id='98400000-0000-0000-0000-000000000002'),'the paid-download edit persists independent streaming and download capability state');

select * from finish();
rollback;
