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
  'asset_type' | 'title' | 'file_url' | 'storage_path'
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

export async function listCatalogTaxonomy() {
  const [typeResult, tagResult] = await Promise.all([
    supabase.from('item_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('item_tags').select('*').eq('is_active', true).order('sort_order'),
  ]);
  const error = typeResult.error || tagResult.error;
  if (error) throw error;
  return { types: typeResult.data ?? [], tags: tagResult.data ?? [] };
}

export async function replaceStudioItemTaxonomy(itemId: string, typeId: string, tagIds: string[]) {
  const [typeDelete, tagDelete] = await Promise.all([
    supabase.from('item_type_assignments').delete().eq('item_id', itemId),
    supabase.from('item_tag_assignments').delete().eq('item_id', itemId),
  ]);
  const deleteError = typeDelete.error || tagDelete.error;
  if (deleteError) throw deleteError;
  if (typeId) {
    const inserted = await supabase.from('item_type_assignments').insert({ item_id: itemId, item_type_id: typeId });
    if (inserted.error) throw inserted.error;
  }
  if (tagIds.length > 0) {
    const inserted = await supabase.from('item_tag_assignments').insert(tagIds.map(itemTagId => ({ item_id: itemId, item_tag_id: itemTagId })));
    if (inserted.error) throw inserted.error;
  }
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
    .neq('status', 'archived')
    .maybeSingle();
  if (itemResult.error) throw itemResult.error;
  if (!itemResult.data) return null;

  const [trackResult, assetResult, achievementResult, typeResult, tagResult, linkResult] = await Promise.all([
    supabase.from('tracks').select('*').eq('item_id', itemId).order('number'),
    supabase.from('item_assets').select('asset_type,title,file_url,storage_path').eq('item_id', itemId).order('sort_order'),
    supabase
      .from('item_achievements')
      .select('code,title,description,trigger_type,reward_config,is_secret,icon')
      .eq('item_id', itemId)
      .order('sort_order'),
    supabase.from('item_type_assignments').select('item_type_id').eq('item_id', itemId).maybeSingle(),
    supabase.from('item_tag_assignments').select('item_tag_id').eq('item_id', itemId),
    supabase.from('item_external_links').select('platform,url,sort_order').eq('item_id', itemId).order('sort_order'),
  ]);
  const error = trackResult.error || assetResult.error || achievementResult.error || typeResult.error || tagResult.error || linkResult.error;
  if (error) throw error;

  return {
    item: itemResult.data as Product,
    tracks: (trackResult.data as Track[] | null) ?? [],
    assets: (assetResult.data as StudioAssetSummary[] | null) ?? [],
    achievements: (achievementResult.data as StudioAchievementSummary[] | null) ?? [],
    taxonomyTypeId: typeResult.data?.item_type_id ?? null,
    taxonomyTagIds: (tagResult.data ?? []).map(row => row.item_tag_id),
    externalLinks: (linkResult.data ?? []).map(row => ({ platform: row.platform, url: row.url })),
  };
}

export async function updateStudioItem(itemId: string, ownerId: string, payload: ItemUpdate) {
  if (!ownerId) throw new Error('Could not verify the Item owner.');
  const itemPatch = { ...payload };
  delete itemPatch.status;
  const result = await supabase.rpc('update_owned_item', { target_item_id: itemId, patch: itemPatch });
  if (result.error) throw new Error(result.error.message);
}

export async function setStudioPublicationStatus(itemId: string, status: 'draft' | 'published') {
  const result = await supabase.rpc('set_owned_item_publication_status', {
    target_item_id: itemId,
    target_status: status,
  });
  if (result.error) throw result.error;
}

export async function attestStudioItemRights(itemId: string) {
  const result = await supabase.rpc('attest_owned_item_rights', {
    target_item_id: itemId,
    accepted: true,
    target_policy_version: '2026-07-12-v1',
  });
  if (result.error) throw result.error;
  return result.data;
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
  const achievementSync = await supabase.rpc('sync_managed_item_achievements', {
    target_item_id: itemId,
    achievement_rows: achievements,
  });
  if (achievementSync.error) throw achievementSync.error;
  const assetDelete = await supabase.from('item_assets').delete().eq('item_id', itemId).in('asset_type', featureAssetTypes);
  if (assetDelete.error) throw assetDelete.error;
  await addStudioAssets(assets);
}

export async function archiveStudioItem(itemId: string, ownerId: string) {
  const ownershipResult = await supabase
    .from('catalog_items')
    .select('id')
    .eq('id', itemId)
    .eq('author_id', ownerId)
    .maybeSingle();
  if (ownershipResult.error) throw ownershipResult.error;
  if (!ownershipResult.data) throw new Error('Item not found.');

  const archiveResult = await supabase.rpc('archive_owned_item', { target_item_id: itemId });
  if (archiveResult.error) throw archiveResult.error;
}
