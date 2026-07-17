import { supabase } from '@/lib/supabase';

export type MerchVariant = {
  id: string;
  item_id: string;
  code: string;
  display_name: string;
  sku: string | null;
  option_values: Record<string, string>;
  price_cents: number | null;
  image_url: string | null;
  sort_order: number;
  is_default: boolean;
  status: 'active' | 'unavailable' | 'preview';
  availability_status: 'active' | 'discontinued' | 'out_of_stock' | 'temporary_out_of_stock' | 'unknown';
  selectable: boolean;
  source: 'canonical' | 'provider_preview';
};

const SCHEMA_NOT_READY_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

export async function listActiveMerchVariants(itemId: string, productTitle: string): Promise<MerchVariant[]> {
  const result = await supabase
    .from('merch_variants' as never)
    .select('id,item_id,code,display_name,sku,option_values,price_cents,image_url,sort_order,is_default,status')
    .eq('item_id', itemId)
    .in('status', ['active', 'unavailable'])
    .order('sort_order')
    .order('display_name');
  if (result.error && !SCHEMA_NOT_READY_CODES.has(result.error.code ?? '')) {
    throw result.error;
  }
  const canonical = (result.data ?? []).map(row => {
    const variant = row as unknown as Omit<MerchVariant, 'option_values'> & { option_values: unknown };
    return {
      ...variant,
      option_values: isStringRecord(variant.option_values) ? variant.option_values : {},
      availability_status: variant.status === 'active' ? 'active' as const : 'out_of_stock' as const,
      selectable: variant.status === 'active',
      source: 'canonical' as const,
    };
  });
  if (canonical.length) return canonical;
  const response = await fetch(`/api/store/merch/variants?title=${encodeURIComponent(productTitle)}`, { cache: 'no-store' });
  if (!response.ok) return [];
  const payload = await response.json() as { variants?: Array<{
    id: string;
    code: string;
    displayName: string;
    optionValues: Record<string, string>;
    imageUrl: string | null;
    availabilityStatus: MerchVariant['availability_status'];
    selectable: boolean;
    sortOrder: number;
  }> };
  return (payload.variants ?? []).map(variant => ({
    id: variant.id,
    item_id: itemId,
    code: variant.code,
    display_name: variant.displayName,
    sku: null,
    option_values: isStringRecord(variant.optionValues) ? variant.optionValues : {},
    price_cents: null,
    image_url: variant.imageUrl,
    sort_order: variant.sortOrder,
    is_default: false,
    status: 'preview',
    availability_status: variant.availabilityStatus,
    selectable: variant.selectable,
    source: 'provider_preview',
  }));
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every(entry => typeof entry === 'string');
}
