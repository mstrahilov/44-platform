import type { Database } from '@/lib/database.types';
import type { Product } from '@/lib/products';
import type { CommunityCatalogItem } from '@/lib/communityV11';
import { supabase } from '@/lib/supabase';
import { beatReviewSurfacesEnabled, loadBeatCatalogSummaries } from '@/lib/domain/beats';
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

export async function listCommunityReferenceItems(limit = 120): Promise<CommunityCatalogItem[]> {
  const result = await supabase
    .from('catalog_items')
    .select('id,title,slug,creator,item_type,cover_url,hero_url,creators:profiles!author_id(display_name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (result.error) throw result.error;
  return result.data ?? [];
}

const DISCOVERY_ITEM_SELECT = 'id,author_id,slug,title,creator,item_type,short_description,long_description,price_cents,is_free,featured,tags,cover_url,hero_url,experience_type,fulfillment_type,download_purchase_enabled,status,year,release_date,sort_order,created_at,creators:profiles!author_id(id,slug,username,display_name,avatar_url,country_code,display_currency,home_country_code,home_currency)';

const DISCOVERY_CACHE_TTL_MS = 15_000;
let discoveryCache: {
  ownerId: string | null;
  limit: number;
  expiresAt: number;
  request: Promise<Product[]>;
} | null = null;

export function loadStoreDiscoveryCatalog(limit = 200, reviewOwnerId: string | null = null): Promise<Product[]> {
  if (typeof window === 'undefined') return fetchStoreDiscoveryCatalog(limit, reviewOwnerId);
  if (
    discoveryCache?.ownerId === reviewOwnerId
    && discoveryCache.limit === limit
    && discoveryCache.expiresAt > Date.now()
  ) {
    return discoveryCache.request;
  }
  // The draft review rows belong to a single viewer. Keep one scoped entry in
  // this tab, and let concurrent category loads share its pending request.
  const request = fetchStoreDiscoveryCatalog(limit, reviewOwnerId).then(items => {
    if (discoveryCache?.request === request) discoveryCache.expiresAt = Date.now() + DISCOVERY_CACHE_TTL_MS;
    return items;
  }).catch(error => {
    if (discoveryCache?.request === request) discoveryCache = null;
    throw error;
  });
  discoveryCache = { ownerId: reviewOwnerId, limit, expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS, request };
  return request;
}

async function fetchStoreDiscoveryCatalog(limit: number, reviewOwnerId: string | null) {
  const [itemResult, reviewDraftResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select(DISCOVERY_ITEM_SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit),
    beatReviewSurfacesEnabled && reviewOwnerId
      ? supabase
      .from('catalog_items')
      .select(DISCOVERY_ITEM_SELECT)
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
  const [assignments, paidProducts, beatSummaries] = await Promise.all([
    itemIds.length > 0 ? Promise.all([
      supabase.from('item_capabilities').select('item_id,capability_key').in('item_id', itemIds),
      supabase.from('item_type_assignments').select('item_id,item_types(id,category_id,label,slug,sort_order)').in('item_id', itemIds).eq('item_types.is_active', true),
      supabase.from('item_tag_assignments').select('item_id,item_tags(id,category_id,item_type_id,label,slug,sort_order)').in('item_id', itemIds).eq('item_tags.is_active', true),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ] as const,
    hydratePaidSalesStatus([...publicItems, ...reviewItems]),
    loadBeatCatalogSummaries(itemIds),
  ]);
  const [capabilityResult, typeAssignmentResult, tagAssignmentResult] = assignments;
  const assignmentError = capabilityResult.error || typeAssignmentResult.error || tagAssignmentResult.error;
  if (assignmentError) throw assignmentError;

  const capabilitiesByItem = new Map<string, string[]>();
  (capabilityResult.data ?? []).forEach(row => {
    capabilitiesByItem.set(row.item_id, [...(capabilitiesByItem.get(row.item_id) ?? []), row.capability_key]);
  });
  const typeByItem = new Map<string, Product['browse_type']>();
  const tagsByItem = new Map<string, Product['browse_tags']>();
  (typeAssignmentResult.data ?? []).forEach(row => typeByItem.set(row.item_id, row.item_types));
  (tagAssignmentResult.data ?? []).forEach(row => {
    const tag = row.item_tags;
    if (tag) tagsByItem.set(row.item_id, [...(tagsByItem.get(row.item_id) ?? []), tag]);
  });
  const publicItemIds = new Set(publicItems.map(item => item.id));
  const paidProductsById = new Map(paidProducts.map(item => [item.id, item]));
  const reviewBeatItems = reviewItems.filter(item => {
    const type = typeByItem.get(item.id);
    return !publicItemIds.has(item.id) && type?.slug === 'beat';
  });
  const hydrated = [...publicItems, ...reviewBeatItems].map(item => ({
    ...item,
    ...paidProductsById.get(item.id),
    capability_keys: capabilitiesByItem.get(item.id) ?? [],
    browse_type: typeByItem.get(item.id) ?? null,
    browse_tags: tagsByItem.get(item.id) ?? [],
    beat: beatSummaries.get(item.id),
  }));
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
