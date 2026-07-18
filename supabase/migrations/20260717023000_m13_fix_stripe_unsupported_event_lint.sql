-- Keep the deployed Stripe webhook boundary intact while repairing the
-- unsupported-event response to use its resolved, validated order identity.
do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.process_stripe_webhook_event(text,text,jsonb)'::regprocedure
  ) into function_definition;

  if function_definition is null
    or position('''reason'',''unsupported_event'',''order_id'',order_id' in function_definition) = 0 then
    raise exception 'Expected Stripe webhook function body was not found for the forward lint repair.';
  end if;

  function_definition := replace(
    function_definition,
    '''reason'',''unsupported_event'',''order_id'',order_id',
    '''reason'',''unsupported_event'',''order_id'',resolved_order_id'
  );
  execute function_definition;
end;
$migration$;
