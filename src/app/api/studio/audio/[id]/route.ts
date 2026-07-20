import { AUDIO_SOURCE_BUCKET, audioApiError, requireAudioCreator } from '@/lib/server/audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const access = await requireAudioCreator(request);
    if (!access) return Response.json({ error: 'Approved creator access is required.' }, { status: 403 });
    const { id } = await context.params;
    const asset = await access.admin.from('audio_assets' as never)
      .select('id,status,stream_public_url,stream_duration_seconds,stream_bitrate_kbps,failure_code,failure_message')
      .eq('id', id).eq('owner_id', access.user.id).maybeSingle();
    if (asset.error) throw asset.error;
    if (!asset.data) return Response.json({ error: 'Audio upload was not found.' }, { status: 404 });
    return Response.json(asset.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return audioApiError(error, 'Could not check audio processing.');
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const access = await requireAudioCreator(request);
    if (!access) return Response.json({ error: 'Approved creator access is required.' }, { status: 403 });
    const { id } = await context.params;
    const asset = await access.admin.from('audio_assets' as never)
      .select('id,status,source_path,source_byte_size')
      .eq('id', id).eq('owner_id', access.user.id).maybeSingle();
    if (asset.error) throw asset.error;
    const row = asset.data as unknown as { id: string; status: string; source_path: string; source_byte_size: number } | null;
    if (!row) return Response.json({ error: 'Audio upload was not found.' }, { status: 404 });
    if (row.status !== 'pending_upload') {
      return Response.json({ accepted: ['uploaded', 'processing', 'ready'].includes(row.status), status: row.status }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const info = await access.admin.storage.from(AUDIO_SOURCE_BUCKET).info(row.source_path);
    if (info.error || !info.data) return Response.json({ error: 'The secure upload has not completed yet.' }, { status: 409 });
    const storedSize = Number(info.data.size ?? 0);
    if (storedSize !== Number(row.source_byte_size)) {
      return Response.json({ error: 'The uploaded file size did not match the selected file. Please upload it again.' }, { status: 409 });
    }
    const updated = await access.admin.from('audio_assets' as never)
      .update({ status: 'uploaded', updated_at: new Date().toISOString() } as never)
      .eq('id', id).eq('owner_id', access.user.id).eq('status', 'pending_upload');
    if (updated.error) throw updated.error;
    const queued = await access.admin.from('audio_processing_jobs' as never).insert({ audio_asset_id: id } as never);
    if (queued.error && !/duplicate/i.test(queued.error.message)) throw queued.error;
    return Response.json({ accepted: true, status: 'uploaded' }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return audioApiError(error, 'Could not queue this audio file.');
  }
}
