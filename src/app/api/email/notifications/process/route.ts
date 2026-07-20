import { authenticateEmailRequest, processEmailOutbox } from '@/lib/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await authenticateEmailRequest(request);
    await processEmailOutbox(5);
    return Response.json({ processed: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Notification delivery is best effort. Authoritative signup/publication
    // state is already committed and the durable recovery worker will retry.
    return Response.json({ processed: false }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }
}
