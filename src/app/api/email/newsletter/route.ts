import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return Response.json({ error: 'Authentication is required.' }, { status: 401 });
  let body: { subscribed?: unknown };
  try { body = await request.json() as { subscribed?: unknown }; }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.subscribed !== 'boolean') return Response.json({ error: 'Choose a newsletter preference.' }, { status: 400 });
  const client = createClient<Database>(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.rpc('set_newsletter_consent' as never, { target_subscribed: body.subscribed, target_policy_version: '44os-newsletter-v1', target_source: 'settings' } as never);
  if (result.error) return Response.json({ error: 'Newsletter preference could not be saved.' }, { status: 400 });
  return Response.json({ subscribed: body.subscribed }, { headers: { 'Cache-Control': 'no-store' } });
}

