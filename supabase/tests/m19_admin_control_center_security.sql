begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-0000-0000-000000000001','admin-member@example.test','{"username":"admin_member","display_name":"Admin Member","country_code":"US"}'),
 ('91000000-0000-0000-0000-000000000002','admin-creator@example.test','{"username":"admin_creator","display_name":"Admin Creator","country_code":"US"}'),
 ('91000000-0000-0000-0000-000000000003','admin-operator@example.test','{"username":"admin_operator","display_name":"Admin Operator","country_code":"US"}'),
 ('91000000-0000-0000-0000-000000000004','admin-missing@example.test','{"username":"admin_missing","display_name":"Missing Profile","country_code":"US"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='91000000-0000-0000-0000-000000000002';
update public.profiles set role='admin' where id='91000000-0000-0000-0000-000000000003';
insert into public.creator_payout_country_routes(
  country_code,target_currency,status,business_to_individual_confirmed,email_claim_confirmed,
  evidence_reference,verified_at,verified_by,revalidate_after
) values(
  'US','USD','verified',true,true,'Synthetic Admin test Wise route',now(),
  '91000000-0000-0000-0000-000000000003',now()+interval '90 days'
);
delete from public.profiles where id='91000000-0000-0000-0000-000000000004';
insert into public.item_types(id,category_id,slug,label,sort_order,is_active)
select '91500000-0000-0000-0000-000000000001',id,'admin-album','Album',10,true from public.item_categories where slug='music';

insert into public.catalog_items(id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,cover_url,status,author_id,experience_type,fulfillment_type)
select fixture.item_id,category.id,fixture.slug,fixture.title,'Admin Creator','album',fixture.price_cents,fixture.is_free,false,'{}',fixture.cover_url,fixture.status,'91000000-0000-0000-0000-000000000002','music','digital'
from public.item_categories category cross join (values
 ('92000000-0000-0000-0000-000000000001'::uuid,'admin-valid-draft','Admin Valid Draft',0,true,'https://example.test/valid.jpg','draft'),
 ('92000000-0000-0000-0000-000000000002'::uuid,'admin-invalid-draft','Admin Invalid Draft',0,true,null,'draft'),
 ('92000000-0000-0000-0000-000000000003'::uuid,'admin-unpublish','Admin Unpublish',500,false,'https://example.test/unpublish.jpg','published'),
 ('92000000-0000-0000-0000-000000000004'::uuid,'admin-purchased','Admin Purchased',900,false,'https://example.test/purchased.jpg','published'),
 ('92000000-0000-0000-0000-000000000005'::uuid,'admin-pending','Admin Pending',0,true,'https://example.test/pending.jpg','draft')
) fixture(item_id,slug,title,price_cents,is_free,cover_url,status)
where category.slug='music';

insert into public.item_type_assignments(item_id,item_type_id)
select item.id,item_type.id from public.catalog_items item
join public.item_categories category on category.id=item.item_category_id
join lateral (select id from public.item_types where category_id=category.id and slug='admin-album') item_type on true
where item.id in ('92000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000003','92000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000005');
insert into public.tracks(id,item_id,number,title,duration_seconds,audio_url) values
 ('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001',1,'Valid',120,'https://example.test/valid.mp3'),
 ('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000002',1,'Invalid',120,'https://example.test/invalid.mp3'),
 ('93000000-0000-0000-0000-000000000003','92000000-0000-0000-0000-000000000003',1,'Unpublish',120,'https://example.test/unpublish.mp3'),
 ('93000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000004',1,'Purchased',120,'https://example.test/purchased.mp3'),
 ('93000000-0000-0000-0000-000000000005','92000000-0000-0000-0000-000000000005',1,'Pending',120,'https://example.test/pending.mp3');
insert into public.item_assets(id,item_id,asset_type,title,storage_path,is_downloadable,sort_order)
values('94000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','music','Private master','private/admin/master.wav',true,1);
insert into public.catalog_offers(id,item_id,code,offer_type,title,price_cents,currency,status,fulfillment_type) values
 ('95000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000003','admin-unpublish-offer','digital_download','Unpublish offer',500,'USD','active','entitlement'),
 ('95000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000004','admin-purchased-offer','digital_download','Purchased offer',900,'USD','active','entitlement');
insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type)
values('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000004','library_access','active','admin');
select public.record_sanitized_error_event(now(),'admin-test-release','nodejs','GET','/admin/test','AdminTestError','admin-test-digest','ADMIN_TEST','Safe admin test message','{"component":"admin"}'::jsonb);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select * from public.list_admin_people(null,null,8,0)$$,'42501',null,'anonymous users cannot list accounts or emails');
select throws_ok($$select * from public.list_admin_content(null,null,null,8,0)$$,'42501',null,'anonymous users cannot list private content states');
select throws_ok($$select * from public.list_admin_error_events_page(null,null,null,8,0)$$,'42501',null,'anonymous users cannot read operational events');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
select throws_ok($$select * from public.list_admin_people(null,null,8,0)$$,'42501','Administrator access required.','members cannot list accounts or emails');
select throws_ok($$select * from public.list_admin_content(null,null,null,8,0)$$,'42501','Administrator access required.','members cannot list private content states');
select throws_ok($$select public.set_admin_creator_access('91000000-0000-0000-0000-000000000001','creator','self promotion')$$,'42501','Administrator access required.','members cannot promote themselves');
select is((select count(*)::integer from public.admin_profile_role_events),0,'members cannot read administrator role audits');

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true);
select ok((select total_count>=4 from public.list_admin_people(null,null,2,0) limit 1),'admin people pagination returns the full total');
select is((select email from public.list_admin_people('admin-member',null,8,0) limit 1),'admin-member@example.test','admins can find an allow-listed account email');
select ok(position('encrypted_password' in public.get_admin_person_detail('91000000-0000-0000-0000-000000000001')::text)=0,'person detail never returns password fields');
select lives_ok($$select public.set_admin_creator_access('91000000-0000-0000-0000-000000000001','creator','Approved creator tester')$$,'admins can promote members');
select is((select role from public.profiles where id='91000000-0000-0000-0000-000000000001'),'creator','promotion changes creator access');
select is((select count(*)::integer from public.admin_profile_role_events where profile_id='91000000-0000-0000-0000-000000000001'),1,'promotion records immutable history');
select lives_ok($$select public.set_admin_creator_access('91000000-0000-0000-0000-000000000001','member','Testing period complete')$$,'admins can return creators to members');
select is((select role from public.profiles where id='91000000-0000-0000-0000-000000000001'),'member','demotion removes creator access');
select throws_ok($$select public.set_admin_creator_access('91000000-0000-0000-0000-000000000001','creator','x')$$,'22023','A reason between 3 and 500 characters is required.','role changes require a bounded reason');
select throws_ok($$select public.set_admin_creator_access('91000000-0000-0000-0000-000000000003','creator','unsafe admin demotion')$$,'42501','Administrator roles cannot be changed from this control.','web control cannot change administrator roles');
select lives_ok($$select public.set_admin_creator_access('91000000-0000-0000-0000-000000000004','creator','Repair and approve tester')$$,'promotion repairs a missing profile atomically');
select is((select role from public.profiles where id='91000000-0000-0000-0000-000000000004'),'creator','repaired profile receives creator access');
select throws_ok($$update public.admin_profile_role_events set reason='changed' where profile_id='91000000-0000-0000-0000-000000000001'$$,'42501',null,'role history cannot be rewritten');

