-- Supabase default function privileges grant anon directly. Remove that grant
-- from every M10 authenticated/admin operation in addition to PUBLIC revocation.

revoke execute on function public.catalog_item_health(uuid) from anon;
revoke execute on function public.list_managed_catalog_health() from anon;
revoke execute on function public.set_owned_item_publication_status(uuid, text) from anon;
revoke execute on function public.set_profile_role(uuid, text) from anon;
revoke execute on function public.is_platform_admin() from anon;

-- This boolean is used by storage RLS for authenticated uploads only.
revoke execute on function public.is_approved_publisher(uuid) from anon;

grant execute on function public.catalog_item_health(uuid) to authenticated, service_role;
grant execute on function public.list_managed_catalog_health() to authenticated, service_role;
grant execute on function public.set_owned_item_publication_status(uuid, text) to authenticated, service_role;
grant execute on function public.set_profile_role(uuid, text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.is_approved_publisher(uuid) to authenticated, service_role;
