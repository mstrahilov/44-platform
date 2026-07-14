begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id,email,raw_user_meta_data) values
 ('c3000000-0000-0000-0000-000000000001','m12-payment-creator@example.test','{"username":"m12_payment_creator"}'),
 ('c3000000-0000-0000-0000-000000000002','m12-payment-admin@example.test','{"username":"m12_payment_admin"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='c3000000-0000-0000-0000-000000000001';
update public.profiles set role='admin' where id='c3000000-0000-0000-0000-000000000002';

select is((select checkout_enabled from public.commerce_runtime_controls where singleton),false,'checkout remains disabled');
select is((select stripe_payments_enabled from public.commerce_runtime_controls where singleton),false,'Stripe payments remain disabled');
select is((select paypal_payouts_enabled from public.commerce_runtime_controls where singleton),false,'PayPal payouts remain disabled');
select throws_ok($$update public.commerce_runtime_controls set checkout_enabled=true where singleton$$,'23514',null,'checkout cannot be enabled without the fail-closed prerequisites');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c3000000-0000-0000-0000-000000000001',true);
select throws_ok($$insert into public.creator_earnings_entries(creator_id,entry_type,amount_cents,currency) values ('c3000000-0000-0000-0000-000000000001','sale',100,'USD')$$,'42501',null,'creators cannot write their own accounting ledger');
select is((select count(*) from public.commerce_reconciliation_runs),0::bigint,'reconciliation runs are not created by disabled runtime controls');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
insert into public.commerce_reconciliation_runs(provider,scope,window_start,window_end,status,checked_count,mismatch_count)
values ('stripe','payments',now()-interval '1 hour',now(),'matched',0,0);
insert into public.provider_webhook_events(provider,provider_event_id,event_type,signature_verified,payload)
values ('stripe','evt_m12_test','checkout.session.completed',false,'{"redacted":true}');
select throws_ok($$update public.provider_webhook_events set processing_status='processed' where provider_event_id='evt_m12_test'$$,'23514',null,'unverified provider events cannot be processed');
select throws_ok($$delete from public.provider_webhook_events where provider_event_id='evt_m12_test'$$,'P0001',null,'provider webhook evidence is append-only');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c3000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.commerce_runtime_controls),0::bigint,'non-admins cannot read commerce activation controls');
select is((select count(*) from public.commerce_reconciliation_runs),0::bigint,'non-admins cannot read reconciliation runs');

select set_config('request.jwt.claim.sub','c3000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.commerce_runtime_controls),1::bigint,'admins can inspect the commerce activation controls');
select is((select status from public.commerce_reconciliation_runs limit 1),'matched','admins can inspect reconciliation results');

select * from finish();
rollback;
