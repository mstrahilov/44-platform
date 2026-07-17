export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function retiredResponse() {
  return Response.json({
    error: 'Stripe creator payout onboarding is retired. Complete Wise Creator Setup.',
    code: 'stripe_creator_payouts_retired',
  }, {
    status: 410,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST() {
  return retiredResponse();
}

export async function GET() {
  return retiredResponse();
}
