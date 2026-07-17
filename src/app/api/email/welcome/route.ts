import { authenticateEmailRequest } from '@/lib/server/email';
import { commerceAdminClient, checkoutSiteUrl } from '@/lib/server/commerce';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await authenticateEmailRequest(request);
    const queued = await commerceAdminClient().rpc('queue_welcome_email' as never, { target_user_id: user.id, target_library_url: `${checkoutSiteUrl()}/library` } as never);
    if (queued.error) throw queued.error;
    return Response.json({ queued: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Welcome email could not be queued.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

