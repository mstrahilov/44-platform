-- Account-owned theme preferences. No other user preference or profile data is
-- stored or modified here. Signed-out visitors use the app-level dark/ocean default.
create table public.user_theme_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme_mode text not null default 'dark'
    check (theme_mode in ('light', 'dark', 'system')),
  theme_accent text not null default 'ocean'
    check (theme_accent in ('amber', 'sage', 'ocean', 'violet', 'red', 'cyan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_theme_preferences enable row level security;

create policy user_theme_preferences_owner_select
on public.user_theme_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy user_theme_preferences_owner_insert
on public.user_theme_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy user_theme_preferences_owner_update
on public.user_theme_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.user_theme_preferences (user_id, theme_mode, theme_accent)
select id, 'dark', 'ocean'
from public.profiles;
