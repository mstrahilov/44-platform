import type { Database } from '@/lib/database.types';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';

export type PlayableTrack = Pick<
  Database['public']['Tables']['tracks']['Row'],
  'id' | 'title' | 'number' | 'duration_seconds' | 'audio_url'
>;

export async function listPublishedCatalogItems(limit = 120) {
  const result = await supabase
    .from('catalog_items')
    .select('*, creators:profiles!author_id(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (result.error) throw result.error;
  return (result.data ?? []) as Product[];
}

export async function loadStoreDiscoveryCatalog(limit = 200) {
  const [itemResult, capabilityResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('item_capabilities').select('item_id,capability_key'),
  ]);
  const error = itemResult.error || capabilityResult.error;
  if (error) throw error;
  const capabilitiesByItem = new Map<string, string[]>();
  (capabilityResult.data ?? []).forEach(row => {
    capabilitiesByItem.set(row.item_id, [...(capabilitiesByItem.get(row.item_id) ?? []), row.capability_key]);
  });
  return ((itemResult.data ?? []) as Product[]).map(item => ({
    ...item,
    capability_keys: capabilitiesByItem.get(item.id) ?? [],
  }));
}

export async function listPlayableItemTracks(itemId: string) {
  const result = await supabase
    .from('tracks')
    .select('id,title,number,duration_seconds,audio_url')
    .eq('item_id', itemId)
    .order('number');

  if (result.error) throw result.error;
  return (result.data ?? []) as PlayableTrack[];
}
