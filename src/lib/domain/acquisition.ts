import type { Product } from '@/lib/products';
import { saveItemToLibrary } from '@/lib/domain/itemDetails';
import { supabase } from '@/lib/supabase';

export async function getCartCatalogItems(itemIds: string[]) {
  if (itemIds.length === 0) return [] as Product[];
  const result = await supabase.from('catalog_items').select('*').in('id', itemIds);
  if (result.error) throw result.error;
  return (result.data as Product[] | null) ?? [];
}

export async function saveFreeCartToLibrary(userId: string, itemIds: string[]) {
  await Promise.all(itemIds.map(itemId => saveItemToLibrary(userId, itemId)));
}
