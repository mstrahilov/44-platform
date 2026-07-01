begin;

-- Products: move any lingering legacy description content into the new fields.
alter table public.products
  add column if not exists short_description text,
  add column if not exists long_description text;

update public.products
set
  short_description = coalesce(
    nullif(trim(short_description), ''),
    nullif(trim(description), ''),
    title
  ),
  long_description = coalesce(
    nullif(trim(long_description), ''),
    nullif(trim(description), ''),
    nullif(trim(short_description), ''),
    title
  );

-- Services: same cleanup pattern.
alter table public.services
  add column if not exists short_description text,
  add column if not exists long_description text;

update public.services
set
  short_description = coalesce(
    nullif(trim(short_description), ''),
    nullif(trim(description), ''),
    title
  ),
  long_description = coalesce(
    nullif(trim(long_description), ''),
    nullif(trim(description), ''),
    nullif(trim(short_description), ''),
    title
  );

-- Resources: merge summary/body into the new short/long description system.
alter table public.resources
  add column if not exists short_description text,
  add column if not exists long_description text;

update public.resources
set
  short_description = coalesce(
    nullif(trim(short_description), ''),
    nullif(trim(summary), ''),
    title
  ),
  long_description = coalesce(
    nullif(trim(long_description), ''),
    nullif(trim(body), ''),
    nullif(trim(summary), ''),
    nullif(trim(short_description), ''),
    title
  );

-- If you want these required at the database level, this keeps the app model strict.
alter table public.products
  alter column short_description set not null,
  alter column long_description set not null;

alter table public.services
  alter column short_description set not null,
  alter column long_description set not null;

alter table public.resources
  alter column short_description set not null,
  alter column long_description set not null;

-- Drop legacy content fields now that the app is fully migrated.
alter table public.products
  drop column if exists description;

alter table public.services
  drop column if exists description;

alter table public.resources
  drop column if exists summary,
  drop column if exists body;

commit;
