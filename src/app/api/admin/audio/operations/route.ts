import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { audioApiError } from '@/lib/server/audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const admin = commerceAdminClient();
    const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.role !== 'admin') return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const [assetsResult, jobsResult, cleanupResult, runsResult] = await Promise.all([
      admin.from('audio_assets' as never).select('status,source_byte_size,stream_byte_size,retention_mode,source_deleted_at'),
      admin.from('audio_processing_jobs' as never).select('status,attempts,next_attempt_at,last_error_code,last_error_message,updated_at').order('updated_at', { ascending: false }).limit(100),
      admin.from('audio_cleanup_queue' as never).select('status,reason,not_before,last_error').order('created_at', { ascending: false }).limit(100),
      admin.from('audio_reconciliation_runs' as never).select('*').order('started_at', { ascending: false }).limit(20),
    ]);
    const error = assetsResult.error || jobsResult.error || cleanupResult.error || runsResult.error;
    if (error) throw error;
    const assets = (assetsResult.data ?? []) as unknown as Array<{ status: string; source_byte_size: number; stream_byte_size: number | null; retention_mode: string; source_deleted_at: string | null }>;
    const counts = (values: Array<{ status: string }>) => values.reduce<Record<string, number>>((result, row) => {
      result[row.status] = (result[row.status] ?? 0) + 1;
      return result;
    }, {});
    return Response.json({
      featureEnabled: process.env.NEXT_PUBLIC_AUDIO_PIPELINE_ENABLED === 'true',
      assets: {
        count: assets.length,
        status: counts(assets),
        sourceBytes: assets.reduce((sum, asset) => sum + Number(asset.source_byte_size || 0), 0),
        streamBytes: assets.reduce((sum, asset) => sum + Number(asset.stream_byte_size || 0), 0),
        retained: assets.filter(asset => ['retain', 'legacy_public'].includes(asset.retention_mode)).length,
        sourceDeleted: assets.filter(asset => Boolean(asset.source_deleted_at)).length,
      },
      jobs: { counts: counts((jobsResult.data ?? []) as unknown as Array<{ status: string }>), recent: jobsResult.data ?? [] },
      cleanup: { counts: counts((cleanupResult.data ?? []) as unknown as Array<{ status: string }>), recent: cleanupResult.data ?? [] },
      reconciliationRuns: runsResult.data ?? [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return audioApiError(error, 'Audio operations diagnostics are unavailable.');
  }
}
