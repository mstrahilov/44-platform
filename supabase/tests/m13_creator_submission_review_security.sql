begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

insert into auth.users (id,email,raw_user_meta_data) values
 ('30000000-0000-0000-0000-000000000001','m13-review-member@example.test','{"username":"m13_review_member"}'),
 ('30000000-0000-0000-0000-000000000002','m13-review-creator@example.test','{"username":"m13_review_creator"}'),
 ('30000000-0000-0000-0000-000000000003','m13-review-foreign@example.test','{"username":"m13_review_foreign"}'),
 ('30000000-0000-0000-0000-000000000004','m13-review-admin@example.test','{"username":"m13_review_admin"}');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='30000000-0000-0000-0000-000000000002';
update public.profiles set role='admin' where id='30000000-0000-0000-0000-000000000004';
insert into public.item_categories(id,slug,name,sort_order) values ('60000000-0000-0000-0000-000000000001','m13-test-category','M13 Test Category',999);
insert into public.item_types(id,category_id,label,slug,sort_order,is_active) values ('60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','M13 Test Type','m13-test-type',999,true);
insert into public.item_tags(id,category_id,label,slug,sort_order,is_active) values ('60000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000001','M13 Test Tag','m13-test-tag',999,true);
insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type)
values ('40000000-0000-0000-0000-000000000001','m13-review-item','Approved title','Creator','album',0,true,false,'{}','published','30000000-0000-0000-0000-000000000002','music','digital');
insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type)
values ('40000000-0000-0000-0000-000000000002','m13-review-item-two','Second approved title','Creator','album',0,true,false,'{}','published','30000000-0000-0000-0000-000000000002','music','digital');
insert into public.tracks(id,item_id,number,title,audio_url) values ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',1,'Protected Track','https://cdn.example.test/track.mp3');
insert into public.item_assets(id,item_id,asset_type,title,storage_path,is_downloadable) values ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','book','Protected Asset','m13-review/private.pdf',true);
insert into public.catalog_offers(id,item_id,code,offer_type,title,status,fulfillment_type) values ('50000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001','m13-offer','library_access','Review Access','active','entitlement');
insert into public.offer_entitlements(offer_id,entitlement_type) values ('50000000-0000-0000-0000-000000000003','library_access');
insert into public.item_type_assignments(item_id,item_type_id) values ('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002');
insert into public.item_tag_assignments(item_id,item_tag_id) values ('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003');
insert into public.item_capabilities(item_id,capability_key,config_version,is_enabled) values ('40000000-0000-0000-0000-000000000001','downloads',1,true) on conflict (item_id,capability_key) do update set is_enabled=true;
insert into public.item_members(item_id,profile_id,member_role) values ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','owner');
insert into public.item_external_links(item_id,platform,label,url,sort_order) values ('40000000-0000-0000-0000-000000000001','spotify','Spotify','https://open.spotify.com/album/m13',1);
insert into public.item_achievements(id,item_id,code,title,trigger_type,sort_order,is_secret,points) select '50000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001','m13-achievement','Review Achievement','manual',1,false,0;

update public.publishing_runtime_controls set phase='review_required',review_required=true,updated_at=now() where singleton;
set local role anon;
select throws_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','anon-key')$$,'42501',null,'anonymous users cannot submit');
select throws_ok($$select public.decide_item_submission('00000000-0000-0000-0000-000000000001','approved','x')$$,'42501',null,'anonymous users cannot decide');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','member-key')$$,'42501',null,'members cannot submit');

select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','foreign-key')$$,'42501',null,'foreign creators cannot submit');

