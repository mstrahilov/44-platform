begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(id,email,raw_user_meta_data) values
  ('98100000-0000-0000-0000-000000000001','featured-member@example.test','{"username":"featured_member","display_name":"Featured Member","country_code":"US"}'),
  ('98100000-0000-0000-0000-000000000002','featured-creator-a@example.test','{"username":"featured_creator_a","display_name":"Featured Creator A","country_code":"US"}'),
  ('98100000-0000-0000-0000-000000000003','featured-creator-b@example.test','{"username":"featured_creator_b","display_name":"Featured Creator B","country_code":"US"}'),
  ('98100000-0000-0000-0000-000000000004','featured-admin@example.test','{"username":"featured_admin","display_name":"Featured Admin","country_code":"US"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id in (
  '98100000-0000-0000-0000-000000000002',
  '98100000-0000-0000-0000-000000000003'
);
update public.profiles set role='admin' where id='98100000-0000-0000-0000-000000000004';

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,
  cover_url,status,author_id,experience_type,fulfillment_type,release_date
)
select fixture.item_id,category.id,fixture.slug,fixture.title,fixture.creator_name,fixture.item_type,
  0,true,false,'{}',fixture.cover_url,fixture.status,fixture.author_id,'music','digital',fixture.release_date
from public.item_categories category cross join (values
  ('98200000-0000-0000-0000-000000000001'::uuid,'featured-release-a','Featured Release A','Featured Creator A','album','https://example.test/a.jpg','published','98100000-0000-0000-0000-000000000002'::uuid,'2026-07-18'::date),
  ('98200000-0000-0000-0000-000000000002'::uuid,'featured-release-b','Featured Release B','Featured Creator B','single','https://example.test/b.jpg','published','98100000-0000-0000-0000-000000000003'::uuid,'2026-07-19'::date),
  ('98200000-0000-0000-0000-000000000003'::uuid,'featured-draft','Featured Draft','Featured Creator A','album','https://example.test/draft.jpg','draft','98100000-0000-0000-0000-000000000002'::uuid,'2026-07-17'::date),
  ('98200000-0000-0000-0000-000000000004'::uuid,'featured-beat','Featured Beat','Featured Creator A','beat','https://example.test/beat.jpg','published','98100000-0000-0000-0000-000000000002'::uuid,'2026-07-16'::date)
) fixture(item_id,slug,title,creator_name,item_type,cover_url,status,author_id,release_date)
where category.slug='music';

insert into public.item_type_assignments(item_id,item_type_id)
select '98200000-0000-0000-0000-000000000004',item_type.id
from public.item_types item_type
where item_type.slug='beat';

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.list_home_featured_item_ids()),0,'public Featured starts empty when no legacy flags were seeded');
select throws_ok($$select public.get_admin_home_featured_state()$$,'42501',null,'anonymous users cannot read the Admin Featured state');
select throws_ok($$insert into public.home_shelf_entries(shelf_key,position,item_id) values('featured',1,'98200000-0000-0000-0000-000000000001')$$,'42501',null,'anonymous users cannot write shelf entries directly');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','98100000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.get_admin_home_featured_state()$$,'42501','Administrator access required.','members cannot read the Admin Featured state');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000001'::uuid],'self feature')$$,'42501','Administrator access required.','members cannot curate Featured');

select set_config('request.jwt.claim.sub','98100000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000001'::uuid,'98200000-0000-0000-0000-000000000002'::uuid],'Launch editorial order')$$,'admins can atomically save ordered Featured Items');
select is((public.get_admin_home_featured_state()->'entries'->0->>'item_id')::uuid,'98200000-0000-0000-0000-000000000001'::uuid,'slot one preserves Admin order');
select is((public.get_admin_home_featured_state()->'entries'->1->>'item_id')::uuid,'98200000-0000-0000-0000-000000000002'::uuid,'slot two preserves Admin order');
select is((select count(*)::integer from public.admin_home_shelf_events),1,'a Featured save appends one audit event');
select is((select reason from public.admin_home_shelf_events limit 1),'Launch editorial order','the audit preserves the required reason');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000001'::uuid,'98200000-0000-0000-0000-000000000001'::uuid],'Duplicate selection')$$,'22023','Featured Items must be unique.','duplicate Featured Items are rejected');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000001'::uuid,'98200000-0000-0000-0000-000000000002'::uuid,'98200000-0000-0000-0000-000000000003'::uuid,'98200000-0000-0000-0000-000000000004'::uuid,'98200000-0000-0000-0000-000000000001'::uuid],'Too many selections')$$,'22023','Featured supports at most four Items.','more than four Featured slots are rejected');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000003'::uuid],'Feature a draft')$$,'23514','Every Featured selection must be a published Music release.','draft Items cannot be Featured');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000004'::uuid],'Feature a Beat')$$,'23514','Every Featured selection must be a published Music release.','Beats cannot be Featured');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000002'::uuid],'x')$$,'22023','A reason between 3 and 500 characters is required.','Featured saves require a bounded audit reason');
select throws_ok($$select public.set_admin_home_featured_items(array['98200000-0000-0000-0000-000000000001'::uuid,'98200000-0000-0000-0000-000000000002'::uuid],'No change')$$,'55000','The Featured shelf is already in this order.','no-op Featured saves are rejected');
select throws_ok($$update public.admin_home_shelf_events set reason='rewritten'$$,'42501',null,'Featured history cannot be rewritten');
select is((public.get_admin_home_featured_state()->>'mutation_ready')::boolean,true,'Admin Featured state reports the mutation contract ready');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select is((select array_agg(item_id order by slot_position) from public.list_home_featured_item_ids()),array['98200000-0000-0000-0000-000000000001'::uuid,'98200000-0000-0000-0000-000000000002'::uuid],'public Featured returns only the eligible saved Items in slot order');
select throws_ok($$select * from public.home_shelf_entries$$,'42501',null,'anonymous users cannot read the underlying editorial table');

select * from finish();
rollback;
