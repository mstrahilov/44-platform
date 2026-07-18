begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

insert into auth.users(id,email,raw_user_meta_data) values
  ('d1000000-0000-4000-8000-000000000001','stripe-buyer@example.test','{"username":"stripe_buyer"}'),
  ('d1000000-0000-4000-8000-000000000002','stripe-seller@example.test','{"username":"stripe_seller"}'),
  ('d1000000-0000-4000-8000-000000000003','stripe-other@example.test','{"username":"stripe_other"}'),
  ('d1000000-0000-4000-8000-000000000004','stripe-admin@example.test','{"username":"stripe_admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator',display_name='Stripe Seller' where id='d1000000-0000-4000-8000-000000000002';
update public.profiles set role='admin',display_name='Stripe Admin' where id='d1000000-0000-4000-8000-000000000004';
update public.commerce_runtime_controls set stripe_payments_enabled=false,checkout_enabled=false where singleton;

insert into public.catalog_items(
  id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,
  status,author_id,experience_type,fulfillment_type,cover_url,long_description
)
select 'd1100000-0000-4000-8000-000000000001',category.id,'stripe-merch','Stripe Merch',
  'Stripe Seller','Apparel',1,false,false,'{}','published','d1000000-0000-4000-8000-000000000002',
  'merch','physical','https://example.test/stripe-merch.jpg','A physical Stripe acceptance fixture.'
from public.item_categories category where category.slug='merch';
insert into public.catalog_offers(
  id,item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type
) values(
  'd1200000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001',
  'stripe-physical','physical_purchase','Stripe Merch','Physical fixture offer',2500,'USD','active','physical'
);
insert into public.commerce_terms_versions(id,code,version,title,body,body_sha256,status,effective_at,approved_by)
values(
  'd1300000-0000-4000-8000-000000000001','commerce-stripe-test','test-1','Test checkout terms',
  'Exact test shipping, refund, return, and checkout terms.',
  encode(extensions.digest('Exact test shipping, refund, return, and checkout terms.','sha256'),'hex'),
  'active',now()-interval '1 minute','d1000000-0000-4000-8000-000000000004'
);

select is((select checkout_enabled from public.commerce_runtime_controls where singleton),false,'paid checkout remains off after migration');
select throws_ok(
  $$select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000001'::uuid],'off-checkout-00000001','stripe-buyer@example.test')$$,
  '55000','Paid checkout is not activated.','disabled runtime controls block durable order creation'
);

update public.commerce_runtime_controls set
  operating_model_approved_at=now(),approved_by='d1000000-0000-4000-8000-000000000004',
  platform_seller_id='d1000000-0000-4000-8000-000000000002',terms_version_id='d1300000-0000-4000-8000-000000000001',
  shipping_countries=array['US'],platform_fee_bps=0,stripe_payments_enabled=true,checkout_enabled=true
where singleton;

create temporary table stripe_test_orders(name text primary key,order_id uuid not null,session_id text not null) on commit drop;
grant select on stripe_test_orders to authenticated;
grant all on stripe_test_orders to service_role;
insert into stripe_test_orders
select 'paid',(result->>'order_id')::uuid,'cs_test_paid_m12'
from (select public.create_stripe_pending_order(
  'd1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000001'::uuid],
  'paid-checkout-00000001','stripe-buyer@example.test'
) result) created;

