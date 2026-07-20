import { authenticateEmailRequest } from '@/lib/server/email';
import { commerceAdminClient } from '@/lib/server/commerce';
import { webPushConfigurationPresence } from '@/lib/server/webPush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

async function authorized(request: Request) {
  const user = await authenticateEmailRequest(request);
  return { user, admin: commerceAdminClient() };
}

export async function POST(request: Request) {
  try {
    if (!webPushConfigurationPresence()) return Response.json({ error: 'Push notifications are unavailable.' }, { status: 503 });
    const { user, admin } = await authorized(request);
    const body = await request.json() as SubscriptionBody;
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
    const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh.trim() : '';
    const auth = typeof body.keys?.auth === 'string' ? body.keys.auth.trim() : '';
    if (!endpoint || !p256dh || !auth || endpoint.length > 4096 || p256dh.length > 512 || auth.length > 256) {
      return Response.json({ error: 'Invalid push subscription.' }, { status: 400 });
    }
    const result = await admin.from('web_push_subscriptions' as never).upsert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get('user-agent')?.slice(0, 512) || null,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: 'endpoint' });
    if (result.error) throw result.error;
    return Response.json({ subscribed: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Push subscription could not be saved.' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, admin } = await authorized(request);
    const body = await request.json() as SubscriptionBody;
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
    if (!endpoint) return Response.json({ error: 'Invalid push subscription.' }, { status: 400 });
    const result = await admin.from('web_push_subscriptions' as never).delete().eq('user_id', user.id).eq('endpoint', endpoint);
    if (result.error) throw result.error;
    return Response.json({ subscribed: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Push subscription could not be removed.' }, { status: 401 });
  }
}
