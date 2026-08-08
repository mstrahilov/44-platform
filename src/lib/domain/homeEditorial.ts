import { supabase } from '@/lib/supabase';

export type AdminHomeCandidate = {
  item_id: string;
  title: string;
  creator_name: string;
  cover_url: string | null;
  release_date: string | null;
  created_at: string;
};

export type AdminHomeEntry = AdminHomeCandidate & { position: number };

export type AdminHomeHistory = {
  id: string;
  reason: string;
  created_at: string;
  changed_by: string;
};

export type AdminHomeFeaturedState = {
  mutation_ready: boolean;
  entries: AdminHomeEntry[];
  candidates: AdminHomeCandidate[];
  history: AdminHomeHistory[];
};

function normalizeState(value: unknown): AdminHomeFeaturedState {
  const state = (value && typeof value === 'object' ? value : {}) as Partial<AdminHomeFeaturedState>;
  return {
    mutation_ready: state.mutation_ready === true,
    entries: Array.isArray(state.entries) ? state.entries : [],
    candidates: Array.isArray(state.candidates) ? state.candidates : [],
    history: Array.isArray(state.history) ? state.history : [],
  };
}

export async function loadAdminHomeFeaturedState() {
  const result = await supabase.rpc('get_admin_home_featured_state');
  if (result.error) throw result.error;
  return normalizeState(result.data);
}

export async function setAdminHomeFeaturedItem(itemId: string, reason: string) {
  const result = await supabase.rpc('set_admin_home_featured_items', {
    target_item_ids: [itemId],
    target_reason: reason,
  });
  if (result.error) throw result.error;
  return normalizeState(result.data);
}
