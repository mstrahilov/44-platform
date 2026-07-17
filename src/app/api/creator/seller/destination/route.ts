import {
  authenticateSellerRequest,
  sellerErrorResponse,
  storePayoutDestination,
} from '@/lib/server/sellerOnboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateSellerRequest(request);
    const body = await request.json() as {
      email?: string;
      routeId?: string;
    };
    return Response.json(await storePayoutDestination(user, body), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return sellerErrorResponse(error);
  }
}
