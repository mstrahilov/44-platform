import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';

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
  return (result.data ?? []) as unknown as LibraryItemRow[];
}

export async function listVisibleLibraryItemIds(userId: string) {
  const result = await supabase
    .from('library_entries')
    .select('item_id,status')
    .eq('user_id', userId);

  if (result.error) throw result.error;
  return (result.data ?? []).flatMap(row => (
    row.item_id && row.status !== 'hidden' ? [row.item_id] : []
  ));
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
  const result = await supabase
    .from('library_entries')
    .update({ status: 'hidden' })
    .eq('id', libraryEntryId)
    .eq('user_id', userId);

  if (result.error) throw result.error;
}
