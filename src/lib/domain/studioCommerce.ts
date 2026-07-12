import type { Database } from '@/lib/database.types';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';

export type LegacyMerchOrder = Database['public']['Tables']['merch_orders']['Row'];

export type StudioPurchaseRow = {
  id: string;
  item_id: string | null;
  acquired_at: string | null;
  products?: Pick<Product, 'title' | 'price_cents'> | Pick<Product, 'title' | 'price_cents'>[] | null;
};

export async function listLegacyCreatorOrders(creatorId: string) {
  const result = await supabase
    .from('merch_orders')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as LegacyMerchOrder[] | null) ?? [];
}

export async function updateLegacyCreatorOrderStatus(
  orderId: string,
  status: 'paid' | 'in_progress' | 'completed' | 'received',
) {
  const patch: Database['public']['Tables']['merch_orders']['Update'] = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  if (status === 'received') patch.received_at = new Date().toISOString();
  const result = await supabase.from('merch_orders').update(patch).eq('id', orderId);
  if (result.error) throw result.error;
}

export async function listLegacyCreatorPurchases(creatorId: string) {
  const itemResult = await supabase.from('catalog_items').select('id').eq('author_id', creatorId);
  if (itemResult.error) throw itemResult.error;
  const itemIds = (itemResult.data ?? []).map(item => item.id);
  if (itemIds.length === 0) return [] as StudioPurchaseRow[];

  const result = await supabase
    .from('library_entries')
    .select('id,item_id,acquired_at,products:catalog_items(title,price_cents)')
    .eq('acquisition_type', 'purchase')
    .in('item_id', itemIds)
    .order('acquired_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as unknown as StudioPurchaseRow[] | null) ?? [];
}
