begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-0000-0000-000000000001','m16-member@example.test','{"username":"m16_member"}'),
 ('91000000-0000-0000-0000-000000000002','m16-creator@example.test','{"username":"m16_creator"}'),
 ('91000000-0000-0000-0000-000000000003','m16-other@example.test','{"username":"m16_other"}'),
 ('91000000-0000-0000-0000-000000000004','m16-admin@example.test','{"username":"m16_admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id in ('91000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000003');
update public.profiles set role='admin' where id='91000000-0000-0000-0000-000000000004';
insert into public.catalog_items(id,slug,title,creator,item_type,status,author_id,upcoming_release_at,upcoming_release_timezone)
values ('92000000-0000-0000-0000-000000000001','m16-release','M16 Release','M16 Creator','Single','published','91000000-0000-0000-0000-000000000002',now()+interval '10 days','America/Chicago');

set local role anon;
select throws_ok($$select public.save_creator_event(null,'{}')$$,'42501',null,'anonymous users cannot save events');
select throws_ok($$select public.set_creator_event_state(gen_random_uuid(),'cancelled')$$,'42501',null,'anonymous users cannot change event state');
select is((select count(*)::integer from public.calendar_feed(now(),now()+interval '30 days') where source_type='release'),1,'public feed exposes eligible published upcoming releases');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.save_creator_event(null,'{"title":"Member Event","short_description":"No creator access","format":"online","starts_at":"2026-11-01T15:00:00Z","timezone":"America/Chicago","online_url":"https://example.test/live"}')$$,'42501',null,'members cannot create events');
select throws_ok($$insert into public.creator_events(creator_id,title,short_description,format,starts_at,timezone,online_url) values('91000000-0000-0000-0000-000000000001','Direct','Direct insert denied','online',now()+interval '1 day','UTC','https://example.test')$$,'42501',null,'direct event inserts are revoked');

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.save_creator_event('93000000-0000-0000-0000-000000000001','{"title":"Chicago Event","short_description":"DST-safe creator event","format":"hybrid","starts_at":"2026-11-01T07:30:00Z","ends_at":"2026-11-01T09:00:00Z","timezone":"America/Chicago","venue_name":"44 Room","address_line1":"44 Main St","locality":"Chicago","country_code":"US","online_url":"https://example.test/live","info_url":"https://example.test/info"}')$$,'creator can save a valid hybrid event');
select is((select creator_id from public.creator_events where id='93000000-0000-0000-0000-000000000001'),'91000000-0000-0000-0000-000000000002'::uuid,'server assigns event ownership');
select is((select starts_at from public.creator_events where id='93000000-0000-0000-0000-000000000001'),'2026-11-01 07:30:00+00'::timestamptz,'UTC instant is preserved across the DST fallback boundary');
select throws_ok($$select public.save_creator_event(null,'{"title":"Unsafe","short_description":"Unsafe URL","format":"online","starts_at":"2026-11-02T15:00:00Z","timezone":"America/Chicago","online_url":"javascript:alert(1)"}')$$,'23514',null,'unsafe online URLs are rejected');
select throws_ok($$select public.save_creator_event(null,'{"title":"Bad Zone","short_description":"Bad timezone","format":"online","starts_at":"2026-11-02T15:00:00Z","timezone":"CST","online_url":"https://example.test"}')$$,'22023','Choose a valid IANA timezone.','timezone abbreviations are rejected');
select throws_ok($$select public.save_creator_event(null,'{"title":"Missing Venue","short_description":"Invalid format fields","format":"in_person","starts_at":"2026-11-02T15:00:00Z","timezone":"America/Chicago"}')$$,'23514',null,'in-person events require location fields');
select lives_ok($$select public.set_item_upcoming_release('92000000-0000-0000-0000-000000000001',now()+interval '20 days','America/Chicago')$$,'owner can set an informational Item release date');
select is((select status from public.catalog_items where id='92000000-0000-0000-0000-000000000001'),'published','release-date changes do not change publication state');

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.set_creator_event_state('93000000-0000-0000-0000-000000000001','cancelled')$$,'42501',null,'another creator cannot change a foreign event');
select throws_ok($$select public.set_item_upcoming_release('92000000-0000-0000-0000-000000000001',now()+interval '5 days','UTC')$$,'42501',null,'another creator cannot change a foreign Item release date');

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.moderate_creator_event('93000000-0000-0000-0000-000000000001','hidden','Policy review')$$,'admin can moderate creator events');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.creator_events where id='93000000-0000-0000-0000-000000000001'),0,'hidden events are not publicly readable');
select is((select count(*)::integer from public.calendar_feed('2026-11-01', '2026-11-03') where source_id='93000000-0000-0000-0000-000000000001'),0,'hidden events are excluded from the Calendar feed');

select * from finish();
rollback;
