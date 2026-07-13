begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(id,email,raw_user_meta_data) values
 ('a1000000-0000-0000-0000-000000000001','m17-member@example.test','{"username":"m17_member"}'),
 ('a1000000-0000-0000-0000-000000000002','m17-creator@example.test','{"username":"m17_creator"}'),
 ('a1000000-0000-0000-0000-000000000003','m17-other@example.test','{"username":"m17_other"}'),
 ('a1000000-0000-0000-0000-000000000004','m17-admin@example.test','{"username":"m17_admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id in ('a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003');
update public.profiles set role='admin' where id='a1000000-0000-0000-0000-000000000004';
insert into public.catalog_items(id,slug,title,creator,item_type,status,author_id,experience_type)
values ('a2000000-0000-0000-0000-000000000001','m17-unity','M17 Unity','M17 Creator','Interactive','published','a1000000-0000-0000-0000-000000000002','game');
insert into public.item_achievements(id,item_id,code,title,description,trigger_type,sort_order)
values ('a3000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','unity_first_step','First Step','Complete the first trusted step.','interactive_signed',1);
insert into public.entitlements(id,user_id,item_id,entitlement_type,status,source_type,granted_at)
values ('a4000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','library_access','active','manual_grant',now());

set local role anon;
select throws_ok($$select * from public.begin_interactive_launch('a2000000-0000-0000-0000-000000000001','{}')$$,'42501',null,'anonymous users cannot begin tracked launches');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.save_interactive_build('a2000000-0000-0000-0000-000000000001','{"build_version":"launch-1","status":"ready","entry_url":"https://interactive.44os.com/m17/index.html","requires_cross_origin_isolation":true}')$$,'creator can save an owned build manifest');
select is((select status from public.interactive_builds where item_id='a2000000-0000-0000-0000-000000000001'),'inactive','creator cannot self-approve a build');
select lives_ok($$select public.save_interactive_event_definition('a2000000-0000-0000-0000-000000000001','{"event_key":"chapter.progress","event_kind":"progress","max_per_session":4}')$$,'creator can define bounded progress events');
select lives_ok($$select public.save_interactive_event_definition('a2000000-0000-0000-0000-000000000001','{"event_key":"first.step","event_kind":"achievement","achievement_id":"a3000000-0000-0000-0000-000000000001","max_per_session":1}')$$,'creator can map an owned Item achievement');
select is((select count(*)::integer from public.interactive_event_definitions where item_id='a2000000-0000-0000-0000-000000000001' and is_enabled),0,'creator definitions remain disabled pending review');
select throws_ok($$update public.interactive_builds set status='ready' where item_id='a2000000-0000-0000-0000-000000000001'$$,'42501',null,'direct creator build writes are denied');

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.save_interactive_build('a2000000-0000-0000-0000-000000000001','{"build_version":"stolen"}')$$,'42501','Item management required','another creator cannot manage a foreign build');

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.save_interactive_build('a2000000-0000-0000-0000-000000000001','{"build_version":"launch-1","status":"ready","entry_url":"https://interactive.44os.com.evil.test/index.html"}')$$,'23514','Interactive entry URL must use an approved isolated origin.','admin cannot approve a lookalike origin');
select lives_ok($$select public.save_interactive_build('a2000000-0000-0000-0000-000000000001','{"build_version":"launch-1","status":"ready","entry_url":"https://interactive.44os.com/m17/index.html","requires_cross_origin_isolation":true}')$$,'admin can approve an isolated-origin build');
select lives_ok($$select public.save_interactive_event_definition('a2000000-0000-0000-0000-000000000001','{"event_key":"chapter.progress","event_kind":"progress","max_per_session":4,"is_enabled":true}')$$,'admin can approve a progress definition');
select lives_ok($$select public.save_interactive_event_definition('a2000000-0000-0000-0000-000000000001','{"event_key":"first.step","event_kind":"achievement","achievement_id":"a3000000-0000-0000-0000-000000000001","max_per_session":1,"is_enabled":true}')$$,'admin can approve an achievement definition');

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000003',true);
select throws_ok($$select * from public.begin_interactive_launch('a2000000-0000-0000-0000-000000000001','{}')$$,'42501','Library access required','a non-owner without entitlement cannot launch');

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000001',true);
create temp table m17_launch as select * from public.begin_interactive_launch('a2000000-0000-0000-0000-000000000001','{"browser":"chrome","webgl2":true}');
grant select on m17_launch to service_role;
select is((select count(*)::integer from m17_launch),1,'entitled member receives one launch session');
select throws_ok(format(
  $$select public.record_interactive_progress(%L,%L,1,'first.step','{}')$$,
  (select session_id from m17_launch),(select session_token from m17_launch)
),'22023','unknown progress event','client progress cannot invoke an achievement definition');
select lives_ok(format(
  $$select public.record_interactive_progress(%L,%L,1,'chapter.progress','{"percent":25}')$$,
  (select session_id from m17_launch),(select session_token from m17_launch)
),'client may append bounded ordinary progress');
select is((select trust_level from public.interactive_progress_state where user_id='a1000000-0000-0000-0000-000000000001'),'client','browser progress is explicitly untrusted');
select throws_ok($$insert into public.interactive_events(session_id,user_id,item_id,definition_id,sequence_number,event_key,event_kind,trust_level,payload,occurred_at) select session_id,'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001',(select id from public.interactive_event_definitions where event_key='chapter.progress'),2,'chapter.progress','progress','client','{}',now() from m17_launch$$,'42501',null,'direct event insertion is denied');
select throws_ok(format(
  $$select * from public.record_trusted_interactive_event('a5000000-0000-0000-0000-000000000001','nonce_1234567890123456','launch-v1',repeat('a',64),%L,'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','chapter.progress','{}',now())$$,
  (select session_id from m17_launch)
),'42501',null,'authenticated clients cannot invoke trusted ingestion');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select lives_ok(format(
  $$select * from public.record_trusted_interactive_event('a5000000-0000-0000-0000-000000000001','nonce_1234567890123456','launch-v1',repeat('a',64),%L,'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','chapter.progress','{"percent":50}',now())$$,
  (select session_id from m17_launch)
),'service role records a server-verified progress event');
select is((select trust_level from public.interactive_progress_state where user_id='a1000000-0000-0000-0000-000000000001'),'signed','signed progress supersedes client progress');
select throws_ok(format(
  $$select * from public.record_trusted_interactive_event('a5000000-0000-0000-0000-000000000002','nonce_1234567890123456','launch-v1',repeat('b',64),%L,'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','chapter.progress','{}',now())$$,
  (select session_id from m17_launch)
),'23505',null,'reused signing nonce is rejected');
select lives_ok(format(
  $$select * from public.record_trusted_interactive_event('a5000000-0000-0000-0000-000000000003','nonce_abcdefghijklmnop','launch-v1',repeat('c',64),%L,'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','first.step','{"complete":true}',now())$$,
  (select session_id from m17_launch)
),'signed achievement event is accepted once');
select ok(exists(select 1 from public.user_achievements where user_id='a1000000-0000-0000-0000-000000000001' and achievement_id='a3000000-0000-0000-0000-000000000001'),'signed event issues the mapped achievement');
select throws_ok(format(
  $$select * from public.record_trusted_interactive_event('a5000000-0000-0000-0000-000000000003','nonce_unique_abcdefghijkl','launch-v1',repeat('d',64),%L,'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','chapter.progress','{}',now())$$,
  (select session_id from m17_launch)
),'23505',null,'reused external event ID is rejected');

select * from finish();
rollback;
