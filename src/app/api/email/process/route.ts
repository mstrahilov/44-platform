import { authorizeEmailWorker, processEmailOutbox, processNewsletterSync } from '@/lib/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    authorizeEmailWorker(request);
    const delivery = await processEmailOutbox();
    let newsletter: Awaited<ReturnType<typeof processNewsletterSync>> = [];
    let newsletterError = false;
    if (process.env.RESEND_NEWSLETTER_TOPIC_ID) {
      try { newsletter = await processNewsletterSync(); }
      catch { newsletterError = true; }
    }
    return Response.json({ processed: true, delivery, newsletter, newsletterError }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Email processing is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
