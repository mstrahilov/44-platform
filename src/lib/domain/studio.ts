import type { Product } from '@/lib/products';
import type { Database } from '@/lib/database.types';
import { isMissingFunctionError } from '@/lib/schemaCompat';
import { supabase } from '@/lib/supabase';

export type StudioLibraryMetric = {
  id: string;
  item_id: string | null;
  acquisition_type: string | null;
  acquired_at: string | null;
};

export type StudioCatalogHealth = Database['public']['Functions']['list_managed_catalog_health']['Returns'][number];

export type StudioSubmissionStatus = Pick<
  Database['public']['Tables']['item_submissions']['Row'],
  'id' | 'item_id' | 'status' | 'submission_kind' | 'submitted_at' | 'decision_reason'
>;

export async function listCreatorItems(profileId: string) {
  const result = await supabase
    .from('catalog_items')
    .select('*')
    .eq('author_id', profileId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  const items = (result.data as Product[] | null) ?? [];
  if (items.length === 0) return items;
  const assignmentResult = await supabase.from('item_type_assignments').select('item_id,item_type_id').in('item_id', items.map(item => item.id));
  if (assignmentResult.error) throw assignmentResult.error;
  const typeIds = Array.from(new Set((assignmentResult.data ?? []).map(row => row.item_type_id)));
  const typeResult = typeIds.length ? await supabase.from('item_types').select('*').in('id', typeIds) : { data: [], error: null };
  if (typeResult.error) throw typeResult.error;
  const typeById = new Map((typeResult.data ?? []).map(type => [type.id, type]));
  const assignmentByItem = new Map((assignmentResult.data ?? []).map(row => [row.item_id, typeById.get(row.item_type_id) ?? null]));
  return items.map(item => ({ ...item, browse_type: assignmentByItem.get(item.id) ?? null }));
}

export async function getCreatorCatalogOverview(profileId: string) {
  const items = await listCreatorItems(profileId);
  const itemIds = items.map(item => item.id);
  if (itemIds.length === 0) return { items, libraryItems: [] as StudioLibraryMetric[], totalPlays: 0, catalogHealth: [] as StudioCatalogHealth[] };

  const [libraryResult, playsResult, healthResult] = await Promise.all([
    supabase
      .from('library_entries')
      .select('id,item_id,acquisition_type,acquired_at')
      .in('item_id', itemIds),
    supabase.rpc('get_creator_total_plays'),
    supabase.rpc('list_managed_catalog_health'),
  ]);
  if (libraryResult.error) throw libraryResult.error;
  if (playsResult.error && !isMissingFunctionError(playsResult.error)) throw playsResult.error;
  if (healthResult.error) throw healthResult.error;
  return {
    items,
    libraryItems: (libraryResult.data as StudioLibraryMetric[] | null) ?? [],
    totalPlays: Number(playsResult.data ?? 0),
    catalogHealth: (healthResult.data as StudioCatalogHealth[] | null) ?? [],
  };
}

export async function listCreatorSubmissionStatuses(profileId: string) {
  const result = await supabase
    .from('item_submissions')
    .select('id,item_id,status,submission_kind,submitted_at,decision_reason')
    .eq('submitter_id', profileId)
    .order('submitted_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as StudioSubmissionStatus[] | null) ?? [];
}

export async function setItemPublicationStatus(itemId: string, status: 'published' | 'draft') {
  const result = await supabase.rpc('set_owned_item_publication_status', {
    target_item_id: itemId,
    target_status: status,
  });
  if (result.error) throw result.error;
}
