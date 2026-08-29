begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(id,email,raw_user_meta_data) values
  ('a8100000-0000-0000-0000-000000000001','native-performance-member@example.test','{"username":"native_perf_member","display_name":"Native Performance Member","country_code":"US"}'),
  ('a8100000-0000-0000-0000-000000000002','native-performance-creator@example.test','{"username":"native_perf_creator","display_name":"Native Performance Creator","country_code":"US"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles
set role='creator',is_published=true,avatar_url='https://example.test/native-performance-creator.jpg'
where id='a8100000-0000-0000-0000-000000000002';

delete from public.home_shelf_entries where shelf_key='featured';

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,cover_url,status,
  author_id,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled,release_date
)
select fixture.item_id,category.id,fixture.slug,fixture.title,'Native Performance Creator',fixture.item_type,
  0,true,'https://example.test/native-performance.jpg',fixture.status,'a8100000-0000-0000-0000-000000000002',
  fixture.experience_type,'digital',true,false,'2026-08-28'::date
from (values
  ('a8200000-0000-0000-0000-000000000001'::uuid,'native-performance-published','Native Performance Published','Album','published','music','music'),
  ('a8200000-0000-0000-0000-000000000002'::uuid,'native-performance-draft','Native Performance Draft','Album','draft','music','music'),
  -- The current canonical category rows are Music and Merch. Book is a
  -- first-class experience mapped to the public Books browse category.
  ('a8200000-0000-0000-0000-000000000003'::uuid,'native-performance-book','Native Performance Book','Book','published','book','music')
) fixture(item_id,slug,title,item_type,status,experience_type,category_slug)
join public.item_categories category on category.slug=fixture.category_slug;

insert into public.item_type_assignments(item_id,item_type_id)
select 'a8200000-0000-0000-0000-000000000001',item_type.id
from public.item_types item_type
join public.item_categories category on category.id=item_type.category_id
where category.slug='music' and item_type.is_active
order by item_type.sort_order,item_type.id
limit 1;

insert into public.tracks(id,item_id,number,title,duration_seconds,audio_url) values
  ('a8300000-0000-0000-0000-000000000001','a8200000-0000-0000-0000-000000000001',1,'Native Performance Published Track',180,'https://example.test/native-performance-published.mp3'),
  ('a8300000-0000-0000-0000-000000000002','a8200000-0000-0000-0000-000000000002',1,'Native Performance Draft Track',180,'https://example.test/native-performance-draft.mp3');

insert into public.home_shelf_entries(shelf_key,position,item_id)
values('featured',1,'a8200000-0000-0000-0000-000000000001');

insert into public.profile_follows(follower_id,following_id)
values('a8100000-0000-0000-0000-000000000001','a8100000-0000-0000-0000-000000000002');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);

select lives_ok($$select public.get_home_landing_v1()$$,'anonymous users can load the bounded Home contract');
select ok(exists(
  select 1 from jsonb_array_elements(public.get_home_landing_v1()->'items') item
  where item->>'id'='a8200000-0000-0000-0000-000000000001'
),'Home includes the published featured fixture');
select ok(not exists(
  select 1 from jsonb_array_elements(public.get_home_landing_v1()->'items') item
  where item->>'id'='a8200000-0000-0000-0000-000000000002'
),'Home never exposes drafts');
select ok(jsonb_array_length(public.get_home_landing_v1()->'items')<=73,'Home payload is bounded across all visible shelves');
select ok((
  select item ? 'discovery'
    and item->'discovery' ? 'browseType'
    and item->'discovery' ? 'tags'
    and item->'discovery' ? 'capabilities'
  from jsonb_array_elements(public.get_home_landing_v1()->'items') item
  where item->>'id'='a8200000-0000-0000-0000-000000000001'
),'Home Items expose the native Codable discovery payload');
select ok(jsonb_array_length(public.get_home_landing_v1()->'new_creators')<=12,'Home returns at most twelve new creators');
select is(jsonb_array_length(public.get_home_landing_v1()->'followed_profile_ids'),0,'anonymous Home does not infer private follow identity');

select is(jsonb_array_length(public.browse_catalog_v1(query=>'Native Performance Published',"limit"=>1)->'items'),1,'Browse applies query and limit server-side');
select is(jsonb_array_length(public.browse_catalog_v1(query=>'Native Performance Draft')->'items'),0,'Browse returns published Items only');
select throws_ok($$select public.browse_catalog_v1(sort=>'unknown')$$,'22023','Unsupported Browse sort.','Browse rejects unknown sort values');
select ok(jsonb_array_length(public.browse_catalog_v1("limit"=>500)->'items')<=60,'Browse enforces the sixty-Item hard bound');
select ok(exists(
  select 1 from jsonb_array_elements(public.browse_catalog_v1(category=>'books')->'items') item
  where item->>'id'='a8200000-0000-0000-0000-000000000003'
),'Browse applies category filtering server-side');
select ok(not has_function_privilege('anon','public.catalog_item_public_payload_v1(uuid)','execute'),'anonymous callers cannot invoke the Item helper directly');
select ok(not has_function_privilege('anon','public.radio_track_public_payload_v1(uuid)','execute'),'anonymous callers cannot invoke the Radio helper directly');

select ok(exists(
  select 1 from jsonb_array_elements(public.list_radio_rotation_v1()->'tracks') track
  where track->>'id'='a8300000-0000-0000-0000-000000000001'
),'Radio rotation contains the playable published fixture');
select ok(not exists(
  select 1 from jsonb_array_elements(public.list_radio_rotation_v1()->'tracks') track
  where track->>'id'='a8300000-0000-0000-0000-000000000002'
),'Radio rotation excludes draft-parent tracks');
select ok(jsonb_array_length(public.list_radio_rotation_v1()->'tracks')<=500,'full Radio rotation has a hard bound');
select ok(public.get_radio_station_snapshot_v1()->'current_track' is not null,'station snapshot resolves a current playable track');
select ok(jsonb_array_length(public.get_radio_station_snapshot_v1()->'upcoming_queue')<=12,'station snapshot bounds its upcoming queue');
select ok((with first_call as (select public.list_radio_rotation_v1()->>'version' version)
  select (public.list_radio_rotation_v1(first_call.version)->>'unchanged')::boolean from first_call
),'Radio version revalidation reports an unchanged rotation');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a8100000-0000-0000-0000-000000000001',true);

select ok(public.get_home_landing_v1()->'followed_profile_ids' @> '["a8100000-0000-0000-0000-000000000002"]'::jsonb,'authenticated Home derives follows from auth.uid()');
select ok(exists(
  select 1 from jsonb_array_elements(public.browse_catalog_v1(creator=>'following')->'items') item
  where item->>'author_id'='a8100000-0000-0000-0000-000000000002'
),'Browse following derives identity from auth.uid()');
select is((select proconfig[1] from pg_proc where oid='public.get_home_landing_v1()'::regprocedure),'search_path=public','Home fixes its search_path');

select * from finish();
rollback;
