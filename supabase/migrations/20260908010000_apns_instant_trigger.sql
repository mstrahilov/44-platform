begin;

-- The Vercel Cron drain (see vercel.json) is a Hobby-plan-compliant
-- once-daily safety net now, not the primary delivery path — a push
-- notification arriving up to 24 hours late defeats the point of a Lock
-- Screen alert. pg_net gives real (~1-2 second) delivery for free: the
-- instant a delivery is queued, this trigger fires an async HTTP call to
-- the same outbox-draining route the cron calls, authorized by a separate,
-- low-privilege secret (APNS_TRIGGER_SECRET) rather than the scheduled-
-- worker CRON_SECRET.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_apns_delivery_queued()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
begin
  perform net.http_get(
    url:='https://app.44os.com/api/push/apns/process',
    headers:=jsonb_build_object(
      'Authorization','Bearer cc640264af4a22205e5802089b6273ac64057c16ddcbb46f8cffeb52d0c3677f'
    ),
    timeout_milliseconds:=3000
  );
  return new;
end;
$$;
revoke all on function public.notify_apns_delivery_queued() from public,anon,authenticated;

drop trigger if exists apns_deliveries_notify_queued on public.apns_deliveries;
create trigger apns_deliveries_notify_queued after insert on public.apns_deliveries
for each row execute function public.notify_apns_delivery_queued();

commit;
