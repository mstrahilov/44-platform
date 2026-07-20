import { AUDIO_SOURCE_BUCKET, audioApiError, requireAudioCreator, safeAudioFilename, validateAudioUpload } from '@/lib/server/audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadIntentBody = { filename?: unknown; contentType?: unknown; byteSize?: unknown };

export async function POST(request: Request) {
  try {
    const access = await requireAudioCreator(request);
    if (!access) return Response.json({ error: 'Approved creator access is required.' }, { status: 403 });
    const body = await request.json() as UploadIntentBody;
    const filename = String(body.filename ?? '').trim();
    const contentType = String(body.contentType ?? 'application/octet-stream').trim().toLowerCase();
    const byteSize = Number(body.byteSize);
    const validationError = validateAudioUpload(filename, contentType, byteSize);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const assetId = crypto.randomUUID();
    const sourcePath = `${access.user.id}/${assetId}/${safeAudioFilename(filename)}`;
    const inserted = await access.admin.from('audio_assets' as never).insert({
      id: assetId,
      owner_id: access.user.id,
      status: 'pending_upload',
      source_bucket: AUDIO_SOURCE_BUCKET,
      source_path: sourcePath,
      original_filename: filename,
      source_content_type: contentType || 'application/octet-stream',
      source_byte_size: byteSize,
    } as never);
    if (inserted.error) throw inserted.error;

    const signed = await access.admin.storage.from(AUDIO_SOURCE_BUCKET).createSignedUploadUrl(sourcePath, { upsert: false });
    if (signed.error || !signed.data) {
      await access.admin.from('audio_assets' as never).delete().eq('id', assetId);
      throw signed.error ?? new Error('Could not create a secure audio upload.');
    }
    return Response.json({
      assetId,
      bucket: AUDIO_SOURCE_BUCKET,
      path: sourcePath,
      token: signed.data.token,
      expiresInSeconds: 7200,
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return audioApiError(error, 'Could not start the audio upload.');
  }
}
