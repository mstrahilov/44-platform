-- 44OS merch fulfillment mode
-- Reviewed SQL only. Run manually after confirming backup/rollback.
-- Purpose: let merch items distinguish between creator shipping and creator local delivery.

alter table public.products
  add column if not exists merch_fulfillment_mode text,
  add column if not exists merch_shipping_scope text;

update public.products
set merch_fulfillment_mode = case
  when fulfillment_type = 'physical' and coalesce(available_locally_only, false) = true then 'deliver'
  when fulfillment_type = 'physical' then 'ship'
  else merch_fulfillment_mode
end
where merch_fulfillment_mode is null;

update public.products
set merch_shipping_scope = case
  when merch_fulfillment_mode = 'deliver' then 'local'
  when fulfillment_type = 'physical' and coalesce(available_locally_only, false) = true then 'local'
  when fulfillment_type = 'physical' then 'global'
  else merch_shipping_scope
end
where merch_shipping_scope is null;

alter table public.products
  drop constraint if exists products_merch_fulfillment_mode_check,
  add constraint products_merch_fulfillment_mode_check
    check (merch_fulfillment_mode is null or merch_fulfillment_mode in ('ship', 'deliver'));

alter table public.products
  drop constraint if exists products_merch_shipping_scope_check,
  add constraint products_merch_shipping_scope_check
    check (merch_shipping_scope is null or merch_shipping_scope in ('local', 'global'));
