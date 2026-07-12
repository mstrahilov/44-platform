import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';

export type StudioLibraryMetric = {
  id: string;
  item_id: string | null;
  acquisition_type: string | null;
  acquired_at: string | null;
};

export async function listCreatorItems(profileId: string) {
  const result = await supabase
    .from('catalog_items')
    .select('*')
    .eq('author_id', profileId)
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as Product[] | null) ?? [];
}

export async function getCreatorCatalogOverview(profileId: string) {
  const items = await listCreatorItems(profileId);
  const itemIds = items.map(item => item.id);
  if (itemIds.length === 0) return { items, libraryItems: [] as StudioLibraryMetric[] };

  const result = await supabase
    .from('library_entries')
    .select('id,item_id,acquisition_type,acquired_at')
    .in('item_id', itemIds);
  if (result.error) throw result.error;
  return { items, libraryItems: (result.data as StudioLibraryMetric[] | null) ?? [] };
}

export async function setItemPublicationStatus(itemId: string, status: 'published' | 'draft') {
  const result = await supabase.from('catalog_items').update({ status }).eq('id', itemId);
  if (result.error) throw result.error;
}
