begin;

create or replace function public.record_creator_earnings_adjustment(
  target_order_id uuid,target_event_id text,target_entry_type text,
  target_amount_cents integer,target_sign integer
) returns integer language plpgsql security definer set search_path=public as $$
declare inserted_total integer; existing_refund_total integer:=0; reference_suffix text:='';
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_entry_type not in ('refund','dispute','adjustment') or target_amount_cents<0 or target_sign not in (-1,1) then
    raise exception 'Invalid creator earnings adjustment.' using errcode='22023';
  end if;
  if target_amount_cents=0 then return 0; end if;
  if target_entry_type='refund' then
    select coalesce(-sum(entry.amount_cents),0)::integer into existing_refund_total
    from public.creator_earnings_entries entry
    join public.commerce_order_items order_line on order_line.id=entry.order_item_id
    where order_line.order_id=target_order_id and entry.entry_type='refund';
    reference_suffix:=':'||(existing_refund_total+target_amount_cents)::text;
  end if;
  with eligible as (
    select line.*,
      row_number() over(order by line.id) as row_number,
      count(*) over() as row_count,
      floor(target_amount_cents::numeric*line.line_total_cents/greatest(sum(line.line_total_cents) over(),1))::integer as base_amount
    from public.commerce_order_items line
    where line.order_id=target_order_id and line.seller_id is not null
  ), allocated as (
    select eligible.*,
      base_amount+case when row_number=row_count then target_amount_cents-sum(base_amount) over() else 0 end as allocated_amount
    from eligible
  ), inserted as (
    insert into public.creator_earnings_entries(
      creator_id,order_item_id,entry_type,amount_cents,currency,source_provider,source_reference,metadata
    )
    select allocated.seller_id,allocated.id,target_entry_type,target_sign*allocated.allocated_amount,
      allocated.currency,'stripe',allocated.id||':'||target_event_id||':'||target_entry_type||reference_suffix,
      jsonb_build_object('order_id',target_order_id,'provider_event_id',target_event_id,
        'cumulative_refund_earnings_cents',case when target_entry_type='refund' then existing_refund_total+target_amount_cents else null end)
    from allocated where allocated.allocated_amount>0
    on conflict do nothing returning abs(amount_cents)::integer as amount_cents
  ) select coalesce(sum(amount_cents),0)::integer into inserted_total from inserted;
  return inserted_total;
end;
$$;

with refund_totals as (
  select orders.id as order_id,
    least(orders.refunded_cents,orders.subtotal_cents) as expected_refund_earnings,
    coalesce(-sum(entries.amount_cents) filter(where entries.entry_type='refund'),0)::integer as recorded_refund_earnings
  from public.commerce_orders orders
  left join public.commerce_order_items lines on lines.order_id=orders.id
  left join public.creator_earnings_entries entries on entries.order_item_id=lines.id
  where orders.refunded_cents>0
  group by orders.id,orders.refunded_cents,orders.subtotal_cents
), eligible as (
  select lines.*,totals.expected_refund_earnings,totals.recorded_refund_earnings,
    totals.expected_refund_earnings-totals.recorded_refund_earnings as missing_amount,
    row_number() over(partition by lines.order_id order by lines.id) as row_number,
    count(*) over(partition by lines.order_id) as row_count,
    floor((totals.expected_refund_earnings-totals.recorded_refund_earnings)::numeric*lines.line_total_cents
      /greatest(sum(lines.line_total_cents) over(partition by lines.order_id),1))::integer as base_amount
  from refund_totals totals
  join public.commerce_order_items lines on lines.order_id=totals.order_id and lines.seller_id is not null
  where totals.expected_refund_earnings>totals.recorded_refund_earnings
), allocated as (
  select eligible.*,
    base_amount+case when row_number=row_count then missing_amount-sum(base_amount) over(partition by order_id) else 0 end as allocated_amount
  from eligible
)
insert into public.creator_earnings_entries(
  creator_id,order_item_id,entry_type,amount_cents,currency,source_provider,source_reference,metadata
)
select seller_id,id,'refund',-allocated_amount,currency,'stripe',
  id||':refund-reconciliation-20260716031000:refund:'||expected_refund_earnings,
  jsonb_build_object('order_id',order_id,'reason','incremental refund reconciliation',
    'cumulative_refund_earnings_cents',expected_refund_earnings)
from allocated where allocated_amount>0
on conflict do nothing;

revoke all on function public.record_creator_earnings_adjustment(uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.record_creator_earnings_adjustment(uuid,text,text,integer,integer) to service_role;

commit;
