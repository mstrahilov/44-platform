-- Lets a member remove one release from the account-wide Achievements list
-- without touching its actual Library visibility — "hide achievement" is a
-- separate concern from "hide from Library".
alter table public.library_entries
  add column if not exists achievements_hidden boolean not null default false;
