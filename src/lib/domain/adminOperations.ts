import { supabase } from '@/lib/supabase';

export const ADMIN_PAGE_SIZE = 8;

export type AdminSystemStatus = { enabled: boolean; label: string; phase?: string };
export type AdminDashboardSummary = {
  people_count: number;
  creator_count: number;
  pending_review_count: number;
  recent_error_count: number;
  content_count: number;
  published_count: number;
  draft_count: number;
  archived_count: number;
  publishing: AdminSystemStatus;
  email_delivery: AdminSystemStatus;
  payments: AdminSystemStatus;
  beat_store: AdminSystemStatus;
};

export type AdminPersonRow = {
  profile_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  signed_up_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  profile_role: 'member' | 'creator' | 'admin';
  creator_type: string | null;
  item_count: number;
  profile_missing: boolean;
  total_count: number;
};

export type AdminPersonDetail = {
  account: {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    created_at: string;
  };
  profile: null | {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    role: 'member' | 'creator' | 'admin';
    slug: string | null;
    creator_type: string | null;
    is_official: boolean;
    is_published: boolean;
    created_at: string;
    updated_at: string;
  };
  items: Array<{
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    status: 'draft' | 'published' | 'archived';
    experience_type: string;
    item_type: string;
    created_at: string;
    updated_at: string;
  }>;
  role_history: Array<{
    id: string;
    previous_role: string;
    new_role: string;
    reason: string;
    created_at: string;
    changed_by: string;
  }>;
};

export type AdminContentRow = {
  item_id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_username: string | null;
  experience_type: string;
  item_type: string;
  assigned_type: string | null;
  publication_status: 'draft' | 'published' | 'archived';
  review_status: 'none' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
  pending_submission_id: string | null;
  created_at: string;
  updated_at: string;
  total_count: number;
};

export type AdminContentDetail = {
  item: {
    id: string;
    title: string;
    slug: string;
    creator: string;
    cover_url: string | null;
    hero_url: string | null;
    status: 'draft' | 'published' | 'archived';
    experience_type: string;
    item_type: string;
    year: number | null;
    short_description: string | null;
    long_description: string | null;
    price_cents: number;
    is_free: boolean;
    featured: boolean;
    fulfillment_type: string;
    created_at: string;
    updated_at: string;
  };
  creator: null | { id: string; display_name: string | null; username: string | null; avatar_url: string | null; role: string };
  taxonomy: { type: null | { id: string; label: string; slug: string }; tags: Array<{ id: string; label: string; slug: string }> };
  tracks: Array<{ id: string; number: number; title: string; duration_seconds: number | null; has_audio: boolean }>;
  assets: Array<{ id: string; asset_type: string; title: string | null; is_downloadable: boolean; has_file: boolean }>;
  offers: Array<{ id: string; code: string; title: string; offer_type: string; status: string; price_cents: number; currency: string; fulfillment_type: string }>;
  health: Array<{ code: string; message: string }>;
  submissions: Array<{
    id: string;
    status: 'pending' | 'withdrawn' | 'approved' | 'rejected';
    submission_kind: 'create' | 'revision';
    submitted_at: string;
    decided_at: string | null;
    decision_reason: string | null;
    proposed_item: Record<string, unknown> | null;
  }>;
  lifecycle_history: Array<{
    id: string;
    action: 'publish' | 'unpublish' | 'archive';
    previous_status: string;
    new_status: string;
    reason: string;
    created_at: string;
    changed_by: string;
  }>;
};

export type AdminSubmissionQueueRow = {
  submission_id: string;
  item_id: string;
  submitter_id: string;
  status: 'pending' | 'withdrawn' | 'approved' | 'rejected';
  submission_kind: 'create' | 'revision';
  submitted_at: string;
  decided_at: string | null;
  decision_reason: string | null;
  item_title: string;
  item_slug: string;
  creator_name: string | null;
  pending_notification_count: number;
};

