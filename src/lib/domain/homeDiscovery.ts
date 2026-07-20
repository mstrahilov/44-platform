import { supabase } from '@/lib/supabase';
import { loadStoreDiscoveryCatalog } from '@/lib/domain/catalog';
import { getProductExperience } from '@/lib/experience';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';

export type HomeFeaturedCandidate = {
  item_id: string;
  title: string;
  creator_name: string;
  cover_url: string | null;
  release_date: string | null;
  created_at: string;
};

export type HomeFeaturedEntry = HomeFeaturedCandidate & {
  position: number;
};

export type HomeFeaturedSnapshotItem = {
  item_id: string;
  title: string;
  creator_name: string;
  position: number;
};

export type AdminHomeFeaturedEvent = {
  id: string;
  previous_items: HomeFeaturedSnapshotItem[];
  new_items: HomeFeaturedSnapshotItem[];
  reason: string;
  created_at: string;
  changed_by: string;
};

export type AdminHomeFeaturedState = {
  mutation_ready: boolean;
  entries: HomeFeaturedEntry[];
  candidates: HomeFeaturedCandidate[];
  history: AdminHomeFeaturedEvent[];
};

function isMissingFeaturedShelfMigration(error: { code?: string | null; message?: string | null }) {
  return error.code === '42883'
    || error.code === 'PGRST202'
    || Boolean(error.message?.includes('home_featured'));
}

/**
 * Returns null only while the forward migration is not available. An empty
 * array is an intentional editorial shelf with no selected Items.
 */
export async function listHomeFeaturedItemIds(): Promise<string[] | null> {
  const result = await supabase.rpc('list_home_featured_item_ids');
  if (result.error) {
    if (isMissingFeaturedShelfMigration(result.error)) return null;
    throw result.error;
  }
  return ((result.data ?? []) as Array<{ item_id: string; slot_position: number }>)
    .sort((a, b) => a.slot_position - b.slot_position)
    .map(entry => entry.item_id);
}

export async function getAdminHomeFeaturedState() {
  const result = await supabase.rpc('get_admin_home_featured_state');
  if (result.error) {
    if (isMissingFeaturedShelfMigration(result.error)) return getLegacyAdminHomeFeaturedState();
    throw result.error;
  }
  return result.data as unknown as AdminHomeFeaturedState;
}

export async function setAdminHomeFeaturedItems(itemIds: string[], reason: string) {
  const result = await supabase.rpc('set_admin_home_featured_items', {
    target_item_ids: itemIds,
    target_reason: reason,
  });
  if (result.error) {
    if (isMissingFeaturedShelfMigration(result.error)) {
      throw new Error('The Featured shelf migration must be promoted before this control can save.');
    }
    throw result.error;
  }
  return result.data as unknown as AdminHomeFeaturedState;
}

function toFeaturedCandidate(product: Product): HomeFeaturedCandidate {
  return {
    item_id: product.id,
    title: product.title,
    creator_name: product.creators?.display_name || product.creators?.username || product.creator,
    cover_url: product.cover_url,
    release_date: product.release_date ?? null,
    created_at: product.created_at,
  };
}

async function getLegacyAdminHomeFeaturedState(): Promise<AdminHomeFeaturedState> {
  const candidates = (await loadStoreDiscoveryCatalog(500))
    .filter(product => getProductExperience(product) === 'music' && product.browse_type?.slug !== 'beat')
    .sort(comparePublicCatalogProducts);
  return {
    mutation_ready: false,
    candidates: candidates.map(toFeaturedCandidate),
    entries: candidates
      .filter(product => product.featured)
      .slice(0, 4)
      .map((product, index) => ({ ...toFeaturedCandidate(product), position: index + 1 })),
    history: [],
  };
}
