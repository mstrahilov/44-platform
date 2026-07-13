-- M10 bounded catalog-health reporting for Studio.

create or replace function public.list_managed_catalog_health()
returns table(item_id uuid, issue_count integer, issue_codes text[], issue_messages text[])
language sql
stable
security definer
set search_path = public
as $$
  select item.id,
    count(health.code)::integer,
    coalesce(array_agg(health.code order by health.code) filter (where health.code is not null), '{}'::text[]),
    coalesce(array_agg(health.message order by health.code) filter (where health.message is not null), '{}'::text[])
  from public.catalog_items item
  left join lateral public.catalog_item_health(item.id) health on true
  where item.status <> 'archived' and public.can_manage_item(item.id)
  group by item.id
  order by item.created_at desc;
$$;

revoke all on function public.list_managed_catalog_health() from public;
grant execute on function public.list_managed_catalog_health() to authenticated, service_role;

comment on function public.list_managed_catalog_health() is 'One bounded Studio catalog-health result set for every active Item managed by the caller.';
