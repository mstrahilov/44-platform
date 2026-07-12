import type { Database } from '@/lib/database.types';
import type { Product } from '@/lib/products';
import type { ProductCategory, Track } from '@/lib/platform';
import { supabase } from '@/lib/supabase';

type ItemInsert = Database['public']['Tables']['catalog_items']['Insert'];
type ItemUpdate = Database['public']['Tables']['catalog_items']['Update'];
type TrackInsert = Database['public']['Tables']['tracks']['Insert'];
type AssetInsert = Database['public']['Tables']['item_assets']['Insert'];
type AchievementInsert = Database['public']['Tables']['item_achievements']['Insert'];

export type StudioAssetSummary = Pick<
  Database['public']['Tables']['item_assets']['Row'],
  'asset_type' | 'title' | 'file_url'
>;

export type StudioAchievementSummary = Pick<
  Database['public']['Tables']['item_achievements']['Row'],
  'code' | 'title' | 'description' | 'trigger_type' | 'reward_config' | 'is_secret' | 'icon'
>;

export async function listItemCategories() {
  const result = await supabase.from('item_categories').select('*').order('sort_order');
  if (result.error) throw result.error;
  return (result.data as ProductCategory[] | null) ?? [];
}

export async function listCatalogTaxonomyTerms() {
  const result = await supabase.from('catalog_taxonomy_terms').select('*').eq('is_active', true).order('sort_order');
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function replaceStudioItemTaxonomy(itemId: string, termIds: string[]) {
  const deleted = await supabase.from('item_taxonomy_terms').delete().eq('item_id', itemId);
  if (deleted.error) throw deleted.error;
  if (termIds.length === 0) return;
  const inserted = await supabase.from('item_taxonomy_terms').insert(termIds.map(termId => ({ item_id: itemId, term_id: termId })));
  if (inserted.error) throw inserted.error;
}

export async function createStudioItem(payload: ItemInsert) {
  const result = await supabase.from('catalog_items').insert(payload).select('id').single();
  if (result.error) throw result.error;
  return result.data.id;
}

export async function addStudioTracks(rows: TrackInsert[]) {
  if (rows.length === 0) return;
  const result = await supabase.from('tracks').insert(rows);
  if (result.error) throw result.error;
}

export async function addStudioAssets(rows: AssetInsert[]) {
  if (rows.length === 0) return;
  const result = await supabase.from('item_assets').insert(rows);
  if (result.error) throw result.error;
}

export async function loadStudioItemEditor(itemId: string, ownerId: string) {
  const itemResult = await supabase
    .from('catalog_items')
    .select('*')
    .eq('id', itemId)
    .eq('author_id', ownerId)
    .maybeSingle();
  if (itemResult.error) throw itemResult.error;
  if (!itemResult.data) return null;

  const [trackResult, assetResult, achievementResult, taxonomyResult] = await Promise.all([
    supabase.from('tracks').select('*').eq('item_id', itemId).order('number'),
    supabase.from('item_assets').select('asset_type,title,file_url').eq('item_id', itemId).order('sort_order'),
    supabase
      .from('item_achievements')
      .select('code,title,description,trigger_type,reward_config,is_secret,icon')
      .eq('item_id', itemId)
      .order('sort_order'),
    supabase.from('item_taxonomy_terms').select('term_id').eq('item_id', itemId),
  ]);
  const error = trackResult.error || assetResult.error || achievementResult.error || taxonomyResult.error;
  if (error) throw error;

  return {
    item: itemResult.data as Product,
    tracks: (trackResult.data as Track[] | null) ?? [],
    assets: (assetResult.data as StudioAssetSummary[] | null) ?? [],
    achievements: (achievementResult.data as StudioAchievementSummary[] | null) ?? [],
    taxonomyTermIds: (taxonomyResult.data ?? []).map(row => row.term_id),
  };
}

export async function updateStudioItem(itemId: string, ownerId: string, payload: ItemUpdate) {
  const result = await supabase.from('catalog_items').update(payload).eq('id', itemId).eq('author_id', ownerId);
  if (result.error) throw result.error;
}

export async function syncStudioTracks(itemId: string, rows: Array<TrackInsert & { id?: string }>, deletedIds: string[]) {
  for (const row of rows) {
    const { id, ...payload } = row;
    const result = id
      ? await supabase.from('tracks').update(payload).eq('id', id).eq('item_id', itemId)
      : await supabase.from('tracks').insert(payload);
    if (result.error) throw result.error;
  }
  if (deletedIds.length > 0) {
    const result = await supabase.from('tracks').delete().in('id', deletedIds).eq('item_id', itemId);
    if (result.error) throw result.error;
  }
}

export async function replaceStudioAsset(itemId: string, assetType: string, asset: AssetInsert) {
  const deleteResult = await supabase.from('item_assets').delete().eq('item_id', itemId).eq('asset_type', assetType);
  if (deleteResult.error) throw deleteResult.error;
  await addStudioAssets([asset]);
}

export async function replaceStudioReleaseFeatures(
  itemId: string,
  featureAssetTypes: string[],
  achievements: AchievementInsert[],
  assets: AssetInsert[],
) {
  const achievementDelete = await supabase.from('item_achievements').delete().eq('item_id', itemId);
  if (achievementDelete.error) throw achievementDelete.error;
  const assetDelete = await supabase.from('item_assets').delete().eq('item_id', itemId).in('asset_type', featureAssetTypes);
  if (assetDelete.error) throw assetDelete.error;
  if (achievements.length > 0) {
    const result = await supabase.from('item_achievements').insert(achievements);
    if (result.error) throw result.error;
  }
  await addStudioAssets(assets);
}

export async function deleteStudioItem(itemId: string, ownerId: string) {
  const ownershipResult = await supabase
    .from('catalog_items')
    .select('id')
    .eq('id', itemId)
    .eq('author_id', ownerId)
    .maybeSingle();
  if (ownershipResult.error) throw ownershipResult.error;
  if (!ownershipResult.data) throw new Error('Item not found.');

  const tracksResult = await supabase.from('tracks').delete().eq('item_id', itemId);
  if (tracksResult.error) throw tracksResult.error;
  const itemResult = await supabase.from('catalog_items').delete().eq('id', itemId).eq('author_id', ownerId);
  if (itemResult.error) throw itemResult.error;
}
