import { isV1AchievementCode } from '@/lib/achievementCatalog';
import type { Database } from '@/lib/database.types';
import { getProductExperience } from '@/lib/experience';
import type { Product } from '@/lib/products';
import type { ProductAchievement, Track, UserAchievement } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import { getPublicNativeContent } from '@/lib/domain/nativeContent';

export type DetailedLibraryItemRow = {
  id: string;
  item_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
};

export type ItemAssetManifestRow = Database['public']['Functions']['list_item_asset_manifest']['Returns'][number];

export async function getDetailedLibraryItem(userId: string, libraryEntryId: string) {
  const result = await supabase
    .from('library_entries')
    .select('id,item_id,acquisition_type,acquired_at,status,products:catalog_items(*, creators:profiles!author_id(*))')
    .eq('id', libraryEntryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data as unknown as DetailedLibraryItemRow | null;
}

export async function getLibraryItemBundle(userId: string, libraryEntryId: string) {
  const row = await getDetailedLibraryItem(userId, libraryEntryId);
  if (!row?.products) return null;

  const [trackResult, achievementResult, unlockedResult, assetResult, nativeContent] = await Promise.all([
    supabase
      .from('tracks')
      .select('id,item_id,number,title,duration_seconds,audio_url,download_url')
      .eq('item_id', row.item_id)
      .order('number'),
    supabase
      .from('item_achievements')
      .select('id,item_id,code,title,description,trigger_type,trigger_config,reward_item_id,reward_config,points,icon,sort_order,is_secret')
      .eq('item_id', row.item_id)
      .order('sort_order'),
    supabase
      .from('user_achievements')
      .select('id,user_id,achievement_id,item_id,unlocked_at')
      .eq('user_id', userId)
      .eq('item_id', row.item_id),
    supabase.rpc('list_item_asset_manifest', { target_item_id: row.item_id }),
    getPublicNativeContent(row.item_id),
  ]);

  const error = trackResult.error || achievementResult.error || unlockedResult.error || assetResult.error;
  if (error) throw error;

  const authorizedAssets = await Promise.all(((assetResult.data ?? []) as ItemAssetManifestRow[]).map(async asset => {
    if (!asset.is_unlocked || !asset.storage_path) return asset;
    const signed = await supabase.storage.from('item-files').createSignedUrl(asset.storage_path, 300);
    if (signed.error) throw signed.error;
    return { ...asset, file_url: signed.data.signedUrl };
  }));

  const isMusic = getProductExperience(row.products) === 'music';
  return {
    row,
    tracks: (trackResult.data ?? []) as Track[],
    achievements: isMusic
      ? ((achievementResult.data ?? []) as ProductAchievement[]).filter(item => isV1AchievementCode(item.code))
      : [],
    unlockedAchievements: (unlockedResult.data ?? []) as UserAchievement[],
    assets: authorizedAssets,
    nativeContent,
  };
}

export async function getCatalogItem(identifier: string) {
  const query = supabase.from('catalog_items').select('*, creators:profiles!author_id(*), external_links:item_external_links(id,label,platform,url,sort_order)');
  const result = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    ? query.eq('id', identifier)
    : query.eq('slug', identifier)
  ).maybeSingle();

  if (result.error) throw result.error;
  const item = result.data as Product | null;
  if (!item) return null;
  const [categoryResult, typeAssignmentResult, tagAssignmentResult] = await Promise.all([
    item.item_category_id
      ? supabase.from('item_categories').select('id,name,slug').eq('id', item.item_category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('item_type_assignments').select('item_types(*)').eq('item_id', item.id).maybeSingle(),
    supabase.from('item_tag_assignments').select('item_tags(*)').eq('item_id', item.id),
  ]);
  const taxonomyError = categoryResult.error || typeAssignmentResult.error || tagAssignmentResult.error;
  if (taxonomyError) throw taxonomyError;
  const typeRow = typeAssignmentResult.data?.item_types;
  return {
    ...item,
    browse_category: categoryResult.data ? { id: categoryResult.data.id, label: categoryResult.data.name, slug: categoryResult.data.slug } : null,
    browse_type: Array.isArray(typeRow) ? typeRow[0] ?? null : typeRow ?? null,
    browse_tags: (tagAssignmentResult.data ?? []).flatMap(row => {
      const tag = row.item_tags;
      return Array.isArray(tag) ? tag : tag ? [tag] : [];
    }),
  } as Product;
}

export async function listRelatedCatalogItems(item: Product, limit = 4) {
  const query = supabase
    .from('catalog_items')
    .select('*, creators:profiles!author_id(*)')
    .eq('status', 'published')
    .neq('id', item.id)
    .limit(getProductExperience(item) === 'physical' ? 12 : limit);
  const result = await (item.author_id
    ? query.eq('author_id', item.author_id)
    : query.eq('creator', item.creator));

  if (result.error) throw result.error;
  const rows = (result.data ?? []) as Product[];
  return getProductExperience(item) === 'physical'
    ? rows.filter(candidate => getProductExperience(candidate) === 'physical').slice(0, limit)
    : rows.slice(0, limit);
}

export async function getItemLibraryOwnership(userId: string, itemId: string) {
  const result = await supabase
    .from('library_entries')
    .select('id,item_id,acquisition_type')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .neq('status', 'hidden')
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

export async function saveItemToLibrary(userId: string, itemId: string) {
  const saveResult = await supabase.rpc('save_item_to_library', { target_item_id: itemId });
  if (saveResult.error) throw saveResult.error;
  return getItemLibraryOwnership(userId, itemId);
}

export async function recordItemShareVisit(itemId: string, referrerId: string) {
  const result = await supabase.rpc('record_item_share_visit', {
    target_item_id: itemId,
    target_referrer_id: referrerId,
  });
  if (result.error) throw result.error;
}
