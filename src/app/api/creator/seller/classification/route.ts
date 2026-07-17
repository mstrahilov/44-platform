import {
  authenticateSellerRequest,
  classifySellerWithToken,
  sellerErrorResponse,
} from '@/lib/server/sellerOnboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await authenticateSellerRequest(request);
    const body = await request.json() as {
      sellerType?: string;
      usPersonStatus?: string;
      specialCase?: string;
    };
    return Response.json(await classifySellerWithToken(request, body), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return sellerErrorResponse(error);
  }
}
