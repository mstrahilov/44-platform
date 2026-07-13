begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000001', 'm13-member@example.test', '{"username":"m13_member","display_name":"M13 Member"}'),
  ('10000000-0000-0000-0000-000000000002', 'm13-creator@example.test', '{"username":"m13_creator","display_name":"M13 Creator"}'),
  ('10000000-0000-0000-0000-000000000003', 'm13-admin@example.test', '{"username":"m13_admin","display_name":"M13 Admin"}');

select set_config('request.jwt.claim.role', 'service_role', true);
update public.profiles set role='creator' where id='10000000-0000-0000-0000-000000000002';
update public.profiles set role='admin' where id='10000000-0000-0000-0000-000000000003';

insert into public.catalog_items (
  id, slug, title, creator, item_type, price_cents, is_free, featured, tags,
  status, author_id, experience_type, fulfillment_type
) values (
  '20000000-0000-0000-0000-000000000001', 'm13-security-item', 'Security Item',
  'M13 Creator', 'album', 500, false, false, '{}', 'published',
  '10000000-0000-0000-0000-000000000002', 'music', 'digital'
);

set local role anon;
select throws_ok(
  $$select public.update_owned_item('20000000-0000-0000-0000-000000000001', '{"price_cents":600}'::jsonb)$$,
  '42501', null,
  'anonymous accounts cannot execute the Studio edit RPC'
);
select throws_ok(
  $$select public.set_profile_role('10000000-0000-0000-0000-000000000001', 'creator')$$,
  '42501', null,
  'anonymous accounts cannot execute role assignment'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select ok(not public.is_approved_publisher(), 'regular members are not approved publishers');
select throws_ok(
  $$insert into public.catalog_items (id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type) values ('20000000-0000-0000-0000-000000000002','m13-member-item','No','No','album',0,true,false,'{}','draft','10000000-0000-0000-0000-000000000001','music','digital')$$,
  '42501', null,
  'regular members cannot create catalog Items'
);
select throws_ok(
  $$select public.update_owned_item('20000000-0000-0000-0000-000000000001', '{"price_cents":700}'::jsonb)$$,
  '42501', 'Item not found or not editable by this account.',
  'members cannot edit another creator Item'
);
select throws_ok(
  $$update public.profiles set role='creator' where id='10000000-0000-0000-0000-000000000001'$$,
  '42501', 'Profile roles are approval-managed.',
  'members cannot promote their own role'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select ok(public.is_approved_publisher(), 'approved creators pass the publishing role boundary');
select lives_ok(
  $$select public.update_owned_item('20000000-0000-0000-0000-000000000001', '{"price_cents":625}'::jsonb)$$,
  'creators can edit their existing published Item through the server RPC'
);
select is(
  (select price_cents from public.catalog_items where id='20000000-0000-0000-0000-000000000001'),
  625,
  'the creator price edit is persisted inside the transaction'
);
select is(
  (select status from public.catalog_items where id='20000000-0000-0000-0000-000000000001'),
  'published',
  'editing preserves the approved publication state'
);
select throws_ok(
  $$select public.update_owned_item('20000000-0000-0000-0000-000000000001', '{"status":"archived"}'::jsonb)$$,
  '22023', 'Unsupported Item field: status',
  'creators cannot smuggle lifecycle changes through the edit patch'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.set_profile_role('10000000-0000-0000-0000-000000000001', 'creator')$$,
  'admins can approve a creator role through the audited boundary'
);

select * from finish();
rollback;
