import {
  authenticateSellerRequest,
  sellerErrorResponse,
  storeSignedTaxForm,
} from '@/lib/server/sellerOnboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateSellerRequest(request);
    return Response.json(await storeSignedTaxForm(user.id, await request.formData()), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return sellerErrorResponse(error);
  }
}
