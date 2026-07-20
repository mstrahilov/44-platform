begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public','creator_access_requests','Creator signup requests have a durable table');
select is((select count(*)::integer from public.creator_access_requests),0,'the migration does not backfill existing accounts');

insert into auth.users(id,email,raw_user_meta_data) values
  ('99100000-0000-0000-0000-000000000001','request-normal@example.test','{"username":"RequestNormal","display_name":"Normal Member","country_code":"US"}'),
  ('99100000-0000-0000-0000-000000000002','request-reject@example.test','{"username":"RequestReject","display_name":"Rejected Artist","country_code":"US","creator_account_requested":true}'),
  ('99100000-0000-0000-0000-000000000003','request-approve@example.test','{"username":"RequestApprove","display_name":"Approved Artist","country_code":"US","creator_account_requested":true}'),
  ('99100000-0000-0000-0000-000000000004','request-admin@example.test','{"username":"RequestAdmin","display_name":"Request Admin","country_code":"US"}');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='99100000-0000-0000-0000-000000000004';

select is((select role from public.profiles where id='99100000-0000-0000-0000-000000000001'),'member','ordinary signup begins as a member');
select is((select count(*)::integer from public.creator_access_requests where profile_id='99100000-0000-0000-0000-000000000001'),0,'ordinary signup does not create a Creator request');
select is((select role from public.profiles where id='99100000-0000-0000-0000-000000000002'),'member','Creator request signup still begins as a member');
select is((select status from public.creator_access_requests where profile_id='99100000-0000-0000-0000-000000000002'),'pending','checked signup creates one pending request');
select is((select count(*)::integer from public.email_outbox_events where event_key like 'admin-signup/%'),4,'every new signup queues one Admin notification');
select is((select payload->>'creatorRequested' from public.email_outbox_events where event_key='admin-signup/99100000-0000-0000-0000-000000000002'),'true','Creator intent is present in the Admin signup notification');
select is((select recipient_email from public.email_outbox_events where event_key='admin-signup/99100000-0000-0000-0000-000000000001'),'support@44os.com','signup notifications use the monitored Support mailbox');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select * from public.creator_access_requests$$,'42501',null,'anonymous visitors cannot read Creator requests');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','99100000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from public.creator_access_requests),1,'a member can see only their own Creator request');
select throws_ok($$select public.review_creator_access_request('99100000-0000-0000-0000-000000000002','approved','Unsafe self approval')$$,'42501','Administrator access required.','members cannot approve their own Creator request');

select set_config('request.jwt.claim.sub','99100000-0000-0000-0000-000000000004',true);
select is((select total_count from public.list_admin_people(null,'creator_request',8,0) limit 1),2::bigint,'Admin People exposes the pending Creator queue');
select is((public.get_admin_person_detail('99100000-0000-0000-0000-000000000002')->'creator_request'->>'status'),'pending','Admin person detail includes request state');
select is(public.review_creator_access_request('99100000-0000-0000-0000-000000000002','rejected','Publishing request not approved.'),'rejected','Admin can reject a pending request');
select is((select role from public.profiles where id='99100000-0000-0000-0000-000000000002'),'member','rejection leaves the account as a member');
select is(public.review_creator_access_request('99100000-0000-0000-0000-000000000003','approved','Publishing request approved.'),'approved','Admin can approve a pending request');
select is((select role from public.profiles where id='99100000-0000-0000-0000-000000000003'),'creator','approval promotes the existing member account');
select is((select count(*)::integer from public.admin_profile_role_events where profile_id='99100000-0000-0000-0000-000000000003'),1,'approval uses the existing audited role workflow');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,
  cover_url,status,author_id,experience_type,fulfillment_type,release_date
)
select '99200000-0000-0000-0000-000000000001',category.id,'request-release','Request Release',
  'Approved Artist','single',0,true,false,'{}','https://example.test/request-release.jpg','published',
  '99100000-0000-0000-0000-000000000003','music','digital',date '2026-07-20'
from public.item_categories category where category.slug='music';
select is((select count(*)::integer from public.email_outbox_events where event_key='admin-release/99200000-0000-0000-0000-000000000001'),1,'first music publication queues one Admin release notification');
update public.catalog_items set title='Request Release Updated' where id='99200000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.email_outbox_events where event_key='admin-release/99200000-0000-0000-0000-000000000001'),1,'ordinary edits cannot duplicate the release notification');
select is((select recipient_email from public.email_outbox_events where event_key='admin-release/99200000-0000-0000-0000-000000000001'),'support@44os.com','release notifications use the monitored Support mailbox');

select * from finish();
rollback;
