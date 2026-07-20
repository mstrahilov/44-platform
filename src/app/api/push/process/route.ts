import { authenticateEmailRequest, authorizeScheduledEmailWorker } from '@/lib/server/email';
import { processWebPushOutbox } from '@/lib/server/webPush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function process() {
  try {
    const delivery = await processWebPushOutbox(20);
    return Response.json({ processed: true, delivery }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ processed: false }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  try { await authenticateEmailRequest(request); }
  catch { return Response.json({ error: 'Authentication is required.' }, { status: 401 }); }
  return process();
}

export async function GET(request: Request) {
  try { authorizeScheduledEmailWorker(request); }
  catch { return Response.json({ error: 'Authorization failed.' }, { status: 401 }); }
  return process();
}
