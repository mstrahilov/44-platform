import { authenticateCommerceRequest, checkoutConfigurationPresence, commerceAdminClient, commerceErrorResponse } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await authenticateCommerceRequest(request);
    const requiresPhysical = new URL(request.url).searchParams.get('requires_physical') === 'true';
    const admin = commerceAdminClient();
    const { data, error } = await admin
      .from('commerce_runtime_controls')
      .select('checkout_enabled,stripe_payments_enabled,operating_model_approved_at,terms_version_id,shipping_countries')
      .eq('singleton', true)
      .single();
    if (error) throw error;
    const env = checkoutConfigurationPresence({ includePhysical: requiresPhysical });
    let terms: { id: string; title: string; version: string; body_sha256: string } | null = null;
    if (data.terms_version_id) {
      const result = await admin.from('commerce_terms_versions')
        .select('id,title,version,body_sha256')
        .eq('id', data.terms_version_id)
        .eq('status', 'active')
        .maybeSingle();
      if (result.error) throw result.error;
      terms = result.data;
    }
    const databaseReady = data.checkout_enabled && data.stripe_payments_enabled
      && Boolean(data.operating_model_approved_at) && Boolean(terms)
      && data.shipping_countries.length > 0;
    return Response.json({
      available: databaseReady && Object.values(env).every(Boolean),
      terms: terms ? { id: terms.id, title: terms.title, version: terms.version, sha256: terms.body_sha256 } : null,
      reason: databaseReady && Object.values(env).every(Boolean)
        ? null
        : 'Paid checkout is not yet activated. No card or address information has been collected.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
