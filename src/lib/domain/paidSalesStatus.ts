import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';

type PublicPaidSalesStatus = {
  creator_id: string;
  can_sell_paid: boolean;
  state: string;
};

export async function hydratePaidSalesStatus(products: Product[]) {
  const creatorIds = [...new Set(products.map(product => product.author_id).filter((id): id is string => Boolean(id)))];
  const itemIds = [...new Set(products.map(product => product.id))];
  const [statusResult, offerResult] = await Promise.all([
    creatorIds.length
      ? supabase.rpc('get_creator_paid_sales_public_status' as never, { target_creator_ids: creatorIds } as never)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase.from('catalog_offers').select('item_id').in('item_id', itemIds).eq('status', 'active').gt('price_cents', 0)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (statusResult.error) {
    // The public Store must remain browsable while a newer application build is
    // waiting for its reviewed commerce migration to reach the linked project.
    // Missing enrichment fails closed: no creator is presented as paid-enabled.
    if (['PGRST202', '42883'].includes(statusResult.error.code ?? '')) {
      return products.map(product => ({ ...product, paid_sales_available: false, paid_sales_status: 'not_deployed', paid_offer_available: false }));
    }
    throw statusResult.error;
  }
  if (offerResult.error) throw offerResult.error;
  const statusByCreator = new Map(((statusResult.data ?? []) as unknown as PublicPaidSalesStatus[]).map(row => [row.creator_id, row]));
  const paidOfferItemIds = new Set((offerResult.data ?? []).map(row => row.item_id));
  return products.map(product => {
    const status = product.author_id ? statusByCreator.get(product.author_id) : null;
    return {
      ...product,
      paid_sales_available: status?.can_sell_paid ?? false,
      paid_sales_status: status?.state ?? 'not_reviewed',
      paid_offer_available: paidOfferItemIds.has(product.id),
    };
  });
}
