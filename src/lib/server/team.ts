import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';

export class TeamAccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function teamWorkspaceEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.TEAM_WORKSPACE_ENABLED === 'true';
}

function requestToken(request: Request) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

function teamUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new TeamAccessError(503, 'Team access is not configured.');
  return createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getDevelopmentAdminAccess(user: User) {
  if (process.env.NODE_ENV === 'production') return null;
  const profile = await commerceAdminClient().from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error || profile.data?.role !== 'admin') return null;
  return { authorized: true, source: 'admin' as const, profileId: user.id, grantedAt: null };
}

export async function getTeamRequestAccess(request: Request): Promise<{
  user: User;
  access: { authorized: boolean; source: 'admin' | 'grant' | 'none'; profileId?: string; grantedAt?: string | null };
}> {
  if (!teamWorkspaceEnabled()) throw new TeamAccessError(404, 'Team workspace is unavailable.');
  const token = requestToken(request);
  if (!token) throw new TeamAccessError(401, 'Sign in to continue.');
  let user: User;
  try { user = await authenticateCommerceRequest(request); }
  catch { throw new TeamAccessError(401, 'Sign in to continue.'); }
  const result = await teamUserClient(token).rpc('get_my_team_access' as never);
  if (result.error) {
    const developmentAccess = await getDevelopmentAdminAccess(user);
    if (developmentAccess) return { user, access: developmentAccess };
    throw new TeamAccessError(403, 'Team access could not be verified.');
  }
  const access = result.data as unknown as { authorized: boolean; source: 'admin' | 'grant' | 'none'; profileId?: string; grantedAt?: string | null };
  if (!access.authorized) {
    const developmentAccess = await getDevelopmentAdminAccess(user);
    if (developmentAccess) return { user, access: developmentAccess };
  }
  return { user, access };
}

export async function requireTeamRequest(request: Request) {
  const state = await getTeamRequestAccess(request);
  if (!state.access.authorized) throw new TeamAccessError(403, 'Team access is required.');
  return { ...state, admin: commerceAdminClient() };
}

export function teamErrorResponse(error: unknown) {
  const known = error instanceof TeamAccessError;
  return Response.json({ error: known ? error.message : 'The Team request could not be completed.' }, {
    status: known ? error.status : 500,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
