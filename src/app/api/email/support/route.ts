import { authenticateEmailRequest } from '@/lib/server/email';
import { commerceAdminClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await authenticateEmailRequest(request);
    const body = await request.json() as { subject?: unknown; message?: unknown };
    if (typeof body.subject !== 'string' || typeof body.message !== 'string') throw new Error('Invalid support request.');
    const subject = body.subject.trim();
    const message = body.message.trim();
    if (subject.length < 3 || subject.length > 160 || message.length < 1 || message.length > 10_000 || !user.email) throw new Error('Invalid support request.');
    const result = await commerceAdminClient().rpc('create_support_case' as never, { target_requester_id: user.id, target_requester_email: user.email, target_subject: subject, target_body: message } as never);
    if (result.error) throw result.error;
    return Response.json({ created: true, caseId: result.data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Support intake is not available yet. Email support@44os.com for help.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

