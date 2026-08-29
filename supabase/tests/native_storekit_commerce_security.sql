begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select ok((select relrowsecurity from pg_class where oid='public.native_storekit_product_mappings'::regclass),'StoreKit mappings enforce RLS');
select ok((select relrowsecurity from pg_class where oid='public.native_storekit_purchase_intents'::regclass),'StoreKit intents enforce RLS');
select ok((select relrowsecurity from pg_class where oid='public.native_storekit_transactions'::regclass),'StoreKit transactions enforce RLS');
select ok((select relrowsecurity from pg_class where oid='public.native_storekit_notification_events'::regclass),'StoreKit notifications enforce RLS');

select ok(not has_table_privilege('anon','public.native_storekit_product_mappings','select'),'anonymous users cannot read Apple product mappings');
select ok(not has_table_privilege('authenticated','public.native_storekit_product_mappings','select'),'members cannot read Apple product mappings directly');
select ok(not has_table_privilege('anon','public.native_storekit_purchase_intents','select'),'anonymous users cannot read purchase intents');
select ok(not has_table_privilege('authenticated','public.native_storekit_purchase_intents','select'),'members cannot read purchase intents directly');
select ok(not has_table_privilege('anon','public.native_storekit_transactions','select'),'anonymous users cannot read transaction evidence');
select ok(not has_table_privilege('authenticated','public.native_storekit_transactions','select'),'members cannot read transaction evidence directly');
select ok(not has_table_privilege('anon','public.native_storekit_notification_events','select'),'anonymous users cannot read notification evidence');
select ok(not has_table_privilege('authenticated','public.native_storekit_notification_events','select'),'members cannot read notification evidence directly');

select ok(not has_function_privilege('anon','public.upsert_native_storekit_product_mapping_v1(text,uuid,uuid,text,text,text,text,text,boolean,uuid)','execute'),'anonymous users cannot approve Apple products');
select ok(not has_function_privilege('authenticated','public.upsert_native_storekit_product_mapping_v1(text,uuid,uuid,text,text,text,text,text,boolean,uuid)','execute'),'members cannot approve Apple products');
select ok(not has_function_privilege('anon','public.prepare_native_storekit_purchase_intent_v1(uuid,uuid,uuid,text,text)','execute'),'anonymous users cannot mint purchase intents');
select ok(not has_function_privilege('authenticated','public.prepare_native_storekit_purchase_intent_v1(uuid,uuid,uuid,text,text)','execute'),'members cannot mint purchase intents directly');
select ok(not has_function_privilege('anon','public.fulfill_native_storekit_transaction_v1(uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,bigint,timestamptz,integer)','execute'),'anonymous users cannot fulfill StoreKit transactions');
select ok(not has_function_privilege('authenticated','public.fulfill_native_storekit_transaction_v1(uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,bigint,timestamptz,integer)','execute'),'members cannot fulfill StoreKit transactions directly');
select ok(not has_function_privilege('anon','public.process_native_storekit_notification_v1(uuid,text,text,text,text,text,text,timestamptz,integer)','execute'),'anonymous users cannot process Apple notifications');
select ok(not has_function_privilege('authenticated','public.process_native_storekit_notification_v1(uuid,text,text,text,text,text,text,timestamptz,integer)','execute'),'members cannot process Apple notifications directly');

select ok(has_function_privilege('service_role','public.prepare_native_storekit_purchase_intent_v1(uuid,uuid,uuid,text,text)','execute'),'service role may prepare purchase intents');
select ok(has_function_privilege('service_role','public.fulfill_native_storekit_transaction_v1(uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,bigint,timestamptz,integer)','execute'),'service role may fulfill verified transactions');
select is((select proconfig[1] from pg_proc where oid='public.fulfill_native_storekit_transaction_v1(uuid,text,text,text,uuid,text,text,timestamptz,uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,bigint,timestamptz,integer)'::regprocedure),'search_path=public, auth','fulfillment fixes its search path');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename like 'native_storekit_%'),0,'StoreKit server tables expose no client policies');

select * from finish();
rollback;