export type AdminErrorEvent = {
  id: string;
  occurred_at: string;
  release: string;
  runtime: 'nodejs' | 'edge' | 'browser' | 'unknown';
  method: string;
  path: string;
  error_name: string;
  error_digest: string | null;
  error_code: string | null;
  safe_message: string | null;
  framework_context: Record<string, unknown>;
  total_count?: number;
};

export async function getAdminDashboardSummary() {
  const result = await supabase.rpc('get_admin_dashboard_summary');
  if (result.error) throw result.error;
  return result.data as unknown as AdminDashboardSummary;
}

export async function listAdminPeople(input: { query?: string | null; role?: string | null; page?: number } = {}) {
  const page = Math.max(1, input.page ?? 1);
  const result = await supabase.rpc('list_admin_people', {
    target_query: input.query || undefined,
    target_role: input.role && input.role !== 'all' ? input.role : undefined,
    target_limit: ADMIN_PAGE_SIZE,
    target_offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as AdminPersonRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page };
}

export async function getAdminPersonDetail(profileId: string) {
  const result = await supabase.rpc('get_admin_person_detail', { target_profile_id: profileId });
  if (result.error) throw result.error;
  return result.data as unknown as AdminPersonDetail;
}

export async function setAdminCreatorAccess(profileId: string, role: 'member' | 'creator', reason: string) {
  const result = await supabase.rpc('set_admin_creator_access', {
    target_profile_id: profileId,
    target_role: role,
    target_reason: reason,
  });
  if (result.error) throw result.error;
}

export async function listAdminContent(input: { query?: string | null; status?: string | null; type?: string | null; page?: number } = {}) {
  const page = Math.max(1, input.page ?? 1);
  const result = await supabase.rpc('list_admin_content', {
    target_query: input.query || undefined,
    target_status: input.status && input.status !== 'all' ? input.status : undefined,
    target_type: input.type && input.type !== 'all' ? input.type : undefined,
    target_limit: ADMIN_PAGE_SIZE,
    target_offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as AdminContentRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page };
}

export async function getAdminContentDetail(itemId: string) {
  const result = await supabase.rpc('get_admin_content_detail', { target_item_id: itemId });
  if (result.error) throw result.error;
  return result.data as unknown as AdminContentDetail;
}

export async function setAdminItemLifecycle(itemId: string, action: 'publish' | 'unpublish' | 'archive', reason: string) {
  const result = await supabase.rpc('set_admin_item_lifecycle', {
    target_item_id: itemId,
    target_action: action,
    target_reason: reason,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function decideAdminSubmission(submissionId: string, decision: 'approved' | 'rejected', reason: string) {
  const result = await supabase.rpc('decide_item_submission', {
    target_submission_id: submissionId,
    target_decision: decision,
    reason,
  });
  if (result.error) throw result.error;
}

export async function listAdminErrorEvents(input: {
  release?: string | null;
  path?: string | null;
  since?: string | null;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = input.limit ?? ADMIN_PAGE_SIZE;
  const result = await supabase.rpc('list_admin_error_events_page', {
    target_release: input.release || undefined,
    target_path: input.path || undefined,
    target_since: input.since || undefined,
    target_limit: limit,
    target_offset: (page - 1) * limit,
  });
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as AdminErrorEvent[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page };
}

export async function listAdminSubmissionQueue(input: {
  status?: AdminSubmissionQueueRow['status'] | null;
  limit?: number;
  offset?: number;
} = {}) {
  const result = await supabase.rpc('list_admin_submission_queue', {
    target_status: input.status ?? 'pending',
    target_limit: input.limit ?? 50,
    target_offset: input.offset ?? 0,
  });
  if (result.error) throw result.error;
  return (result.data as AdminSubmissionQueueRow[] | null) ?? [];
}

export async function getAdminSubmissionDetail(submissionId: string) {
  const result = await supabase.rpc('get_admin_submission_detail', { target_submission_id: submissionId });
  if (result.error) throw result.error;
  return result.data as Record<string, unknown>;
}
