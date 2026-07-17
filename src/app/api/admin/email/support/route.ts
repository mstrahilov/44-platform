import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { authenticateEmailRequest } from '@/lib/server/email';
import { commerceAdminClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(request: Request) {
  const user = await authenticateEmailRequest(request);
  const admin = commerceAdminClient();
  const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data?.role !== 'admin') return null;
  return { admin, user };
}

function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization');
  if (!url || !anonKey || !authorization) throw new Error('Authenticated database access is not configured.');
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
}

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'The support operation failed.';
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return errorResponse(new Error('Administrator access required.'), 403);
    const cases = await access.admin.from('support_cases' as never)
      .select('id,case_number,requester_id,requester_email,subject,status,priority,assigned_to,reply_owner,created_at,updated_at,resolved_at')
      .order('updated_at', { ascending: false }).limit(100);
    if (cases.error) throw cases.error;
    const caseIds = ((cases.data ?? []) as unknown as Array<{ id: string }>).map(item => item.id);
    const events = caseIds.length
      ? await access.admin.from('support_case_events' as never)
        .select('id,case_id,event_type,actor_id,visibility,body,metadata,created_at')
        .in('case_id', caseIds).order('created_at', { ascending: true }).limit(1000)
      : { data: [], error: null };
    if (events.error) throw events.error;
    return Response.json({ cases: cases.data ?? [], events: events.data ?? [], currentUserId: access.user.id }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return errorResponse(new Error('Administrator access required.'), 403);
    const body = await request.json() as {
      action?: unknown;
      caseId?: unknown;
      status?: unknown;
      note?: unknown;
      replyBody?: unknown;
    };
    if (typeof body.caseId !== 'string') throw new Error('Choose an exact support case.');
    const existing = await access.admin.from('support_cases' as never)
      .select('id,status,assigned_to,reply_owner').eq('id', body.caseId).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return errorResponse(new Error('Support case not found.'), 404);
    const supportCase = existing.data as unknown as {
      id: string;
      status: string;
      assigned_to: string | null;
      reply_owner: string | null;
    };
    const userClient = authenticatedClient(request);

    if (body.action === 'claim') {
      const result = await userClient.rpc('update_support_case' as never, {
        target_case_id: supportCase.id,
        target_status: supportCase.status,
        target_assigned_to: access.user.id,
        target_reply_owner: access.user.id,
        target_note: null,
      } as never);
      if (result.error) throw result.error;
      return Response.json({ updated: true });
    }

    if (body.action === 'update') {
      const statuses = ['open', 'waiting_on_support', 'waiting_on_requester', 'resolved', 'closed'];
      if (typeof body.status !== 'string' || !statuses.includes(body.status)) throw new Error('Choose a valid support status.');
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length > 10_000) throw new Error('Internal notes cannot exceed 10,000 characters.');
      const result = await userClient.rpc('update_support_case' as never, {
        target_case_id: supportCase.id,
        target_status: body.status,
        target_assigned_to: supportCase.assigned_to,
        target_reply_owner: supportCase.reply_owner,
        target_note: note || null,
      } as never);
      if (result.error) throw result.error;
      return Response.json({ updated: true });
    }

    if (body.action === 'record_reply') {
      if (typeof body.replyBody !== 'string' || body.replyBody.trim().length < 1 || body.replyBody.trim().length > 10_000) {
        throw new Error('Paste the reply sent from iCloud (1–10,000 characters).');
      }
      const result = await userClient.rpc('record_support_reply' as never, {
        target_case_id: supportCase.id,
        target_body: body.replyBody.trim(),
      } as never);
      if (result.error) throw result.error;
      return Response.json({ recorded: true, eventId: result.data });
    }

    throw new Error('Choose a valid support action.');
  } catch (error) {
    return errorResponse(error);
  }
}
