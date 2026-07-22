begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users(id,email,raw_user_meta_data) values
 ('9a000000-0000-0000-0000-000000000001','sorting-member@example.test','{"username":"sorting_member","display_name":"Sorting Member","country_code":"US"}'),
 ('9a000000-0000-0000-0000-000000000002','sorting-admin@example.test','{"username":"sorting_admin","display_name":"Sorting Admin","country_code":"US"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='9a000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','9a000000-0000-0000-0000-000000000001',true);
select throws_ok($$select * from public.list_admin_content_sorted(null,null,null,'created',8,0)$$,'42501','Administrator access required.','members cannot use sorted Admin Content');

select set_config('request.jwt.claim.sub','9a000000-0000-0000-0000-000000000002',true);
select lives_ok($$select * from public.list_admin_content_sorted(null,null,null,'created',8,0)$$,'admins can sort by creation time');
select lives_ok($$select * from public.list_admin_content_sorted(null,null,null,'release_date',8,0)$$,'admins can sort by release date');
select throws_ok($$select * from public.list_admin_content_sorted(null,null,null,'unknown',8,0)$$,'22023','Invalid content sort.','unsupported sort values fail closed');

select * from finish();
rollback;
