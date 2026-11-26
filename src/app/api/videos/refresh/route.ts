import { refreshCreatorVideoMetadata } from '@/lib/server/creatorVideoMetadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!expected || !supplied || supplied !== expected) throw new Error('Scheduled video refresh authorization failed.');
}

async function run(request: Request) {
  try {
    authorize(request);
    const result = await refreshCreatorVideoMetadata();
    return Response.json({ refreshed: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[video-metadata-refresh]', error instanceof Error ? error.message : 'unknown_error');
    return Response.json({ error: 'Video metadata refresh is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
