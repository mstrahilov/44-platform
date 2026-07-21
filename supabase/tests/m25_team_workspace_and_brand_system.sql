begin;
select plan(33);

select has_table('public','team_access_grants','Team grants have a current-state table');
select has_table('public','team_access_events','Team grants have immutable history');
select has_table('public','team_brand_kits','Brand Kit versions have a private registry');
select is((select public from storage.buckets where id='team-brand'),false,'Team Brand Kit storage is private');

insert into auth.users(id,email,raw_user_meta_data) values
  ('a2500000-0000-4000-8000-000000000001','team-admin@example.test','{"username":"TeamAdmin","display_name":"Team Admin"}'),
  ('a2500000-0000-4000-8000-000000000002','team-creator@example.test','{"username":"TeamCreator","display_name":"Team Creator"}'),
  ('a2500000-0000-4000-8000-000000000003','team-member@example.test','{"username":"TeamMember","display_name":"Team Member"}');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='a2500000-0000-4000-8000-000000000001';
update public.profiles set role='creator',creator_type='Musician' where id='a2500000-0000-4000-8000-000000000002';
insert into public.catalog_items(id,slug,title,creator,item_type,status,author_id,experience_type,release_date)
values
  ('a2510000-0000-4000-8000-000000000001','team-published','Team Published','Team Creator','Single','published','a2500000-0000-4000-8000-000000000002','music','2026-07-21'),
  ('a2510000-0000-4000-8000-000000000002','team-draft','Team Draft','Team Creator','Single','draft','a2500000-0000-4000-8000-000000000002','music','2026-07-21');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select ok(public.has_team_access(),'Administrators inherit Team access without a grant');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select public.has_team_access()$$,'42501',null,'Anonymous visitors cannot call the private Team access function');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000003',true);
select throws_ok($$select * from public.list_team_creators()$$,'42501',null,'Unauthorized members cannot list Team Creators');
select throws_ok($$select * from public.list_team_releases()$$,'42501',null,'Unauthorized members cannot list Team releases');
select throws_ok($$select * from public.team_access_grants$$,'42501',null,'Authenticated accounts cannot read Team grant rows directly');
select throws_ok($$select public.set_admin_team_access('a2500000-0000-4000-8000-000000000002',true,'Unauthorized attempt')$$,'42501',null,'Non-Admins cannot change Team access');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.set_admin_team_access('a2500000-0000-4000-8000-000000000002',true,'Marketing and brand responsibilities')$$,'Admin can grant Team access with an audit reason');
select is((select role from public.profiles where id='a2500000-0000-4000-8000-000000000002'),'creator','Team access does not change the Creator role');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000002',true);
select ok(public.has_team_access(),'Granted Creator receives Team access');
select is((public.get_my_team_access()->>'source'),'grant','Granted Creator access reports its audited source');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*)::integer from public.team_access_events where profile_id='a2500000-0000-4000-8000-000000000002'),1,'Grant creates one immutable Team event');
select is((select count(*)::integer from public.email_outbox_events where template_key='team_access_granted' and recipient_user_id='a2500000-0000-4000-8000-000000000002'),1,'Grant queues one idempotent transactional email');
select is((select count(*)::integer from public.achievement_events where event_type='team_access_granted' and user_id='a2500000-0000-4000-8000-000000000002'),1,'Grant queues one in-app notification');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.list_team_creators(null,null,'joined_desc',24,0) where profile_id='a2500000-0000-4000-8000-000000000002'),1,'Authorized Team Creator directory contains published Creator facts');
select is((select count(*)::integer from public.list_team_releases(null,null,null,'added_desc',24,0) where item_id='a2510000-0000-4000-8000-000000000001'),1,'Authorized Team release directory contains the published Item');
select is((select count(*)::integer from public.list_team_releases(null,null,null,'added_desc',24,0) where item_id='a2510000-0000-4000-8000-000000000002'),0,'Team release directory never exposes drafts');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.set_admin_team_access('a2500000-0000-4000-8000-000000000002',true,'Duplicate grant is not a new decision')$$,'55000',null,'Duplicate Team state cannot create duplicate notifications');
select lives_ok($$select public.set_admin_team_access('a2500000-0000-4000-8000-000000000002',false,'Responsibilities have concluded')$$,'Admin can revoke Team access with an audit reason');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000002',true);
select is(public.has_team_access(),false,'Revocation terminates Team access immediately');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*)::integer from public.email_outbox_events where template_key='team_access_granted' and recipient_user_id='a2500000-0000-4000-8000-000000000002'),1,'Revocation does not queue a second or revocation email');
select is((select count(*)::integer from public.team_access_events where profile_id='a2500000-0000-4000-8000-000000000002'),2,'Grant and revoke decisions are both retained');
select throws_ok($$update public.team_access_events set reason='changed' where profile_id='a2500000-0000-4000-8000-000000000002'$$,'42501',null,'Team audit events cannot be updated even by service operations');
select throws_ok($$delete from public.team_access_events where profile_id='a2500000-0000-4000-8000-000000000002'$$,'42501',null,'Team audit events cannot be deleted even by service operations');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select ok(public.has_team_access(),'Admin Team access remains inherited without a grant row');
select is((public.get_my_team_access()->>'source'),'admin','Admin access state reports inheritance');
select lives_ok($$select public.set_admin_team_access('a2500000-0000-4000-8000-000000000003',true,'Internal editorial reference access')$$,'Admin can grant Team access to a Member');
select is((select role from public.profiles where id='a2500000-0000-4000-8000-000000000003'),'member','Team access does not change the Member role');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000003',true);
select ok(public.has_team_access(),'Granted Member receives Team access');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.set_admin_team_access('a2500000-0000-4000-8000-000000000001',false,'Attempt to weaken inherited access')$$,'22023',null,'Admin inherited access cannot be weakened by a Team grant row');

select * from finish();
rollback;
