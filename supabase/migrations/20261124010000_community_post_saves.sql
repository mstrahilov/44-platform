-- Private Community post saves for the web bookmark action.
create table public.content_entry_saves (
  entry_id uuid not null references public.content_entries(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (entry_id, profile_id)
);

create index content_entry_saves_profile_idx
  on public.content_entry_saves(profile_id, saved_at desc);

alter table public.content_entry_saves enable row level security;

create policy content_entry_saves_read_own
  on public.content_entry_saves for select to authenticated
  using (profile_id = auth.uid());

create policy content_entry_saves_insert_own_readable
  on public.content_entry_saves for insert to authenticated
  with check (
    profile_id = auth.uid()
    and public.can_read_content(entry_id)
  );

create policy content_entry_saves_delete_own
  on public.content_entry_saves for delete to authenticated
  using (profile_id = auth.uid());

grant select, insert, delete on public.content_entry_saves to authenticated;
revoke all on public.content_entry_saves from anon;
