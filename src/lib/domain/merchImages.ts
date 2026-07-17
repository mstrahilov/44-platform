import { supabase } from '@/lib/supabase';

export type MerchProductImage = {
  id: string;
  item_id: string;
  role: 'main' | 'color' | 'bonus';
  color_value: string | null;
  title: string;
  file_url: string;
  sort_order: number;
};

const SCHEMA_NOT_READY_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
const ROLE_ORDER: Record<MerchProductImage['role'], number> = { main: 0, color: 1, bonus: 2 };

export async function listPublicMerchImages(itemId: string): Promise<MerchProductImage[]> {
  const result = await supabase.from('merch_product_images' as never)
    .select('id,item_id,role,color_value,title,file_url,sort_order')
    .eq('item_id', itemId)
    .order('sort_order')
    .order('id');
  if (result.error) {
    if (SCHEMA_NOT_READY_CODES.has(result.error.code ?? '')) return [];
    throw result.error;
  }
  return ((result.data ?? []) as unknown as MerchProductImage[]).sort((left, right) => (
    ROLE_ORDER[left.role] - ROLE_ORDER[right.role]
    || left.sort_order - right.sort_order
    || left.id.localeCompare(right.id)
  ));
}
