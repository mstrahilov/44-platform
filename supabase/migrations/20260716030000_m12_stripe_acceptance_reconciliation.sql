begin;

-- A Stripe endpoint can receive distinct Event objects for the same underlying
-- successful payment. Key processor-fee accounting to the immutable Charge,
-- not the Event, so replayed/recreated events cannot debit the seller twice.
create or replace function public.record_stripe_processor_fee_from_payment_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare fee_amount integer;
declare order_subtotal integer;
declare charge_reference text;
begin
  if new.provider<>'stripe' or new.event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded')
    or new.processing_status<>'processed' then return new;
  end if;
  fee_amount:=coalesce((new.payload->>'processor_fee')::integer,0);
  charge_reference:=nullif(new.payload->>'charge_id','');
  select subtotal_cents into order_subtotal from public.commerce_orders where id=new.order_id;
  if fee_amount<0 or order_subtotal is null or (fee_amount>0 and charge_reference is null) then
    raise exception 'Stripe processor fee evidence is invalid.' using errcode='22000';
  end if;
  if fee_amount=0 then return new; end if;

  with eligible as (
    select line.*,
      row_number() over(order by line.id) as row_number,
      count(*) over() as row_count,
      floor(fee_amount::numeric*line.line_total_cents/greatest(sum(line.line_total_cents) over(),1))::integer as base_amount
    from public.commerce_order_items line
    where line.order_id=new.order_id and line.seller_id is not null
  ), allocated as (
    select eligible.*,
      base_amount+case when row_number=row_count then fee_amount-sum(base_amount) over() else 0 end as allocated_amount
    from eligible
  )
  insert into public.creator_earnings_entries(
    creator_id,order_item_id,entry_type,amount_cents,currency,source_provider,source_reference,available_at,metadata
  )
  select allocated.seller_id,allocated.id,'processor_fee',-allocated.allocated_amount,allocated.currency,
    'stripe',allocated.id||':'||charge_reference||':processor_fee',now()+interval '7 days',
    jsonb_build_object('order_id',new.order_id,'provider_event_id',new.provider_event_id,'charge_id',charge_reference)
  from allocated where allocated.allocated_amount>0
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.record_stripe_processor_fee_from_payment_event() from public,anon,authenticated;

comment on function public.record_stripe_processor_fee_from_payment_event() is
  'Idempotently allocates Stripe-reported processing fees once per Charge across seller lines. Records accounting only and never transfers funds.';

commit;
