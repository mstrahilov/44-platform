import type { Database } from '@/lib/database.types';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { beatReviewSurfacesEnabled, hydrateBeatProducts } from '@/lib/domain/beats';

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

export async function loadStoreDiscoveryCatalog(limit = 200, reviewOwnerId?: string | null) {
  const reviewDraftResult = beatReviewSurfacesEnabled && reviewOwnerId
    ? await supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('author_id', reviewOwnerId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(limit)
    : { data: [], error: null };
  const [itemResult, capabilityResult, typeResult, tagResult, typeAssignmentResult, tagAssignmentResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('item_capabilities').select('item_id,capability_key'),
    supabase.from('item_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('item_tags').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('item_type_assignments').select('item_id,item_type_id'),
    supabase.from('item_tag_assignments').select('item_id,item_tag_id'),
  ]);
  const error = reviewDraftResult.error || itemResult.error || capabilityResult.error || typeResult.error || tagResult.error || typeAssignmentResult.error || tagAssignmentResult.error;
  if (error) throw error;
  const capabilitiesByItem = new Map<string, string[]>();
  (capabilityResult.data ?? []).forEach(row => {
    capabilitiesByItem.set(row.item_id, [...(capabilitiesByItem.get(row.item_id) ?? []), row.capability_key]);
  });
  const typesById = new Map((typeResult.data ?? []).map(type => [type.id, type]));
  const tagsById = new Map((tagResult.data ?? []).map(tag => [tag.id, tag]));
  const typeByItem = new Map<string, Product['browse_type']>();
  const tagsByItem = new Map<string, Product['browse_tags']>();
  (typeAssignmentResult.data ?? []).forEach(row => typeByItem.set(row.item_id, typesById.get(row.item_type_id) ?? null));
  (tagAssignmentResult.data ?? []).forEach(row => {
    const tag = tagsById.get(row.item_tag_id);
    if (tag) tagsByItem.set(row.item_id, [...(tagsByItem.get(row.item_id) ?? []), tag]);
  });
  const publicItems = (itemResult.data ?? []) as Product[];
  const publicItemIds = new Set(publicItems.map(item => item.id));
  const reviewBeatItems = ((reviewDraftResult.data ?? []) as Product[]).filter(item => {
    const type = typeByItem.get(item.id);
    return !publicItemIds.has(item.id) && type?.slug === 'beat';
  });
  const products = [...publicItems, ...reviewBeatItems].map(item => ({
    ...item,
    capability_keys: capabilitiesByItem.get(item.id) ?? [],
    browse_type: typeByItem.get(item.id) ?? null,
    browse_tags: tagsByItem.get(item.id) ?? [],
  }));
  return hydrateBeatProducts(products);
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
