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
  const lines = (linesResult.data ?? []) as CustomerOrderLine[];
  return orders.map(order => ({
    ...order,
    lines: lines.filter(line => line.order_id === order.id),
  }));
}
