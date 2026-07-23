import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireTeamRequest, teamErrorResponse } from '@/lib/server/team';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireTeamRequest(request);
    const markdown = await readFile(path.join(process.cwd(), 'content', 'team', '44OS_HANDBOOK.md'), 'utf8');
    return Response.json({ markdown }, { headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    } });
  } catch (error) { return teamErrorResponse(error); }
}
