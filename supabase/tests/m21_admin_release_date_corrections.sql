begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users(id,email,raw_user_meta_data) values
  ('98900000-0000-0000-0000-000000000001','date-member@example.test','{"username":"date_member"}'),
  ('98900000-0000-0000-0000-000000000002','date-admin@example.test','{"username":"date_admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='98900000-0000-0000-0000-000000000002';

insert into public.catalog_items(id,slug,title,creator,item_type,status,experience_type,fulfillment_type,release_date,year)
values
  ('98910000-0000-0000-0000-000000000001','date-music','Date Music','Date Creator','Album','draft','music','digital','2020-01-01',2020),
  ('98910000-0000-0000-0000-000000000002','date-book','Date Book','Date Creator','Book','draft','book','digital',null,null);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','98900000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.get_admin_item_release_date('98910000-0000-0000-0000-000000000001')$$,
  '42501','Administrator access required.','members cannot read the Admin correction value'
);

select set_config('request.jwt.claim.sub','98900000-0000-0000-0000-000000000002',true);
select is(public.get_admin_item_release_date('98910000-0000-0000-0000-000000000001'),date '2020-01-01','Admin reads the current Release Date');
select lives_ok(
  $$select public.set_admin_item_release_date('98910000-0000-0000-0000-000000000001','2019-08-23','Corrected from the creator Spotify catalog')$$,
  'Admin can correct a Music Release Date'
);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select release_date from public.catalog_items where id='98910000-0000-0000-0000-000000000001'),date '2019-08-23','the corrected Release Date is stored');
select is((select year from public.catalog_items where id='98910000-0000-0000-0000-000000000001'),2019,'the display year stays synchronized');
select is((select previous_release_date from public.admin_item_release_date_events where item_id='98910000-0000-0000-0000-000000000001'),date '2020-01-01','audit records the previous date');
select is((select new_release_date from public.admin_item_release_date_events where item_id='98910000-0000-0000-0000-000000000001'),date '2019-08-23','audit records the corrected date');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','98900000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.set_admin_item_release_date('98910000-0000-0000-0000-000000000001','2019-08-24','x')$$,
  '22023','A reason between 3 and 500 characters is required.','corrections require a bounded reason'
);
select throws_ok(
  $$select public.set_admin_item_release_date('98910000-0000-0000-0000-000000000002','2019-08-24','Not a Music release')$$,
  '22023','Release Date corrections are limited to Music.','the correction control cannot mutate non-Music Items'
);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok(
  $$update public.admin_item_release_date_events set reason='rewritten' where item_id='98910000-0000-0000-0000-000000000001'$$,
  '55000',null,'Release Date audit history is immutable'
);

select * from finish();
rollback;
