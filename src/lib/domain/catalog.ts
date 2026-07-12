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

export async function listPlayableItemTracks(itemId: string) {
  const result = await supabase
    .from('tracks')
    .select('id,title,number,duration_seconds,audio_url')
    .eq('item_id', itemId)
    .order('number');

  if (result.error) throw result.error;
  return (result.data ?? []) as PlayableTrack[];
}
