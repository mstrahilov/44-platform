begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(id,email,raw_user_meta_data) values
  ('e1000000-0000-4000-8000-000000000001','eligibility-buyer@example.test','{"username":"eligibility_buyer"}'),
  ('e1000000-0000-4000-8000-000000000002','eligibility-creator@example.test','{"username":"eligibility_creator"}'),
  ('e1000000-0000-4000-8000-000000000003','eligibility-admin@example.test','{"username":"eligibility_admin"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='e1000000-0000-4000-8000-000000000002';
update public.profiles set role='admin' where id='e1000000-0000-4000-8000-000000000003';

insert into public.commerce_terms_versions(id,code,version,title,body,body_sha256,status,effective_at,approved_by)
values(
  'e1100000-0000-4000-8000-000000000001','commerce-eligibility-test','eligibility-test-1','Eligibility checkout terms',
  'Exact eligibility test terms.',encode(extensions.digest('Exact eligibility test terms.','sha256'),'hex'),
  'active',now()-interval '1 minute','e1000000-0000-4000-8000-000000000003'
);

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,status,author_id,
  experience_type,fulfillment_type,download_purchase_enabled
)
select 'e1200000-0000-4000-8000-000000000001',category.id,'eligibility-digital','Eligibility Digital',
  'Eligibility Creator','Album',1200,false,'published','e1000000-0000-4000-8000-000000000002',
  'music','digital',true
from public.item_categories category where category.slug='music';

update public.commerce_runtime_controls set
  operating_model_approved_at=now(),approved_by='e1000000-0000-4000-8000-000000000003',
  platform_seller_id='e1000000-0000-4000-8000-000000000003',
  terms_version_id='e1100000-0000-4000-8000-000000000001',shipping_countries=array['US'],
  platform_fee_bps=0,launch_scope='marketplace',stripe_payments_enabled=true,checkout_enabled=true
where singleton;

select is(
  public.creator_paid_sales_state_code('e1000000-0000-4000-8000-000000000002'),
  'country_unavailable',
  'final Wise seller gate defaults to country unavailable'
);
select is(
  public.is_creator_paid_sales_enabled('e1000000-0000-4000-8000-000000000002'),
  false,
  'a creator cannot sell before final individual onboarding'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.set_admin_creator_paid_sales('e1000000-0000-4000-8000-000000000002','approved','Creator attempted self approval.')$$,
  '42501','Administrator access required.','creators cannot approve their own historical paid-sales record'
);

select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.set_admin_creator_paid_sales('e1000000-0000-4000-8000-000000000002','approved','Historical approval retained for audit.')$$,
  'an administrator can preserve a historical paid-sales decision'
);
select is(
  (public.get_creator_paid_sales_state('e1000000-0000-4000-8000-000000000002')->>'state'),
  'country_unavailable',
  'historical approval cannot bypass the final Wise country gate'
);
select is(
  (select status from public.catalog_offers where item_id='e1200000-0000-4000-8000-000000000001' and code='digital-download-usd'),
  'draft',
  'the paid offer remains draft without final seller onboarding'
);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
select is(
  (public.sync_creator_payout_capability(
    'e1000000-0000-4000-8000-000000000002','stripe_connect','acct_eligibility_history','US','USD','pending',
    'requirements_due','{"transfers":"pending"}'::jsonb,array['individual.verification.document']
  )->>'state'),
  'country_unavailable',
  'pending Stripe Connect history cannot become the active payout gate'
);
select is(
  (public.sync_creator_payout_capability(
    'e1000000-0000-4000-8000-000000000002','stripe_connect','acct_eligibility_history','US','USD','verified',
    null,'{"transfers":"active","payouts_enabled":true}'::jsonb,'{}'
  )->>'state'),
  'country_unavailable',
  'verified Stripe Connect history remains dormant under the Wise-only decision'
);
select is(
  (select status from public.catalog_offers where item_id='e1200000-0000-4000-8000-000000000001' and code='digital-download-usd'),
  'draft',
  'dormant Stripe Connect evidence cannot activate an offer'
);
select is(
  (select can_sell_paid from public.get_creator_paid_sales_public_status(array['e1000000-0000-4000-8000-000000000002'::uuid])),
  false,
  'public seller availability remains fail closed'
);
select throws_ok(
  $$select public.create_stripe_pending_order(
    'e1000000-0000-4000-8000-000000000001',
    array[(select id from public.catalog_offers where item_id='e1200000-0000-4000-8000-000000000001' and code='digital-download-usd')],
    'eligibility-checkout-000001','eligibility-buyer@example.test'
  )$$,
  '55000','One or more offers are unavailable.','a dormant creator offer cannot create an order'
);
select is(
  (select count(*)::integer from public.creator_payout_accounts
    where creator_id='e1000000-0000-4000-8000-000000000002' and provider='stripe_connect'),
  1,
  'historical provider evidence is preserved'
);
select is(
  (public.get_creator_paid_sales_state('e1000000-0000-4000-8000-000000000003')->>'state'),
  'enabled',
  'the forty four platform seller does not require creator payout onboarding'
);
select throws_ok(
  $$update public.creator_paid_sales_access_events set reason='tampered'
    where creator_id='e1000000-0000-4000-8000-000000000002'$$,
  'P0001','creator_paid_sales_access_events is append-only','historical decisions remain immutable audit evidence'
);

select * from finish();
rollback;
