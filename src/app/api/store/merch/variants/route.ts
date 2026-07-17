import { previewPrintfulStorefrontVariants } from '@/lib/server/printful';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LAUNCH_MERCH = new Set([
  '44 T-Shirt', '44 Windbreaker', '44 Hat', '44 Hoodie',
  '44 Bag', '44 Sweatshirt', '44 Beanie', '44 Tote',
]);

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_COMMERCE_TEST_MODE !== 'true') {
    return Response.json({ variants: [] }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const title = new URL(request.url).searchParams.get('title')?.trim() ?? '';
  if (!LAUNCH_MERCH.has(title)) {
    return Response.json({ variants: [] }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    return Response.json({ variants: await previewPrintfulStorefrontVariants(title), source: 'provider_preview' }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch {
    return Response.json({ variants: [], source: 'provider_preview' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
