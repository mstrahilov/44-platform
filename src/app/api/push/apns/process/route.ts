import { authenticateEmailRequest, authorizeScheduledEmailWorker } from '@/lib/server/email';
import { processApnsOutbox } from '@/lib/server/apns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function drainOutbox(limit: number) {
  try {
    const delivery = await processApnsOutbox(limit);
    return Response.json({ processed: true, delivery }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ processed: false }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }
}

// The Vercel Cron above (once daily — the Hobby plan's cron limit) is only
// a safety net. Real delivery timing comes from a Postgres trigger calling
// this same route directly via pg_net the instant a delivery is queued,
// authorized by this separate low-privilege secret rather than the
// scheduled-worker CRON_SECRET.
function authorizeApnsTrigger(request: Request) {
  const expected = process.env.APNS_TRIGGER_SECRET?.trim();
  const supplied = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!expected || !supplied || supplied !== expected) throw new Error('APNs trigger authorization failed.');
}

export async function POST(request: Request) {
  try { await authenticateEmailRequest(request); }
  catch { return Response.json({ error: 'Authentication is required.' }, { status: 401 }); }
  return drainOutbox(20);
}

export async function GET(request: Request) {
  try {
    authorizeScheduledEmailWorker(request);
    return drainOutbox(20);
  } catch {
    // Fall through to the pg_net trigger's own, separate authorization
    // rather than reject outright — the two are different callers sharing
    // one endpoint.
  }
  try { authorizeApnsTrigger(request); }
  catch { return Response.json({ error: 'Authorization failed.' }, { status: 401 }); }
  // A single just-queued delivery only ever needs a claim of 1 — the daily
  // cron's limit of 20 is for draining whatever this instant path missed.
  return drainOutbox(1);
}