select is((select subtotal_cents from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),2500,'server offer price overrides the one-cent Item/browser display price');
select is((select seller_snapshot->>'id' from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')),'d1000000-0000-4000-8000-000000000002','seller identity is snapshotted on the order line');
select is((select terms_snapshot->>'body' from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')),'Exact test shipping, refund, return, and checkout terms.','exact accepted terms are snapshotted on the order line');
select lives_ok($$select public.bind_stripe_checkout_session((select order_id from stripe_test_orders where name='paid'),'cs_test_paid_m12',now()+interval '30 minutes')$$,'a pending order binds to one Stripe Checkout Session');

select ok((public.process_stripe_webhook_event('evt_paid_m12','checkout.session.completed',jsonb_build_object(
  'order_id',(select order_id from stripe_test_orders where name='paid'),'checkout_session_id','cs_test_paid_m12',
  'payment_intent_id','pi_paid_m12','charge_id','ch_paid_m12','amount_subtotal',2500,'amount_total',3000,
  'amount_tax',0,'amount_shipping',500,'processor_fee',320,'currency','usd','payment_status','paid',
  'address',jsonb_build_object('name','Test Buyer','line1','44 Test Street','line2',null,'city','Chicago','state','IL','postal_code','60601','country','US')
))->>'processed')::boolean,'a signed paid Checkout event finalizes the order');
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),'paid','paid webhook is the order status authority');
select is((select (subtotal_cents+tax_cents+shipping_cents)=total_cents from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),true,'Stripe subtotal, tax, shipping, and total reconcile exactly');
select is((select recipient_name from public.commerce_order_addresses where order_id=(select order_id from stripe_test_orders where name='paid')),'Test Buyer','physical fulfillment address is stored canonically');
select is((select fulfillment_status from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')),'pending','paid physical order enters pending fulfillment');
select is((select sum(amount_cents)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid'))),2180,'creator payable equals merchandise subtotal less the exact Stripe processing fee');
select is((select sum(amount_cents)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')) and entry_type='processor_fee'),-320,'Stripe processing fee is recorded as exact negative creator accounting');
select is((select count(*)::integer from public.commerce_entitlement_grants where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid'))),0,'physical Merch does not mint a digital entitlement');
select ok((public.process_stripe_webhook_event('evt_paid_m12','checkout.session.completed','{}')->>'duplicate')::boolean,'duplicate provider event IDs are acknowledged idempotently');
select is((select count(*)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')) and entry_type='sale'),1,'duplicate webhook cannot double-credit earnings');
select is((select count(*)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')) and entry_type='processor_fee'),1,'duplicate webhook cannot double-debit the Stripe processing fee');
select lives_ok($$select public.process_stripe_webhook_event('evt_paid_expired_late','checkout.session.expired',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='paid'),'checkout_session_id','cs_test_paid_m12','currency','usd'))$$,'delayed expired event is safely accepted after payment');
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),'paid','out-of-order expiration cannot undo paid state');
select is(
  public.process_stripe_webhook_event(
    'evt_unsupported_m12','customer.created',
    jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='paid'),'currency','usd')
  )->>'order_id',
  (select order_id::text from stripe_test_orders where name='paid'),
  'unsupported Stripe events return the resolved durable order identity'
);
select is(
  (select processing_status from public.provider_webhook_events where provider_event_id='evt_unsupported_m12'),
  'ignored',
  'unsupported Stripe events remain visible as ignored evidence'
);

insert into stripe_test_orders
select 'abandoned',(result->>'order_id')::uuid,'cs_test_abandoned_m12'
from (select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000001'::uuid],'abandoned-checkout-01','stripe-buyer@example.test') result) created;
select public.bind_stripe_checkout_session((select order_id from stripe_test_orders where name='abandoned'),'cs_test_abandoned_m12',now()+interval '30 minutes');
select public.process_stripe_webhook_event('evt_abandoned_m12','checkout.session.expired',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='abandoned'),'checkout_session_id','cs_test_abandoned_m12','currency','usd'));
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='abandoned')),'canceled','abandoned Checkout cancels without fulfillment');
select is((select count(*)::integer from public.creator_earnings_entries entry join public.commerce_order_items line on line.id=entry.order_item_id where line.order_id=(select order_id from stripe_test_orders where name='abandoned')),0,'abandoned Checkout creates no earnings');

insert into stripe_test_orders
select 'declined',(result->>'order_id')::uuid,'cs_test_declined_m12'
from (select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000001'::uuid],'declined-checkout-001','stripe-buyer@example.test') result) created;
select public.bind_stripe_checkout_session((select order_id from stripe_test_orders where name='declined'),'cs_test_declined_m12',now()+interval '30 minutes');
select public.process_stripe_webhook_event('evt_declined_m12','payment_intent.payment_failed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='declined'),'payment_intent_id','pi_declined_m12','currency','usd','failure_code','card_declined','failure_message','The card was declined.'));
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='declined')),'failed','declined payment marks the durable order failed');
select is((select count(*)::integer from public.commerce_entitlement_grants grant_row join public.commerce_order_items line on line.id=grant_row.order_item_id where line.order_id=(select order_id from stripe_test_orders where name='declined')),0,'declined payment grants no access');

update public.catalog_items set status='draft' where id='d1100000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000001'::uuid],'draft-item-checkout-01','stripe-buyer@example.test')$$,
  '55000','One or more offers are unavailable.','unpublished Item is rejected even when its offer says active'
);
update public.catalog_items set status='published' where id='d1100000-0000-4000-8000-000000000001';
update public.catalog_offers set status='archived' where id='d1200000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000001'::uuid],'inactive-offer-checkout','stripe-buyer@example.test')$$,
  '55000','One or more offers are unavailable.','inactive offer is rejected server-side'
);
update public.catalog_offers set status='active' where id='d1200000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000003',array['d1200000-0000-4000-8000-000000000001'::uuid],'member-forged-checkout','stripe-other@example.test')$$,
  '42501',null,'members cannot call the service-only order boundary'
);
select is((select count(*)::integer from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')),0,'unrelated members cannot read paid order lines');
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')),1,'seller can inspect their canonical paid order line');
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000004',true);
select ok((public.get_admin_commerce_diagnostics()->>'failed_order_count')::integer>=1,'administrator diagnostics expose payment failures without secrets');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.process_stripe_webhook_event('evt_refund_partial_m12','charge.refunded',jsonb_build_object(
  'order_id',(select order_id from stripe_test_orders where name='paid'),'payment_intent_id','pi_paid_m12','charge_id','ch_paid_m12',
  'amount_refunded',1000,'currency','usd','reason','requested_by_customer'
));
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),'partially_refunded','partial refund preserves the durable order in a partially refunded state');
select is((select sum(amount_cents)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')) and entry_type='refund'),-1000,'first partial refund debits the exact seller subtotal share');
select public.process_stripe_webhook_event('evt_refund_full_m12','charge.refunded',jsonb_build_object(
  'order_id',(select order_id from stripe_test_orders where name='paid'),'payment_intent_id','pi_paid_m12','charge_id','ch_paid_m12',
  'amount_refunded',3000,'currency','usd','reason','requested_by_customer'
));
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),'refunded','full refund updates financial state without deleting the order');
select is((select fulfillment_status from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')),'canceled','unfulfilled physical line is canceled after full refund');
select is((select sum(amount_cents)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')) and entry_type='refund'),-2500,'refund earnings reverse exactly the merchandise subtotal, excluding tax and shipping');
select is((select sum(amount_cents)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid'))),-320,'full refund preserves the non-refunded Stripe processing fee in creator accounting');
select public.process_stripe_webhook_event('evt_refund_duplicate_delivery','charge.refunded',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='paid'),'payment_intent_id','pi_paid_m12','charge_id','ch_paid_m12','amount_refunded',3000,'currency','usd'));
select is((select count(*)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='paid')) and entry_type='refund'),2,'reordered refund evidence cannot double-debit either incremental refund');

insert into public.catalog_items(id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type,download_purchase_enabled)
select 'd1100000-0000-4000-8000-000000000002',category.id,'stripe-digital','Stripe Digital','Stripe Seller','Album',1800,false,false,'{}','published','d1000000-0000-4000-8000-000000000002','music','digital',true
from public.item_categories category where category.slug='music';
insert into public.catalog_offers(id,item_id,code,offer_type,title,price_cents,currency,status,fulfillment_type)
values('d1200000-0000-4000-8000-000000000002','d1100000-0000-4000-8000-000000000002','stripe-download','digital_download','Download',1800,'USD','active','entitlement');
insert into public.offer_entitlements(offer_id,entitlement_type) values('d1200000-0000-4000-8000-000000000002','download');
insert into public.creator_paid_sales_access(
  creator_id,admin_status,decision_reason,approved_by,approved_at,paperwork_due_at
) values(
  'd1000000-0000-4000-8000-000000000002','approved','Fixture Creator is in the manual paperwork grace window.',
  'd1000000-0000-4000-8000-000000000004',now(),now()+interval '30 days'
);
update public.commerce_runtime_controls set launch_scope='marketplace' where singleton;
insert into stripe_test_orders
select 'digital',(result->>'order_id')::uuid,'cs_test_digital_m12'
from (select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000002'::uuid],'digital-checkout-0001','stripe-buyer@example.test') result) created;
select public.bind_stripe_checkout_session((select order_id from stripe_test_orders where name='digital'),'cs_test_digital_m12',now()+interval '30 minutes');
select public.process_stripe_webhook_event('evt_digital_paid','checkout.session.completed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='digital'),'checkout_session_id','cs_test_digital_m12','payment_intent_id','pi_digital_m12','charge_id','ch_digital_m12','amount_subtotal',1800,'amount_total',1800,'amount_tax',0,'amount_shipping',0,'processor_fee',150,'currency','usd','payment_status','paid'));
select is((select status from public.entitlements where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002' and entitlement_type='download'),'active','paid digital offer grants its declared entitlement');
select is((select acquisition_type from public.library_entries where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002'),'purchase','paid digital Item preserves buyer Library identity');
select ok((public.process_stripe_webhook_event('evt_digital_paid_second_object','checkout.session.completed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='digital'),'checkout_session_id','cs_test_digital_m12','payment_intent_id','pi_digital_m12','charge_id','ch_digital_m12','amount_subtotal',1800,'amount_total',1800,'amount_tax',0,'amount_shipping',0,'processor_fee',150,'currency','usd','payment_status','paid'))->>'processed')::boolean,'a distinct signed Event object for the same successful Charge is accepted');
select is((select count(*)::integer from public.commerce_entitlement_grants where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='digital'))),1,'distinct successful Event objects cannot double-grant the digital entitlement');
select is((select count(*)::integer from public.library_entries where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002'),1,'distinct successful Event objects preserve exactly one purchase Library entry');
select is((select count(*)::integer from public.creator_earnings_entries where order_item_id=(select id from public.commerce_order_items where order_id=(select order_id from stripe_test_orders where name='digital')) and entry_type='processor_fee'),1,'distinct successful Event objects cannot double-debit the Charge processing fee');
select public.process_stripe_webhook_event('evt_dispute_created','charge.dispute.created',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='digital'),'payment_intent_id','pi_digital_m12','charge_id','ch_digital_m12','dispute_id','dp_digital_m12','dispute_amount',1800,'dispute_status','needs_response','currency','usd','reason','fraudulent'));
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='digital')),'disputed','dispute preserves the order and marks explicit financial state');
select is((select status from public.entitlements where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002' and entitlement_type='download'),'revoked','dispute revokes paid access without deleting evidence');
select public.process_stripe_webhook_event('evt_dispute_won','charge.dispute.closed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='digital'),'payment_intent_id','pi_digital_m12','charge_id','ch_digital_m12','dispute_id','dp_digital_m12','dispute_amount',1800,'dispute_status','won','dispute_outcome','won','currency','usd'));
select is((select status from public.commerce_orders where id=(select order_id from stripe_test_orders where name='digital')),'paid','won dispute restores the prior paid state');
select is((select status from public.entitlements where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002' and entitlement_type='download'),'active','won dispute restores access from the immutable grant source');
select public.process_stripe_webhook_event('evt_digital_refund','charge.refunded',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='digital'),'payment_intent_id','pi_digital_m12','charge_id','ch_digital_m12','amount_refunded',1800,'currency','usd'));
select is((select status from public.entitlements where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002' and entitlement_type='download'),'revoked','full refund revokes the paid digital entitlement');
select is((select count(*)::integer from public.library_entries where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002'),1,'refund preserves historical Library identity');
select public.process_stripe_webhook_event('evt_digital_paid_delayed','checkout.session.completed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='digital'),'checkout_session_id','cs_test_digital_m12','payment_intent_id','pi_digital_m12','charge_id','ch_digital_m12','amount_subtotal',1800,'amount_total',1800,'amount_tax',0,'amount_shipping',0,'currency','usd','payment_status','paid'));
select is((select status from public.entitlements where user_id='d1000000-0000-4000-8000-000000000001' and item_id='d1100000-0000-4000-8000-000000000002' and entitlement_type='download'),'revoked','delayed success after refund cannot regrant access');

insert into stripe_test_orders
select 'retry',(result->>'order_id')::uuid,'cs_test_retry_m12'
from (select public.create_stripe_pending_order('d1000000-0000-4000-8000-000000000001',array['d1200000-0000-4000-8000-000000000002'::uuid],'retry-checkout-000001','stripe-buyer@example.test') result) created;
select public.bind_stripe_checkout_session((select order_id from stripe_test_orders where name='retry'),'cs_test_retry_m12',now()+interval '30 minutes');
select ok((public.process_stripe_webhook_event('evt_retry_m12','checkout.session.completed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='retry'),'checkout_session_id','cs_test_retry_m12','payment_intent_id','pi_retry_m12','amount_subtotal',1,'amount_total',1,'amount_tax',0,'amount_shipping',0,'currency','usd','payment_status','paid'))->>'retryable')::boolean,'mismatched Stripe totals fail closed and request a retry');
select is((select processing_status from public.provider_webhook_events where provider_event_id='evt_retry_m12'),'failed','failed verified webhook remains visible to operations');
select ok((public.process_stripe_webhook_event('evt_retry_m12','checkout.session.completed',jsonb_build_object('order_id',(select order_id from stripe_test_orders where name='retry'),'checkout_session_id','cs_test_retry_m12','payment_intent_id','pi_retry_m12','amount_subtotal',1800,'amount_total',1800,'amount_tax',0,'amount_shipping',0,'currency','usd','payment_status','paid'))->>'processed')::boolean,'same failed event ID can be retried safely after recovery');
select is((select subtotal_cents+tax_cents+shipping_cents-refunded_cents from public.commerce_orders where id=(select order_id from stripe_test_orders where name='paid')),0,'provider totals, order totals, and full refund reconcile exactly');

select * from finish();
rollback;
