begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users(id,email,raw_user_meta_data) values
  ('44000000-0000-4000-8000-000000000001','case-user@example.test','{"username":"Case_User","display_name":"Case User"}'),
  ('44000000-0000-4000-8000-000000000002','other-user@example.test','{"username":"Other_User","display_name":"Other User"}');

select is(
  (select username from public.profiles where id='44000000-0000-4000-8000-000000000001'),
  'Case_User',
  'new-account profile creation preserves chosen username capitalization'
);
select is(
  (select username_normalized from public.profiles where id='44000000-0000-4000-8000-000000000001'),
  'case_user',
  'the generated identity key is lowercase'
);
select is(
  (select id from public.profiles where username_normalized=lower('CASE_USER')),
  '44000000-0000-4000-8000-000000000001'::uuid,
  'case-insensitive exact lookup resolves the same profile'
);
select lives_ok(
  $$update public.profiles set username='CASE_User' where id='44000000-0000-4000-8000-000000000001'$$,
  'an existing user can change only the capitalization of their username'
);
select is(
  (select username from public.profiles where id='44000000-0000-4000-8000-000000000001'),
  'CASE_User',
  'profile edits retain the selected capitalization'
);
select throws_ok(
  $$insert into auth.users(id,email,raw_user_meta_data) values ('44000000-0000-4000-8000-000000000003','duplicate-case@example.test','{"username":"case_USER"}')$$,
  '23505', null,
  'registration cannot create a capitalization-only duplicate'
);
select throws_ok(
  $$update public.profiles set username='case_user' where id='44000000-0000-4000-8000-000000000002'$$,
  '23505', null,
  'profile editing cannot create a capitalization-only duplicate'
);
select throws_ok(
  $$update public.profiles set username='bad-name!' where id='44000000-0000-4000-8000-000000000002'$$,
  '23514', null,
  'the database rejects invalid username characters'
);

select * from finish();
rollback;
