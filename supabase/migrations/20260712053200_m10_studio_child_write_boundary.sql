-- M10 closes child-row write access when creator approval is revoked and restores
-- an explicit managed write path for Studio achievement configuration.

drop policy if exists tracks_insert_own on public.tracks;
create policy tracks_insert_managed on public.tracks for insert to authenticated
with check (public.can_manage_item(item_id));

drop policy if exists tracks_update_own on public.tracks;
create policy tracks_update_managed on public.tracks for update to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

drop policy if exists tracks_delete_own on public.tracks;
create policy tracks_delete_managed on public.tracks for delete to authenticated
using (public.can_manage_item(item_id));

drop policy if exists product_assets_insert_own on public.item_assets;
create policy item_assets_insert_managed on public.item_assets for insert to authenticated
with check (public.can_manage_item(item_id));

drop policy if exists product_assets_update_own on public.item_assets;
create policy item_assets_update_managed on public.item_assets for update to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

drop policy if exists product_assets_delete_own on public.item_assets;
create policy item_assets_delete_managed on public.item_assets for delete to authenticated
using (public.can_manage_item(item_id));

drop policy if exists item_achievements_manage on public.item_achievements;
create policy item_achievements_manage on public.item_achievements to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

revoke insert, update, delete on public.tracks, public.item_assets, public.item_achievements from anon;

comment on policy item_achievements_manage on public.item_achievements is 'Approved Item managers configure release achievements; achievement grants remain server-authoritative.';
