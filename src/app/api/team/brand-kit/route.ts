import { requireTeamRequest, teamErrorResponse } from '@/lib/server/team';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { admin } = await requireTeamRequest(request);
    const kitResult = await admin.from('team_brand_kits' as never)
      .select('version,filename,storage_path,checksum_sha256,byte_size,contents,created_at')
      .eq('is_current' as never, true)
      .maybeSingle();
    if (kitResult.error) throw kitResult.error;
    const kit = kitResult.data as unknown as null | {
      version: string; filename: string; storage_path: string; checksum_sha256: string;
      byte_size: number; contents: string[]; created_at: string;
    };
    if (!kit) return Response.json({ error: 'The approved Brand Kit is not available yet.' }, {
      status: 404, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
    const signed = await admin.storage.from('team-brand').createSignedUrl(kit.storage_path, 60, {
      download: kit.filename,
    });
    if (signed.error || !signed.data.signedUrl) throw signed.error ?? new Error('Signed download was not created.');
    return Response.json({
      downloadUrl: signed.data.signedUrl,
      version: kit.version,
      filename: kit.filename,
      checksum: kit.checksum_sha256,
      byteSize: kit.byte_size,
      contents: kit.contents,
      updatedAt: kit.created_at,
      expiresIn: 60,
    }, { headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    } });
  } catch (error) { return teamErrorResponse(error); }
}
