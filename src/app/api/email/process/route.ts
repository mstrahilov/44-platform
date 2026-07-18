import {
  authorizeEmailWorker,
  authorizeScheduledEmailWorker,
  processEmailOutbox,
  processNewsletterSync,
} from '@/lib/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeWorkerError(error: unknown) {
  const value = error instanceof Error ? error.message : 'unknown_worker_error';
  return value
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:sk|rk|re|whsec)_[A-Za-z0-9_-]+/g, '[secret]')
    .slice(0, 240);
}

async function runWorker(request: Request, authorize: (request: Request) => void) {
  try {
    authorize(request);
    const delivery = await processEmailOutbox();
    let newsletter: Awaited<ReturnType<typeof processNewsletterSync>> = [];
    let newsletterError = false;
    if (process.env.RESEND_NEWSLETTER_TOPIC_ID) {
      try { newsletter = await processNewsletterSync(); }
      catch { newsletterError = true; }
    }
    return Response.json({ processed: true, delivery, newsletter, newsletterError }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(`[email-worker] ${safeWorkerError(error)}`);
    return Response.json({ error: 'Email processing is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  return runWorker(request, authorizeEmailWorker);
}

// Vercel invokes configured cron paths with GET and its CRON_SECRET bearer token.
// This is a daily recovery pass; verified provider webhooks run the same durable
// processor immediately so customer messages are not held to the Hobby schedule.
export async function GET(request: Request) {
  return runWorker(request, authorizeScheduledEmailWorker);
}