select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.update_owned_item('40000000-0000-0000-0000-000000000001','{"title":"bypass"}'::jsonb)$$,'55000',null,'trusted edit RPCs cannot bypass an active review gate');
select lives_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','retry-key')$$,'owner can submit a revision');
select is((select count(*) from public.item_submissions where item_id='40000000-0000-0000-0000-000000000001' and status='pending'),1::bigint,'one pending submission exists');
set local role service_role;
select is((select count(*) from public.item_submission_notification_events where event_type='submitted'),1::bigint,'submission creates one dormant admin notification event');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select is((select count(*) from public.item_submission_tracks where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')),1::bigint,'track proposal is snapshotted');
select is((select count(*) from public.item_submission_assets where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')),1::bigint,'protected asset proposal is snapshotted');
select ok((select count(*) from public.item_submission_offers where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')) > 0,'offer proposal is snapshotted');
select is((select count(*) from public.item_submission_type_assignments where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')),1::bigint,'taxonomy type proposal is snapshotted');
select ok((select count(*) from public.item_submission_capabilities where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')) > 0,'capability proposal is snapshotted');
select is((select count(*) from public.item_submission_members where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')),1::bigint,'collaborator proposal is snapshotted');
select is((select count(*) from public.item_submission_external_links where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')),1::bigint,'external-link proposal is snapshotted');
select is((select count(*) from public.item_submission_achievements where submission_id=(select id from public.item_submissions where idempotency_key='retry-key')),1::bigint,'achievement proposal is snapshotted');
select is((select title from public.catalog_items where id='40000000-0000-0000-0000-000000000001'),'Approved title','pending submission preserves approved title');
select is((select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','retry-key')), (select id from public.item_submissions where idempotency_key='retry-key'),'retry returns the original submission');
select throws_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','second-key')$$,'23505',null,'duplicate pending submission is rejected');
select lives_ok($$select public.withdraw_item_submission((select id from public.item_submissions where idempotency_key='retry-key'),'creator withdrew')$$,'owner can withdraw pending submission');
select is((select status from public.item_submissions where idempotency_key='retry-key'),'withdrawn','withdrawal is explicit and audited');

select lives_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000001','decision-key')$$,'owner can resubmit after withdrawal');
select lives_ok($$select public.add_item_submission_child_tombstone((select id from public.item_submissions where idempotency_key='decision-key'),'track','50000000-0000-0000-0000-000000000001','creator removed track')$$,'creator can propose a typed child removal');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.item_submission_items set title='Proposed title' where submission_id=(select id from public.item_submissions where idempotency_key='decision-key');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.decide_item_submission((select id from public.item_submissions where idempotency_key='decision-key'),'hold','invalid')$$,'22023',null,'invalid decision transitions are rejected');
select lives_ok($$select public.decide_item_submission((select id from public.item_submissions where idempotency_key='decision-key'),'approved','reviewed by 44')$$,'admin can approve atomically');
select is((select status from public.item_submissions where idempotency_key='decision-key'),'approved','approval is immutable in the decision record');
select is((select title from public.catalog_items where id='40000000-0000-0000-0000-000000000001'),'Proposed title','approval applies the proposed Item while preserving identity');
select is((select count(*) from public.tracks where item_id='40000000-0000-0000-0000-000000000001'),1::bigint,'track identity is preserved');
select is((select count(*) from public.item_assets where item_id='40000000-0000-0000-0000-000000000001'),1::bigint,'protected asset identity is preserved');
select is((select count(*) from public.catalog_offers where item_id='40000000-0000-0000-0000-000000000001' and id='50000000-0000-0000-0000-000000000003'),1::bigint,'offer identity is preserved');
select is((select count(*) from public.item_type_assignments where item_id='40000000-0000-0000-0000-000000000001'),1::bigint,'type assignment is preserved');
select is((select count(*) from public.item_capabilities where item_id='40000000-0000-0000-0000-000000000001' and capability_key='downloads'),1::bigint,'capability is preserved');
select is((select count(*) from public.item_members where item_id='40000000-0000-0000-0000-000000000001' and profile_id='30000000-0000-0000-0000-000000000002'),1::bigint,'collaborator identity is preserved');
select is((select count(*) from public.item_external_links where item_id='40000000-0000-0000-0000-000000000001' and platform='spotify'),1::bigint,'external link is preserved');
select is((select count(*) from public.item_achievements where item_id='40000000-0000-0000-0000-000000000001' and id='50000000-0000-0000-0000-000000000004'),1::bigint,'achievement identity is preserved');
select is((select count(*) from public.item_child_archives where item_id='40000000-0000-0000-0000-000000000001' and child_type='track'),1::bigint,'typed child tombstone archives the track identity');
select is((select count(*) from public.item_submission_decisions where submission_id=(select id from public.item_submissions where idempotency_key='decision-key')),1::bigint,'decision audit is append-only');
set local role service_role;
select is((select count(*) from public.item_submission_notification_events where submission_id=(select id from public.item_submissions where idempotency_key='decision-key')),2::bigint,'decision adds a dormant submitter notification event');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.decide_item_submission((select id from public.item_submissions where idempotency_key='decision-key'),'approved','replay')$$,'55000',null,'replayed decision is rejected');
select throws_ok($$select public.withdraw_item_submission((select id from public.item_submissions where idempotency_key='decision-key'),'late withdrawal')$$,'55000',null,'withdrawal after approval is rejected');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.submit_item_for_review('40000000-0000-0000-0000-000000000002','rollback-key')$$,'second Item can enter review');
set local role service_role;
update public.item_submission_items set slug='m13-review-item' where submission_id=(select id from public.item_submissions where idempotency_key='rollback-key');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.decide_item_submission((select id from public.item_submissions where idempotency_key='rollback-key'),'approved','forced unique failure')$$,'23505',null,'failed approval returns the database error');
select is((select status from public.item_submissions where idempotency_key='rollback-key'),'pending','failed approval rolls back the submission decision');
select is((select title from public.catalog_items where id='40000000-0000-0000-0000-000000000002'),'Second approved title','failed approval preserves the last approved Item');
select is((select count(*) from public.item_submission_decisions where submission_id=(select id from public.item_submissions where idempotency_key='rollback-key')),0::bigint,'failed approval writes no decision audit');
select * from finish();
rollback;
