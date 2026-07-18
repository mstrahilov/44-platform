import { supabase } from '@/lib/supabase';

export type CustomerOrderLine = {
  id: string;
  order_id: string;
  item_id: string;
  item_title: string;
  offer_title: string;
  offer_type: string;
  quantity: number;
  line_total_cents: number;
  currency: string;
  fulfillment_status: string;
  library_entry_id: string | null;
  has_active_download: boolean;
};

export type CustomerOrder = {
  id: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  provider: string | null;
  placed_at: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  lines: CustomerOrderLine[];
};

export async function hasCustomerOrders(buyerId: string) {
  const result = await supabase.from('commerce_orders')
    .select('id')
    .eq('buyer_id', buyerId)
    .neq('status', 'draft')
    .limit(1);
  if (result.error) throw result.error;
  return Boolean(result.data?.length);
}

export async function listCustomerOrders(buyerId: string) {
  const ordersResult = await supabase.from('commerce_orders')
    .select('id,status,currency,subtotal_cents,discount_cents,tax_cents,shipping_cents,total_cents,provider,placed_at,paid_at,canceled_at,created_at,updated_at')
    .eq('buyer_id', buyerId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (ordersResult.error) throw ordersResult.error;
  const orders = (ordersResult.data ?? []) as Omit<CustomerOrder, 'lines'>[];
  if (!orders.length) return [] as CustomerOrder[];

  const linesResult = await supabase.from('commerce_order_items')
    .select('id,order_id,item_id,item_title,offer_title,offer_type,quantity,line_total_cents,currency,fulfillment_status')
    .in('order_id', orders.map(order => order.id))
    .order('created_at', { ascending: true });
  if (linesResult.error) throw linesResult.error;
  const lines = (linesResult.data ?? []) as Array<Omit<CustomerOrderLine, 'library_entry_id' | 'has_active_download'>>;
  if (!lines.length) return orders.map(order => ({ ...order, lines: [] }));
  const itemIds = [...new Set(lines.map(line => line.item_id))];
  const [libraryResult, entitlementResult] = await Promise.all([
    supabase.from('library_entries')
      .select('id,item_id')
      .eq('user_id', buyerId)
      .neq('status', 'hidden')
      .in('item_id', itemIds),
    supabase.from('entitlements')
      .select('item_id')
      .eq('user_id', buyerId)
      .eq('entitlement_type', 'download')
      .eq('status', 'active')
      .in('item_id', itemIds),
  ]);
  const accessError = libraryResult.error || entitlementResult.error;
  if (accessError) throw accessError;
  const libraryByItem = new Map((libraryResult.data ?? []).map(entry => [entry.item_id, entry.id]));
  const downloadableItemIds = new Set((entitlementResult.data ?? []).map(entitlement => entitlement.item_id));
  const hydratedLines: CustomerOrderLine[] = lines.map(line => ({
    ...line,
    library_entry_id: libraryByItem.get(line.item_id) ?? null,
    has_active_download: downloadableItemIds.has(line.item_id),
  }));
  return orders.map(order => ({
    ...order,
    lines: hydratedLines.filter(line => line.order_id === order.id),
  }));
}
