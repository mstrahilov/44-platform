import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const checkedAt = new Date().toISOString();
  const release = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_RELEASE || 'development';
  const region = process.env.VERCEL_REGION || 'local';
  if (!url || !key) return NextResponse.json({ status: 'unhealthy', checkedAt, release, region, dependency: 'configuration' }, { status: 503 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${url}/rest/v1/item_categories?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: controller.signal });
    const healthy = response.ok;
    return NextResponse.json({ status: healthy ? 'healthy' : 'degraded', checkedAt, release, region, dependencies: { supabase: response.status } }, { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unhealthy', checkedAt, release, region, dependency: 'supabase' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { clearTimeout(timeout); }
}
