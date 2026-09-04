import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { nativeAppConfiguration } from '@/lib/server/nativeApp';
import {
  NativeRequestError,
  nativeBearerToken,
  nativeRequestErrorResponse,
  nativeUserClient,
} from '@/lib/server/nativeRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGITAL_ASSET_TYPES = new Set([
  'audio', 'book', 'sample_pack', 'sample', 'bonus_content', 'bonus_achievement',
  'commentary_audio', 'behind_the_scenes', 'template', 'music',
  'beat_mp3', 'beat_wav', 'beat_stems', 'other',
]);

type ManifestAsset = {
  id: string;
  item_id: string;
  asset_type: string;
  title: string;
  file_url: string | null;
  storage_path: string | null;
  is_downloadable: boolean;
  is_unlocked: boolean;
};

function safeFilename(title: string, storagePath: string) {
  const extension = storagePath.split('/').at(-1)?.split('.').at(-1)?.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const base = title.normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || '44os-file';
  return `${base}.${extension || 'bin'}`;
}

export async function POST(request: Request) {
  try {
    if (!nativeAppConfiguration().features.protected_assets.enabled) {
      throw new NativeRequestError(503, 'capability_disabled', 'Protected downloads are not available yet.');
    }
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > 8192) {
      throw new NativeRequestError(413, 'request_too_large', 'The protected-asset request is too large.');
    }

    const token = nativeBearerToken(request);
    await authenticateCommerceRequest(request);
    const body = await request.json() as { item_id?: unknown; asset_id?: unknown; purpose?: unknown };
    const itemId = typeof body.item_id === 'string' && UUID.test(body.item_id) ? body.item_id.toLowerCase() : null;
    const assetId = typeof body.asset_id === 'string' && UUID.test(body.asset_id) ? body.asset_id.toLowerCase() : null;
    const purpose = body.purpose === 'read' || body.purpose === 'download' || body.purpose === 'export'
      ? body.purpose
      : null;
    if (!itemId || !assetId || !purpose) {
      throw new NativeRequestError(400, 'invalid_request', 'Choose an exact protected Item asset and action.');
    }

    const userClient = nativeUserClient(token);
    const manifest = await userClient.rpc('list_item_asset_manifest', { target_item_id: itemId });
    if (manifest.error) {
      throw new NativeRequestError(403, 'asset_forbidden', 'A current entitlement is required.');
    }
    const asset = ((manifest.data ?? []) as ManifestAsset[]).find(candidate =>
      candidate.id.toLowerCase() === assetId
      && candidate.item_id.toLowerCase() === itemId
      && candidate.is_unlocked,
    );
    if (!asset || !DIGITAL_ASSET_TYPES.has(asset.asset_type) || (purpose === 'read' && asset.asset_type !== 'book')) {
      throw new NativeRequestError(403, 'asset_forbidden', 'A current entitlement is required.');
    }
    if (purpose !== 'read' && !asset.is_downloadable) {
      throw new NativeRequestError(403, 'download_forbidden', 'This entitlement does not include a download.');
    }

    // Only a `storage_path` asset produces a URL this endpoint can honestly
    // call short-lived: `createSignedUrl` below genuinely expires after
    // `expiresIn` seconds. A legacy `file_url` (pre-M8 cutover, or a
    // non-downloadable asset the private-storage trigger doesn't reach — see
    // `enforce_private_protected_item_asset` in
    // 20260712054200_m8_trusted_achievement_edges.sql) has no such guarantee:
    // it could be a permanent public link. Serving it here while still
    // stamping an `expires_at` on the response would be a false claim in the
    // contract, so this path is refused rather than silently trusted — an
    // asset must be migrated to private `item-files` storage before it can
    // be resolved through this endpoint.
    if (!asset.storage_path) {
      throw new NativeRequestError(409, 'asset_not_migrated', 'This file has not been moved to protected storage yet.');
    }
    const expiresIn = purpose === 'read' ? 900 : 60;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const filename = safeFilename(asset.title, asset.storage_path);
    const signed = await commerceAdminClient().storage.from('item-files').createSignedUrl(
      asset.storage_path,
      expiresIn,
      purpose === 'read' ? undefined : { download: filename },
    );
    if (signed.error || !signed.data?.signedUrl) {
      throw new NativeRequestError(503, 'asset_signing_failed', 'The protected file could not be prepared.');
    }
    const url = signed.data.signedUrl;

    return Response.json({
      contract_version: 1,
      asset_id: asset.id,
      item_id: asset.item_id,
      asset_type: asset.asset_type,
      purpose,
      url,
      filename,
      expires_at: expiresAt,
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    return nativeRequestErrorResponse(error, 'The protected file could not be prepared.');
  }
}
