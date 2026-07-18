import { supabase } from '@/lib/supabase';

export type MerchProductImage = {
  id: string;
  item_id: string;
  role: 'color' | 'bonus';
  color_value: string | null;
  title: string;
  file_url: string;
  sort_order: number;
  is_featured: boolean;
};

const SCHEMA_NOT_READY_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
const ROLE_ORDER: Record<MerchProductImage['role'], number> = { color: 0, bonus: 1 };

export async function listPublicMerchImages(itemId: string): Promise<MerchProductImage[]> {
  const result = await supabase.from('merch_product_images' as never)
    .select('id,item_id,role,color_value,title,file_url,sort_order,is_featured')
    .eq('item_id', itemId)
    .order('sort_order')
    .order('id');
  if (result.error) {
    if (SCHEMA_NOT_READY_CODES.has(result.error.code ?? '')) return [];
    throw result.error;
  }
  const variants = await supabase.from('merch_variants' as never).select('option_values,status').eq('item_id', itemId);
  if (variants.error && !SCHEMA_NOT_READY_CODES.has(variants.error.code ?? '')) throw variants.error;
  const activeColors = new Set(((variants.data ?? []) as Array<{ option_values: Record<string, unknown>; status: string }>)
    .filter(variant => variant.status === 'active')
    .map(variant => variant.option_values.color)
    .filter((color): color is string => typeof color === 'string')
    .map(color => color.trim().toLowerCase()));
  return ((result.data ?? []) as unknown as MerchProductImage[])
    .filter(image => image.role !== 'color' || activeColors.has(image.color_value?.trim().toLowerCase() ?? ''))
    .sort((left, right) => (
    Number(right.is_featured) - Number(left.is_featured)
    || ROLE_ORDER[left.role] - ROLE_ORDER[right.role]
    || left.sort_order - right.sort_order
    || left.id.localeCompare(right.id)
  ));
}
