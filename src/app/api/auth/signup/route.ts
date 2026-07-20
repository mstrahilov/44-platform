import { createClient } from '@supabase/supabase-js';
import { COUNTRIES } from '@/lib/marketPreferences';
import { processEmailOutbox } from '@/lib/server/email';
import { getAppPathUrl } from '@/lib/siteUrl';
import { isValidUsername } from '@/lib/usernames';
import type { Database } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SignupBody = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  username?: unknown;
  countryCode?: unknown;
  creatorAccountRequested?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as SignupBody;
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim();
    const username = String(body.username ?? '').trim();
    const countryCode = String(body.countryCode ?? '').trim().toUpperCase();
    const creatorAccountRequested = body.creatorAccountRequested === true;
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (password.length < 8 || password.length > 1_024) return Response.json({ error: 'Use at least 8 characters for your password.' }, { status: 400 });
    if (!displayName || displayName.length > 80) return Response.json({ error: 'Enter your name to create your account.' }, { status: 400 });
    if (!isValidUsername(username)) return Response.json({ error: 'Use 3–32 letters, numbers, or underscores for your username.' }, { status: 400 });
    if (!COUNTRIES.some(country => country.code === countryCode)) return Response.json({ error: 'Choose the country where you live.' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return Response.json({ error: 'Account creation is temporarily unavailable.' }, { status: 503 });
    const auth = createClient<Database>(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const result = await auth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppPathUrl('/'),
        data: {
          display_name: displayName,
          name: displayName,
          username,
          country_code: countryCode,
          creator_account_requested: creatorAccountRequested,
        },
      },
    });
    if (result.error) return Response.json({ error: result.error.message }, { status: result.error.status || 400 });

    // The database has already committed an idempotent Admin notification.
    // Delivery is best effort and can never turn a successful signup into a
    // failed account; the durable outbox and scheduled worker retain retries.
    await processEmailOutbox(5).catch(() => undefined);
    return Response.json({
      userId: result.data.user?.id ?? null,
      creatorAccountRequested,
      session: result.data.session ? {
        accessToken: result.data.session.access_token,
        refreshToken: result.data.session.refresh_token,
      } : null,
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Account creation is temporarily unavailable.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
