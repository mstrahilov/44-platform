-- 44OS achievement icon registry
-- Review and run in Supabase SQL editor after backing up the project.
-- Icons are 44-controlled. Upload files to a public Supabase Storage bucket
-- such as `achievement-icons`, then store the public URL here by achievement code.

create table if not exists public.achievement_icon_registry (
  code text primary key,
  title text not null,
  icon_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.achievement_icon_registry enable row level security;

drop policy if exists "achievement icons public read" on public.achievement_icon_registry;
create policy "achievement icons public read"
on public.achievement_icon_registry
for select
using (true);

-- Write access should stay admin-only through the Supabase dashboard/service role.
-- Do not add authenticated write policies for creators.

notify pgrst, 'reload schema';
