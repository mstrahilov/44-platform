import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export class NativeRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function nativeBearerToken(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token || token.length > 4096) {
    throw new NativeRequestError(401, 'authentication_required', 'Sign in again to continue.');
  }
  return token;
}

export function nativeUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new NativeRequestError(503, 'service_unavailable', 'Native service access is not configured.');
  }
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function nativeRequestErrorResponse(error: unknown, fallback: string) {
  const known = error instanceof NativeRequestError;
  return Response.json({
    contract_version: 1,
    error: known ? error.message : fallback,
    code: known ? error.code : 'request_failed',
  }, {
    status: known ? error.status : 500,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
