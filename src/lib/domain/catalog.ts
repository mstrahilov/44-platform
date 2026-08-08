import type { Database } from '@/lib/database.types';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { beatReviewSurfacesEnabled, hydrateBeatProducts } from '@/lib/domain/beats';
import { hydratePaidSalesStatus } from '@/lib/domain/paidSalesStatus';
import { localMaskPreviewEnabled, localMaskProduct } from '@/lib/localMaskPreview';

export type PlayableTrack = Pick<
  Database['public']['Tables']['tracks']['Row'],
  'id' | 'title' | 'number' | 'duration_seconds' | 'audio_url'
>;

export type DiscoveryCreator = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'created_at'
>;

export async function listNewDiscoveryCreators(limit = 10): Promise<DiscoveryCreator[]> {
  const result = await supabase
    .from('profiles')
    .select('id,slug,username,display_name,avatar_url,bio,created_at')
    .in('role', ['creator', 'admin'])
    .eq('is_published', true)
    .not('avatar_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (result.error) throw result.error;
  return (result.data ?? []).filter(profile => Boolean(profile.avatar_url)) as DiscoveryCreator[];
}

export async function listHomeFeaturedItemIds(): Promise<string[]> {
  const result = await supabase.rpc('list_home_featured_item_ids');
  if (result.error) return [];
  return (result.data ?? [])
    .sort((a, b) => a.slot_position - b.slot_position)
    .map(entry => entry.item_id);
}

export async function listPublishedCatalogItems(limit = 120) {
  const result = await supabase
    .from('catalog_items')
    .select('*, creators:profiles!author_id(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (result.error) throw result.error;
  return hydratePaidSalesStatus((result.data ?? []) as Product[]);
}

export async function loadStoreDiscoveryCatalog(limit = 200, reviewOwnerId?: string | null) {
  const [itemResult, reviewDraftResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit),
    beatReviewSurfacesEnabled && reviewOwnerId
      ? supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('author_id', reviewOwnerId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(limit)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const itemError = reviewDraftResult.error || itemResult.error;
  if (itemError) throw itemError;

  const publicItems = (itemResult.data ?? []) as Product[];
  const reviewItems = (reviewDraftResult.data ?? []) as Product[];
  const itemIds = [...new Set([...publicItems, ...reviewItems].map(item => item.id))];
  const [capabilityResult, typeAssignmentResult, tagAssignmentResult] = itemIds.length > 0
    ? await Promise.all([
      supabase.from('item_capabilities').select('item_id,capability_key').in('item_id', itemIds),
      supabase.from('item_type_assignments').select('item_id,item_type_id').in('item_id', itemIds),
      supabase.from('item_tag_assignments').select('item_id,item_tag_id').in('item_id', itemIds),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ];
  const assignmentError = capabilityResult.error || typeAssignmentResult.error || tagAssignmentResult.error;
  if (assignmentError) throw assignmentError;

  const typeIds = [...new Set((typeAssignmentResult.data ?? []).map(row => row.item_type_id))];
  const tagIds = [...new Set((tagAssignmentResult.data ?? []).map(row => row.item_tag_id))];
  const [typeResult, tagResult] = await Promise.all([
    typeIds.length > 0
      ? supabase.from('item_types').select('*').in('id', typeIds).eq('is_active', true).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    tagIds.length > 0
      ? supabase.from('item_tags').select('*').in('id', tagIds).eq('is_active', true).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
  ]);
  const error = typeResult.error || tagResult.error;
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
  const publicItemIds = new Set(publicItems.map(item => item.id));
  const reviewBeatItems = reviewItems.filter(item => {
    const type = typeByItem.get(item.id);
    return !publicItemIds.has(item.id) && type?.slug === 'beat';
  });
  const products = [...publicItems, ...reviewBeatItems].map(item => ({
    ...item,
    capability_keys: capabilitiesByItem.get(item.id) ?? [],
    browse_type: typeByItem.get(item.id) ?? null,
    browse_tags: tagsByItem.get(item.id) ?? [],
  }));
  const hydrated = await hydrateBeatProducts(await hydratePaidSalesStatus(products));
  return localMaskPreviewEnabled && !hydrated.some(item => item.id === localMaskProduct.id)
    ? [...hydrated, localMaskProduct]
    : hydrated;
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
