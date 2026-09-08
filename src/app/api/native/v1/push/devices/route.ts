import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { apnsConfigurationPresence } from '@/lib/server/apns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DeviceBody = {
  device_token?: unknown;
  environment?: unknown;
};

const TOKEN_PATTERN = /^[0-9a-f]{32,200}$/i;

export async function POST(request: Request) {
  try {
    if (!apnsConfigurationPresence()) return Response.json({ error: 'Push notifications are unavailable.' }, { status: 503 });
    const user = await authenticateCommerceRequest(request);
    const body = await request.json() as DeviceBody;
    const deviceToken = typeof body.device_token === 'string' ? body.device_token.trim().toLowerCase() : '';
    const environment = body.environment === 'production' ? 'production' : body.environment === 'sandbox' ? 'sandbox' : '';
    if (!TOKEN_PATTERN.test(deviceToken) || !environment) {
      return Response.json({ error: 'Invalid device registration.' }, { status: 400 });
    }
    const admin = commerceAdminClient();
    const result = await admin.from('apns_device_tokens' as never).upsert({
      user_id: user.id,
      device_token: deviceToken,
      environment,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: 'device_token' });
    if (result.error) throw result.error;
    return Response.json({ registered: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Device could not be registered.' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const body = await request.json() as DeviceBody;
    const deviceToken = typeof body.device_token === 'string' ? body.device_token.trim().toLowerCase() : '';
    if (!TOKEN_PATTERN.test(deviceToken)) return Response.json({ error: 'Invalid device registration.' }, { status: 400 });
    const admin = commerceAdminClient();
    const result = await admin.from('apns_device_tokens' as never)
      .delete()
      .eq('user_id', user.id)
      .eq('device_token', deviceToken);
    if (result.error) throw result.error;
    return Response.json({ registered: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Device could not be unregistered.' }, { status: 401 });
  }
}
