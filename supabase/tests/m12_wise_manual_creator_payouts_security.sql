begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users(id,email,raw_user_meta_data) values
  ('a7000000-0000-4000-8000-000000000001','wise-creator@example.test','{"username":"wise_creator","country_code":"NA"}'),
  ('a7000000-0000-4000-8000-000000000002','wise-admin@example.test','{"username":"wise_admin","country_code":"US"}'),
  ('a7000000-0000-4000-8000-000000000003','wise-reviewer@example.test','{"username":"wise_reviewer","country_code":"US"}'),
  ('a7000000-0000-4000-8000-000000000004','wise-member@example.test','{"username":"wise_member","country_code":"ZW"}'),
  ('a7000000-0000-4000-8000-000000000005','wise-blocked@example.test','{"username":"wise_blocked","country_code":"NA"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id in (
  'a7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000005'
);
update public.profiles set role='admin' where id in (
  'a7000000-0000-4000-8000-000000000002','a7000000-0000-4000-8000-000000000003'
);
insert into public.creator_seller_onboarding(creator_id,status) values
  ('a7000000-0000-4000-8000-000000000001','required'),
  ('a7000000-0000-4000-8000-000000000005','required');

select is(
  (select country_code from public.profiles where id='a7000000-0000-4000-8000-000000000001'),
  'NA','signup metadata captures an ISO country code'
);
select is(public.creator_seller_state_code('a7000000-0000-4000-8000-000000000001'),
  'country_waitlisted','a creator defaults closed without a verified country route');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$select public.set_admin_creator_payout_country_route('NA','NAD','verified','forged creator evidence',now()+interval '90 days')$$,
  '42501','Administrator access required.','creators cannot activate payout routes'
);

select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.set_admin_creator_payout_country_route(
    'NA','NAD','verified','Wise Business UI synthetic acceptance evidence',now()+interval '90 days'
  )$$,'an administrator can record reviewed route evidence'
);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000005',true);
select throws_ok(
  $$insert into public.catalog_items(
    item_category_id,slug,title,creator,item_type,price_cents,is_free,status,author_id,
    experience_type,fulfillment_type
  ) select category.id,'blocked-before-onboarding','Blocked Before Onboarding','Blocked Creator',
    'Album',1000,false,'draft','a7000000-0000-4000-8000-000000000005','music','digital'
  from public.item_categories category where category.slug='music'$$,
  '55000','Complete creator tax and Wise payout setup before uploading Items.',
  'an authenticated creator cannot create an Item before onboarding'
);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.set_admin_creator_access(
    'a7000000-0000-4000-8000-000000000004','creator','Unsupported-country promotion test.'
  )$$,
  '55000','This member country does not have a verified Wise email payout route.',
  'creator promotion fails closed when the country has no verified route'
);
select lives_ok(
  $$select public.set_admin_creator_tax_reviewer('a7000000-0000-4000-8000-000000000003',true)$$,
  'an administrator can designate a restricted tax reviewer'
);

select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.approve_creator_tax_policy(
    1,'Synthetic creator royalty classification for database acceptance only.',
    'Synthetic professional reference; not production tax advice.'
  )$$,'a designated reviewer can approve the synthetic test policy'
);

select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
select is(
  (public.begin_creator_seller_onboarding('individual','foreign_person','none')->>'expected_tax_form'),
  'w8ben','a foreign individual is routed to W-8BEN'
);
select is(
  (public.begin_creator_seller_onboarding('entity','foreign_person','none')->>'state'),
  'entity_waitlisted','entity sellers fail closed'
);
select public.begin_creator_seller_onboarding('individual','foreign_person','none');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
create temporary table wise_fixture(document_id uuid,destination_id uuid,batch_id uuid,item_id uuid) on commit drop;
grant all on wise_fixture to authenticated,service_role;
insert into wise_fixture(document_id)
select public.store_creator_tax_document(
  'a7000000-0000-4000-8000-000000000001','w8ben','2021-10',
  repeat('a',64),now()-interval '1 day',date_trunc('year',now())+interval '4 years'-interval '1 second',
  decode('0102','hex'),decode('030405060708090a0b0c0d0e','hex'),decode('0f101112131415161718191a1b1c1d1e','hex'),1,2048
);
select is((select status from public.creator_tax_documents where id=(select document_id from wise_fixture)),
  'pending','encrypted tax evidence starts in restricted review');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
select is(has_table_privilege('authenticated','public.creator_tax_document_payloads','select'),false,
  'the browser role has no read privilege on encrypted tax payload rows');
select is(has_table_privilege('authenticated','public.creator_payout_country_routes','select'),false,
  'verified route evidence is not exposed as a browser-readable table');

