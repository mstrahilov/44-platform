begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public','printful_pricing_approvals','immutable Printful pricing approvals exist');
select has_table('public','printful_fulfillment_shipments','separate Printful shipment evidence exists');
select has_column('public','printful_fulfillment_orders','provider_dashboard_url','provider dashboard link is minimized separately');
select has_column('public','printful_fulfillment_orders','confirmed_externally_at','external owner confirmation can be evidenced');
select has_column('public','printful_fulfillment_orders','last_provider_event_at','order events have an out-of-order cursor');
select ok(
  (select relrowsecurity from pg_class where oid='public.printful_pricing_approvals'::regclass),
  'pricing approvals use RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid='public.printful_fulfillment_shipments'::regclass),
  'shipment evidence uses RLS'
);
select ok(
  not has_table_privilege('authenticated','public.printful_pricing_approvals','INSERT'),
  'browser roles cannot create pricing approvals'
);
select ok(
  not has_table_privilege('authenticated','public.printful_fulfillment_shipments','UPDATE'),
  'browser roles cannot rewrite shipment evidence'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conrelid='public.printful_runtime_controls'::regclass
      and pg_get_constraintdef(oid) like '%NOT confirmation_enabled%'
  ),
  '44OS API confirmation remains structurally disabled'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conrelid='public.printful_fulfillment_orders'::regclass
      and pg_get_constraintdef(oid) like '%fulfilled%'
      and pg_get_constraintdef(oid) like '%returned%'
  ),
  'signed provider production and return states are accepted'
);
select ok(
  exists(
    select 1 from pg_trigger
    where tgrelid='public.printful_pricing_approvals'::regclass
      and tgname='printful_pricing_approvals_immutable'
      and not tgisinternal
  ),
  'pricing approvals cannot be updated or deleted'
);

select * from finish();
rollback;
