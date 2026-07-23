import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { hideLocalMask, LOCAL_MASK_LIBRARY_ID, localMaskIsSaved, localMaskProduct } from '@/lib/localMaskPreview';

export type LibraryItemRow = {
  id: string;
  item_id: string | null;
  acquired_at: string | null;
  acquisition_type: string | null;
  status: string;
  products: Product | null;
};

export async function listVisibleLibraryItems(userId: string) {
  const result = await supabase
    .from('library_entries')
    .select('id,item_id,acquired_at,acquisition_type,status,products:catalog_items(*, creators:profiles!author_id(*))')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .neq('status', 'hidden')
    .order('acquired_at', { ascending: false });

  if (result.error) throw result.error;
  const rows = (result.data ?? []) as unknown as LibraryItemRow[];
  return localMaskIsSaved() ? [...rows, {
    id: LOCAL_MASK_LIBRARY_ID,
    item_id: localMaskProduct.id,
    acquired_at: new Date().toISOString(),
    acquisition_type: 'free',
    status: 'visible',
    products: localMaskProduct,
  }] : rows;
}

export async function listVisibleLibraryItemIds(userId: string) {
  const result = await supabase
    .from('library_entries')
    .select('item_id,status')
    .eq('user_id', userId);

  if (result.error) throw result.error;
  const ids = (result.data ?? []).flatMap(row => (
    row.item_id && row.status !== 'hidden' ? [row.item_id] : []
  ));
  return localMaskIsSaved() ? [...ids, localMaskProduct.id] : ids;
}

export async function removeLibraryItem(userId: string, libraryEntryId: string) {
  const result = await supabase
    .from('library_entries')
    .delete()
    .eq('id', libraryEntryId)
    .eq('user_id', userId);

  if (result.error) throw result.error;
}

export async function hideLibraryItem(userId: string, libraryEntryId: string) {
  if (libraryEntryId === LOCAL_MASK_LIBRARY_ID) { hideLocalMask(); return; }
  const result = await supabase
    .from('library_entries')
    .update({ status: 'hidden' })
    .eq('id', libraryEntryId)
    .eq('user_id', userId);

  if (result.error) throw result.error;
}
