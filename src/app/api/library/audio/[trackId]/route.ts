import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { audioApiError } from '@/lib/server/audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function downloadFilename(trackTitle: string, originalFilename: string | null, fallbackUrl: string) {
  const sourceExtension = (originalFilename || fallbackUrl.split('?')[0]?.split('/').pop() || '')
    .split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp3';
  const base = trackTitle.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || '44-track';
  return `${base}.${sourceExtension}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  try {
    const user = await authenticateCommerceRequest(request);
    const admin = commerceAdminClient();
    const { trackId } = await params;
    const trackResult = await admin.from('tracks').select('id,item_id,title,audio_url').eq('id', trackId).maybeSingle();
    if (trackResult.error) throw trackResult.error;
    if (!trackResult.data) return Response.json({ error: 'Track was not found.' }, { status: 404 });
    const [itemResult, profileResult, entitlementResult, assetResult] = await Promise.all([
      admin.from('catalog_items').select('id,author_id,download_purchase_enabled').eq('id', trackResult.data.item_id).maybeSingle(),
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('entitlements').select('id').eq('user_id', user.id).eq('item_id', trackResult.data.item_id)
        .eq('entitlement_type', 'download').eq('status', 'active').maybeSingle(),
      admin.from('audio_assets' as never).select('source_bucket,source_path,original_filename,retention_mode,source_deleted_at')
        .eq('track_id', trackId).maybeSingle(),
    ]);
    const error = itemResult.error || profileResult.error || entitlementResult.error || assetResult.error;
    if (error) throw error;
    const item = itemResult.data;
    if (!item) return Response.json({ error: 'Release was not found.' }, { status: 404 });
    const authorized = item.author_id === user.id || profileResult.data?.role === 'admin' || Boolean(entitlementResult.data);
    if (!authorized) return Response.json({ error: 'A current download entitlement is required.' }, { status: 403 });

    const asset = assetResult.data as unknown as {
      source_bucket: string; source_path: string; original_filename: string;
      retention_mode: string; source_deleted_at: string | null;
    } | null;
    if (asset && asset.source_deleted_at === null && asset.source_bucket !== 'uploads') {
      const filename = downloadFilename(trackResult.data.title, asset.original_filename, asset.source_path);
      const signed = await admin.storage.from(asset.source_bucket).createSignedUrl(asset.source_path, 60, { download: filename });
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error('Could not authorize the master download.');
      return Response.json({ url: signed.data.signedUrl, filename, privateMaster: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Compatibility for current paid MP3 releases: the user explicitly chose
    // to leave these files unchanged instead of duplicating them privately.
    const legacyUrl = trackResult.data.audio_url ?? '';
    if (!/^https:\/\//i.test(legacyUrl)) return Response.json({ error: 'This track does not have a downloadable master.' }, { status: 404 });
    const filename = downloadFilename(trackResult.data.title, asset?.original_filename ?? null, legacyUrl);
    return Response.json({ url: legacyUrl, filename, privateMaster: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return audioApiError(error, 'This download could not be prepared.');
  }
}
