import {
  authenticateSellerRequest,
  sellerErrorResponse,
  sellerOnboardingState,
} from '@/lib/server/sellerOnboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await authenticateSellerRequest(request);
    return Response.json(await sellerOnboardingState(user.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return sellerErrorResponse(error);
  }
}
