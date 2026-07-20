import { audioApiError, requireAudioCreator } from '@/lib/server/audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAudioCreator(request);
    if (!access) return Response.json({ error: 'Approved creator access is required.' }, { status: 403 });
    const { id } = await params;
    const result = await access.admin.rpc('retry_owned_audio_asset' as never, { target_asset_id: id } as never);
    if (result.error) throw result.error;
    return Response.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return audioApiError(error, 'Could not retry this audio file.');
  }
}
