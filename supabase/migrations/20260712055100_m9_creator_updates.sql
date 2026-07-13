-- M9 atomic ownership-checked Creator Update creation.

create or replace function public.create_content_update(
  target_item_id uuid, update_title text, update_body text, update_version_label text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare entry_id uuid;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or not editable.' using errcode = '42501';
  end if;
  if not exists(select 1 from public.catalog_items where id = target_item_id and status <> 'archived') then
    raise exception 'Archived Items cannot receive new updates.' using errcode = '55000';
  end if;
  if char_length(btrim(update_title)) < 1 or char_length(btrim(update_title)) > 160 then
    raise exception 'Update title must be between 1 and 160 characters.' using errcode = '22023';
  end if;
  if char_length(btrim(update_body)) < 1 or char_length(btrim(update_body)) > 10000 then
    raise exception 'Update body must be between 1 and 10000 characters.' using errcode = '22023';
  end if;
  insert into public.content_entries(content_type, author_id, item_id, title, body)
  values('creator_update', auth.uid(), target_item_id, btrim(update_title), btrim(update_body))
  returning id into entry_id;
  insert into public.content_update_details(entry_id, version_label)
  values(entry_id, nullif(btrim(update_version_label), ''));
  return entry_id;
end;
$$;

revoke all on function public.create_content_update(uuid, text, text, text) from public, anon;
grant execute on function public.create_content_update(uuid, text, text, text) to authenticated, service_role;