select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.review_creator_tax_document(
    (select document_id from wise_fixture),'accepted','Synthetic form accepted for security test.'
  )$$,'the restricted reviewer can accept a tax document'
);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
update wise_fixture set destination_id=public.store_creator_payout_destination(
  'a7000000-0000-4000-8000-000000000001',
  (select id from public.creator_payout_country_routes where country_code='NA' and target_currency='NAD'),
  'wi******@example.test',repeat('b',64),
  decode('2021','hex'),decode('22232425262728292a2b2c2d','hex'),decode('2e2f303132333435363738393a3b3c3d','hex'),1
);
select is(public.creator_seller_state_code('a7000000-0000-4000-8000-000000000001'),
  'ready','accepted tax and encrypted email claim destination complete onboarding');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
select is(has_table_privilege('authenticated','public.creator_payout_destinations','select'),false,
  'the browser role has no read privilege on encrypted payout destinations');
select is(
  (public.get_creator_seller_onboarding_state('a7000000-0000-4000-8000-000000000001')->>'destination_masked'),
  'wi******@example.test','the safe status RPC returns only the masked destination'
);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
insert into public.creator_earnings_entries(
  creator_id,entry_type,amount_cents,currency,source_provider,source_reference,available_at,created_at
) values(
  'a7000000-0000-4000-8000-000000000001','sale',12500,'NAD','stripe','wise-test-sale',
  now()-interval '2 days',now()-interval '2 days'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.set_creator_payout_runtime_controls(true,true,true,false,5000,1)$$,
  'separate Wise payout controls can be explicitly enabled for synthetic acceptance'
);
update wise_fixture set batch_id=public.create_creator_payout_batch(
  now()-interval '1 day','NAD','wise-monthly-acceptance-2026-07'
);
update wise_fixture set item_id=(select id from public.creator_payout_items where batch_id=wise_fixture.batch_id);
select is(
  public.create_creator_payout_batch(now()-interval '1 day','NAD','wise-monthly-acceptance-2026-07'),
  (select batch_id from wise_fixture),'batch creation is provider-idempotent'
);
select is((select item_count from public.creator_payout_batches where id=(select batch_id from wise_fixture)),
  1,'the immutable cutoff contains one eligible creator');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok(
  $$update public.creator_payout_batches set cutoff_at=now() where id=(select batch_id from wise_fixture)$$,
  '55000','Payout batch membership and cutoff are immutable.','locked cutoff evidence cannot be edited'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.set_creator_payout_item_withholding(
    (select item_id from wise_fixture),500,'Synthetic withholding acceptance decision.'
  )$$,'withholding is a distinct restricted decision before approval'
);
select is((select amount_cents from public.creator_payout_items where id=(select item_id from wise_fixture)),
  12000::bigint,'net payout subtracts approved withholding from gross payable');
select is((select total_cents from public.creator_payout_batches where id=(select batch_id from wise_fixture)),
  12000::bigint,'the approval batch total tracks the exact net amount after withholding');

select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000002',true);
select public.approve_creator_payout_batch((select batch_id from wise_fixture),repeat('c',64));
select lives_ok(
  $$select public.record_creator_wise_manual_transfer(
    (select item_id from wise_fixture),'WISE-SYNTHETIC-0001',12000,'NAD',12000,'NAD',1,250,repeat('d',64)
  )$$,'the operator can record a manual Wise transfer without an API call'
);
select lives_ok(
  $$select public.record_creator_wise_manual_transfer(
    (select item_id from wise_fixture),'WISE-SYNTHETIC-0001',12000,'NAD',12000,'NAD',1,250,repeat('d',64)
  )$$,'duplicate matching operator evidence is idempotent'
);
select throws_ok(
  $$select public.reconcile_creator_wise_manual_payout(
    (select item_id from wise_fixture),'paid',repeat('e',64),repeat('f',64)
  )$$,
  '55000','Independent payout reconciliation is invalid.',
  'the transfer operator cannot independently reconcile their own payout'
);

select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.reconcile_creator_wise_manual_payout(
    (select item_id from wise_fixture),'paid',repeat('e',64),repeat('f',64)
  )$$,'a different administrator can reconcile Wise evidence as paid'
);
select is((select status from public.creator_payout_items where id=(select item_id from wise_fixture)),
  'paid','only reconciled Wise evidence marks the payout paid');
select is((select count(*)::integer from public.creator_earnings_entries
  where creator_id='a7000000-0000-4000-8000-000000000001' and entry_type='payout'),
  1,'reconciliation creates exactly one append-only payout debit');
select is((select count(*)::integer from information_schema.columns
  where table_schema='public' and table_name='creator_payout_destinations'
    and column_name in ('account_number','routing_number','iban','bank_details')),
  0,'the launch destination schema stores no bank-detail fields');

select * from finish();
rollback;
