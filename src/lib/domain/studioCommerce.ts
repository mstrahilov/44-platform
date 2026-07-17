import { supabase } from '@/lib/supabase';

export type CreatorOrderLine = {
  id: string;
  order_id: string;
  item_id: string;
  item_title: string;
  offer_title: string;
  quantity: number;
  line_total_cents: number;
  currency: string;
  fulfillment_status: 'not_required' | 'pending' | 'in_progress' | 'fulfilled' | 'canceled' | 'returned';
  created_at: string;
  order: null | {
    id: string;
    status: string;
    customer_email_snapshot: string | null;
    paid_at: string | null;
    created_at: string;
  };
  address: null | {
    recipient_name: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    region: string;
    postal_code: string;
    country_code: string;
    delivery_notes: string | null;
  };
};

export type CreatorEarningsEntry = {
  id: string;
  order_item_id: string | null;
  entry_type: 'sale' | 'platform_fee' | 'processor_fee' | 'tax' | 'refund' | 'dispute' | 'adjustment' | 'payout';
  amount_cents: number;
  currency: string;
  available_at: string | null;
  created_at: string;
};

export type CreatorPayoutItem = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  failure_code: string | null;
  failure_message: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function listCreatorOrders(creatorId: string) {
  const linesResult = await supabase.from('commerce_order_items')
    .select('id,order_id,item_id,item_title,offer_title,quantity,line_total_cents,currency,fulfillment_status,created_at,order:commerce_orders(id,status,customer_email_snapshot,paid_at,created_at)')
    .eq('seller_id', creatorId)
    .neq('fulfillment_status', 'not_required')
    .order('created_at', { ascending: false });
  if (linesResult.error) throw linesResult.error;
  const rows = (linesResult.data ?? []) as unknown as Omit<CreatorOrderLine, 'address'>[];
  const orderIds = [...new Set(rows.map(row => row.order_id))];
  if (!orderIds.length) return [] as CreatorOrderLine[];
  const addressResult = await supabase.from('commerce_order_addresses').select('*').in('order_id', orderIds);
  if (addressResult.error) throw addressResult.error;
  const addresses = new Map((addressResult.data ?? []).map(address => [address.order_id, address]));
  return rows.map(row => ({ ...row, address: addresses.get(row.order_id) ?? null })) as CreatorOrderLine[];
}

export async function updateCreatorOrderFulfillment(
  orderItemId: string,
  status: 'in_progress' | 'fulfilled' | 'returned',
) {
  const result = await supabase.rpc('update_creator_order_fulfillment', {
    target_order_item_id: orderItemId,
    target_status: status,
  });
  if (result.error) throw result.error;
}

export async function listCreatorEarnings(creatorId: string) {
  const result = await supabase.from('creator_earnings_entries')
    .select('id,order_item_id,entry_type,amount_cents,currency,available_at,created_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []) as CreatorEarningsEntry[];
}

export async function listCreatorPayouts(creatorId: string) {
  const result = await supabase.from('creator_payout_items')
    .select('id,status,amount_cents,currency,failure_code,failure_message,completed_at,created_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []) as CreatorPayoutItem[];
}
