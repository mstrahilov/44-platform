begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users(id,email,raw_user_meta_data) values
 ('d3000000-0000-0000-0000-000000000001','m13-ops-creator@example.test','{"username":"m13_ops_creator","display_name":"Ops Creator"}'),
 ('d3000000-0000-0000-0000-000000000002','m13-ops-admin@example.test','{"username":"m13_ops_admin","display_name":"Ops Admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='d3000000-0000-0000-0000-000000000001';
update public.profiles set role='admin' where id='d3000000-0000-0000-0000-000000000002';
insert into public.catalog_items(id,slug,title,creator,item_type,status,author_id,experience_type)
values ('d4000000-0000-0000-0000-000000000001','m13-ops-item','Operations Item','Ops Creator','album','draft','d3000000-0000-0000-0000-000000000001','music');

set local role anon;
select throws_ok($$select * from public.list_admin_submission_queue()$$,'42501',null,'anonymous users cannot read the admin submission queue');
select throws_ok($$select * from public.list_admin_error_events()$$,'42501',null,'anonymous users cannot read operational errors');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','d3000000-0000-0000-0000-000000000001',true);
select throws_ok($$select * from public.list_admin_submission_queue()$$,'42501',null,'creators cannot read the admin submission queue');
select throws_ok($$select * from public.list_admin_error_events()$$,'42501',null,'creators cannot read operational errors');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.record_sanitized_error_event(now(),'release-test','nodejs','GET','/ops-test','Error','digest-test','E_TEST','Safe failure','{"route":"ops-test","user":"removed"}');
insert into public.item_submissions(id,item_id,submitter_id,submission_kind,policy_version,idempotency_key)
values ('d5000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','create','test','ops-key');
insert into public.item_submission_items(submission_id,item_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,author_id,market_mode,available_locally_only,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled)
values ('d5000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','m13-ops-item','Operations Item','Ops Creator','album',0,true,false,'{}','d3000000-0000-0000-0000-000000000001','global',false,'music','digital',false,false);
insert into public.item_submission_notification_events(submission_id,recipient_id,event_type,payload)
values ('d5000000-0000-0000-0000-000000000001',null,'submitted','{"item_id":"d4000000-0000-0000-0000-000000000001"}');
select throws_ok($$select * from public.claim_item_submission_notification_events()$$,'55000',null,'notification adapter is disabled by default');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','d3000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.list_admin_submission_queue()),1::bigint,'admin can list the bounded submission queue');
select is((select (public.get_admin_submission_detail('d5000000-0000-0000-0000-000000000001')->'submission'->>'status')),'pending','admin detail includes the submission state');
select is((select count(*) from public.list_admin_error_events()),1::bigint,'admin can query sanitized error events');
select is((select safe_message from public.list_admin_error_events() limit 1),'Safe failure','error lookup exposes only the sanitized message');
select is((select framework_context ? 'user' from public.list_admin_error_events() limit 1),false,'sanitized error context excludes user fields');

select * from finish();
rollback;
