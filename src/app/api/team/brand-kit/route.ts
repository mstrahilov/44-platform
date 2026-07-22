import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { requireTeamRequest, teamErrorResponse } from '@/lib/server/team';
import { commerceAdminClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const localFilename = 'forty-four-brand-kit-1.0.zip';

async function localBrandKit(request: Request) {
  const archivePath = path.join(process.cwd(), 'artifacts', 'team-brand-kit', localFilename);
  const bytes = await readFile(archivePath);
  const details = await stat(archivePath);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (new URL(request.url).searchParams.get('download') === '1') {
    return new Response(bytes, { headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': `attachment; filename="${localFilename}"`,
      'Content-Length': String(bytes.length),
      'Content-Type': 'application/zip',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    } });
  }
  return Response.json({
    downloadUrl: '/api/team/brand-kit?download=1',
    localDownload: true,
    version: '1.0',
    filename: localFilename,
    checksum,
    byteSize: bytes.length,
    contents: ['logos', '44os-icons', 'fonts/inter', 'tokens', 'LOGO-USAGE.md', 'README.md', 'manifest-sha256.json'],
    updatedAt: details.mtime.toISOString(),
  }, { headers: {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } });
}

export async function GET(request: Request) {
  try {
    await requireTeamRequest(request);
    if (process.env.NODE_ENV !== 'production') return await localBrandKit(request);
    const admin = commerceAdminClient();
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
