import { supabase } from '@/lib/supabase';

export const ADMIN_PAGE_SIZE = 8;

export type AdminSystemStatus = { enabled: boolean; label: string; phase?: string };
export type AdminDashboardSummary = {
  people_count: number;
  creator_count: number;
  pending_creator_request_count: number;
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
  creator_request_status: 'pending' | 'approved' | 'rejected' | null;
  creator_request_requested_at: string | null;
  team_access: boolean;
  total_count: number;
};

export type AdminTeamAccessState = {
  authorized: boolean;
  source: 'admin' | 'grant' | 'none';
  profileId: string;
  grantedAt: string | null;
  revokedAt: string | null;
  history: Array<{
    id: string;
    previousActive: boolean;
    newActive: boolean;
    reason: string;
    createdAt: string;
    changedBy: string;
  }>;
};

export type AdminPersonDetail = {
  account: {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    created_at: string;
  };
  creator_request: null | {
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    reviewed_at: string | null;
    decision_reason: string | null;
    reviewed_by: string | null;
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
  commerce: CreatorPaidSalesState;
  team: AdminTeamAccessState;
};

export type CreatorPaidSalesState = {
  creator_id: string;
  can_sell_paid: boolean;
  state: 'enabled' | 'grace' | 'not_reviewed' | 'disabled' | 'onboarding_required' | 'pending_tax' | 'pending_provider' | 'restricted' | 'country_unavailable' | 'entity_waitlisted';
  is_platform_seller: boolean;
  admin_status: 'not_reviewed' | 'approved' | 'disabled';
  decision_reason: string | null;
  approved_at: string | null;
  paperwork_due_at: string | null;
  approved_by: string | null;
  provider: 'wise_manual' | 'stripe_connect' | 'stripe_global_payouts' | 'paypal' | null;
  provider_status: 'unverified' | 'pending' | 'verified' | 'restricted' | 'country_unavailable' | 'disabled' | null;
  country_code: string | null;
  currency: string | null;
  status_reason_code: string | null;
  requirements_due: string[];
  last_provider_sync_at: string | null;
  history: Array<{
    id: string;
    previous_status: string | null;
    new_status: string;
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
  release_date: string | null;
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
    release_date: string | null;
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
  const [personResult, commerceResult, teamResult] = await Promise.all([
    supabase.rpc('get_admin_person_detail', { target_profile_id: profileId }),
    supabase.rpc('get_creator_paid_sales_state' as never, { target_creator_id: profileId } as never),
    supabase.rpc('get_admin_team_access' as never, { target_profile_id: profileId } as never),
  ]);
  if (personResult.error) throw personResult.error;
  if (commerceResult.error) throw commerceResult.error;
  if (teamResult.error && process.env.NODE_ENV === 'production') throw teamResult.error;
  const person = personResult.data as unknown as Omit<AdminPersonDetail, 'commerce' | 'team'>;
  const fallbackTeam: AdminTeamAccessState = {
    authorized: person.profile?.role === 'admin',
    source: person.profile?.role === 'admin' ? 'admin' : 'none',
    profileId,
    grantedAt: null,
    revokedAt: null,
    history: [],
  };
  return {
    ...person,
    commerce: commerceResult.data as unknown as CreatorPaidSalesState,
    team: teamResult.error ? fallbackTeam : teamResult.data as unknown as AdminTeamAccessState,
  };
}

export async function setAdminTeamAccess(profileId: string, enabled: boolean, reason: string) {
  const result = await supabase.rpc('set_admin_team_access' as never, {
    target_profile_id: profileId,
    target_enabled: enabled,
    target_reason: reason,
  } as never);
  if (result.error) throw result.error;
  if (enabled) void deliverQueuedNotifications();
  return result.data as unknown as AdminTeamAccessState;
}

export async function setAdminCreatorAccess(profileId: string, role: 'member' | 'creator', reason: string) {
  const result = await supabase.rpc('set_admin_creator_access', {
    target_profile_id: profileId,
    target_role: role,
    target_reason: reason,
  });
  if (result.error) throw result.error;
  if (role === 'creator') void deliverCreatorPromotionNotifications();
}

export async function reviewAdminCreatorAccessRequest(
  profileId: string,
  decision: 'approved' | 'rejected',
  reason: string,
) {
  const result = await supabase.rpc('review_creator_access_request' as never, {
    target_profile_id: profileId,
    target_decision: decision,
    target_reason: reason,
  } as never);
  if (result.error) throw result.error;
  if (decision === 'approved') void deliverCreatorPromotionNotifications();
  return result.data as unknown as 'approved' | 'rejected';
}

async function deliverCreatorPromotionNotifications() {
  await deliverQueuedNotifications(true);
}

async function deliverQueuedNotifications(includePush = false) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return;
  const requests = [fetch('/api/email/notifications/process', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })];
  if (includePush) requests.push(fetch('/api/push/process', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
  await Promise.allSettled(requests);
}

export async function setAdminCreatorPaidSales(
  profileId: string,
  status: 'approved' | 'disabled',
  reason: string,
) {
  const result = await supabase.rpc('set_admin_creator_paid_sales' as never, {
    target_creator_id: profileId,
    target_status: status,
    target_reason: reason,
  } as never);
  if (result.error) throw result.error;
  return result.data as unknown as CreatorPaidSalesState;
}

export async function listAdminContent(input: { query?: string | null; status?: string | null; type?: string | null; sort?: 'created' | 'release_date'; page?: number } = {}) {
  const page = Math.max(1, input.page ?? 1);
  const result = await supabase.rpc('list_admin_content_sorted', {
    target_query: input.query || undefined,
    target_status: input.status && input.status !== 'all' ? input.status : undefined,
    target_type: input.type && input.type !== 'all' ? input.type : undefined,
    target_sort: input.sort ?? 'created',
    target_limit: ADMIN_PAGE_SIZE,
    target_offset: (page - 1) * ADMIN_PAGE_SIZE,
  } as never);
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as AdminContentRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page };
}

export async function getAdminContentDetail(itemId: string) {
  const [detailResult, releaseDateResult] = await Promise.all([
    supabase.rpc('get_admin_content_detail', { target_item_id: itemId }),
    supabase.rpc('get_admin_item_release_date', { target_item_id: itemId }),
  ]);
  if (detailResult.error) throw detailResult.error;
  if (releaseDateResult.error) throw releaseDateResult.error;
  const detail = detailResult.data as unknown as AdminContentDetail;
  return { ...detail, item: { ...detail.item, release_date: releaseDateResult.data } };
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

export async function setAdminItemReleaseDate(itemId: string, releaseDate: string, reason: string) {
  const result = await supabase.rpc('set_admin_item_release_date', {
    target_item_id: itemId,
    target_release_date: releaseDate,
    target_reason: reason,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function setAdminOfferLifecycle(offerId: string, action: 'pause' | 'restore', reason: string) {
  const result = await supabase.rpc('set_admin_offer_lifecycle', {
    target_offer_id: offerId,
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
