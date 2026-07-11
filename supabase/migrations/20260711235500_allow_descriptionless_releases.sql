-- Studio releases no longer collect a description. Keep the legacy columns
-- readable for existing catalog items while allowing new releases to save
-- without manufacturing placeholder copy.
alter table public.products
  alter column long_description drop not null;

alter table public.products
  drop constraint if exists products_long_description_length_check;

alter table public.products
  add constraint products_long_description_length_check
  check (
    long_description is null
    or char_length(long_description) between 0 and 5000
  );
