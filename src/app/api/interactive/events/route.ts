import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TrustedEventBody = {
  externalEventId: string;
  sessionId: string;
  userId: string;
  itemId: string;
  eventKey: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function signingKeys() {
  try {
    const parsed = JSON.parse(process.env.INTERACTIVE_EVENT_SIGNING_KEYS ?? '{}') as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length >= 32));
  } catch { return {}; }
}

function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const keyId = request.headers.get('x-44-key-id') ?? '';
  const nonce = request.headers.get('x-44-nonce') ?? '';
  const timestamp = request.headers.get('x-44-timestamp') ?? '';
  const suppliedSignature = (request.headers.get('x-44-signature') ?? '').toLowerCase();
  const secret = signingKeys()[keyId];
  const timestampMs = Date.parse(timestamp);
  if (!secret || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(suppliedSignature)
    || !Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60_000) {
    return NextResponse.json({ error: 'Invalid signed event envelope.' }, { status: 401 });
  }

  let body: TrustedEventBody;
  try { body = await request.json() as TrustedEventBody; }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  if (!uuid(body.externalEventId) || !uuid(body.sessionId) || !uuid(body.userId) || !uuid(body.itemId)
    || typeof body.eventKey !== 'string' || !/^[a-z][a-z0-9_.-]{0,79}$/.test(body.eventKey)
    || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload) || !Number.isFinite(Date.parse(body.occurredAt))) {
    return NextResponse.json({ error: 'Invalid trusted event body.' }, { status: 400 });
  }
  const payloadHash = createHash('sha256').update(canonicalJson(body.payload)).digest('hex');
  const signingInput = ['44os-interactive-v1', keyId, timestamp, nonce, body.externalEventId, body.sessionId, body.userId, body.itemId, body.eventKey, body.occurredAt, payloadHash].join('\n');
  const expected = createHmac('sha256', secret).update(signingInput).digest();
  const supplied = Buffer.from(suppliedSignature, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: 'Invalid event signature.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Trusted event ingestion is not configured.' }, { status: 503 });
  const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await admin.rpc('record_trusted_interactive_event' as never, {
    target_external_event_id: body.externalEventId,
    target_replay_nonce: nonce,
    target_signing_key_id: keyId,
    target_signature_sha256: suppliedSignature,
    target_session_id: body.sessionId,
    target_user_id: body.userId,
    target_item_id: body.itemId,
    target_event_key: body.eventKey,
    event_payload: body.payload,
    target_occurred_at: body.occurredAt,
  } as never);
  if (result.error) {
    const replay = result.error.code === '23505';
    return NextResponse.json({ error: replay ? 'Event already accepted.' : 'Trusted event was rejected.' }, { status: replay ? 409 : 400 });
  }
  return NextResponse.json({ accepted: true, result: result.data }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