select ok((select total_count>=5 from public.list_admin_content(null,null,null,2,0) limit 1),'content pagination returns every Item total');
select ok((select count(*)>=5 from public.list_admin_content(null,null,'music',8,0)),'content type filtering uses the canonical experience');
select ok(position('private/admin/master.wav' in public.get_admin_content_detail('92000000-0000-0000-0000-000000000001')::text)=0,'content detail exposes file presence without private paths');
select is((select public.set_admin_item_lifecycle('92000000-0000-0000-0000-000000000001','publish','Approved complete test Item')),'published','healthy drafts can be published');
select is((select status from public.catalog_items where id='92000000-0000-0000-0000-000000000001'),'published','publication persists the status transition');
select throws_ok($$select public.set_admin_item_lifecycle('92000000-0000-0000-0000-000000000002','publish','Attempt invalid publication')$$,'23514',null,'unhealthy drafts cannot be published');
select is((select public.set_admin_item_lifecycle('92000000-0000-0000-0000-000000000003','unpublish','Return test release to draft')),'draft','unentitled published content can be unpublished');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.catalog_offers where id='95000000-0000-0000-0000-000000000001'),0,'active offers are hidden when the parent Item is not published');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.set_admin_item_lifecycle('92000000-0000-0000-0000-000000000004','unpublish','Unsafe buyer access change')$$,'55000','Content with purchases or active access must be archived to preserve buyer access.','entitled content cannot be unpublished');
select is((select public.set_admin_item_lifecycle('92000000-0000-0000-0000-000000000004','archive','Retire purchased test release')),'archived','entitled content can be archived safely');
select is((select status from public.catalog_offers where id='95000000-0000-0000-0000-000000000002'),'archived','archival closes active offers');
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
select is((select status from public.entitlements where item_id='92000000-0000-0000-0000-000000000004' and user_id='91000000-0000-0000-0000-000000000001'),'active','archival preserves historical buyer access');
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.publishing_runtime_controls set phase='review_required',review_required=true,updated_at=now() where singleton;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000002',true);
select public.submit_item_for_review('92000000-0000-0000-0000-000000000005','admin-pending-key','admin-control-test');
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.set_admin_item_lifecycle('92000000-0000-0000-0000-000000000005','publish','Bypass pending review')$$,'55000','Resolve the pending review before changing publication state.','pending reviews block lifecycle changes');
select lives_ok($$select public.decide_item_submission((select id from public.item_submissions where idempotency_key='admin-pending-key'),'rejected','Incomplete test submission')$$,'admins can reject pending submissions');
select throws_ok($$select public.decide_item_submission((select id from public.item_submissions where idempotency_key='admin-pending-key'),'rejected','duplicate')$$,'55000',null,'submission decisions cannot be replayed');
select is((select count(*)::integer from public.admin_item_lifecycle_events),3,'publish, unpublish, and archive actions are audited');
select throws_ok($$delete from public.admin_item_lifecycle_events where item_id='92000000-0000-0000-0000-000000000004'$$,'42501',null,'lifecycle history cannot be deleted');
select is((select total_count from public.list_admin_error_events_page(null,'/admin/test',null,8,0) limit 1),1::bigint,'admin error paging returns the filtered total');
select is((select safe_message from public.list_admin_error_events_page(null,'/admin/test',null,8,0) limit 1),'Safe admin test message','admin error results contain only the sanitized message');
select is((public.get_admin_dashboard_summary()->'payments'->>'label'),'Off','dashboard translates fail-closed payment state into plain language');

select * from finish();
rollback;
