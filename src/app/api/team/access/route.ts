import { getTeamRequestAccess, teamErrorResponse } from '@/lib/server/team';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { access } = await getTeamRequestAccess(request);
    return Response.json(access, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) { return teamErrorResponse(error); }
}
