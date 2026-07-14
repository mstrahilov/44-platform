import { supabase } from '@/lib/supabase';

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
};

export async function listAdminSubmissionQueue(input: {
  status?: AdminSubmissionQueueRow['status'] | null;
  limit?: number;
  offset?: number;
} = {}) {
  const result = await supabase.rpc('list_admin_submission_queue' as never, {
    target_status: input.status ?? 'pending',
    target_limit: input.limit ?? 50,
    target_offset: input.offset ?? 0,
  } as never);
  if (result.error) throw result.error;
  return (result.data as AdminSubmissionQueueRow[] | null) ?? [];
}

export async function getAdminSubmissionDetail(submissionId: string) {
  const result = await supabase.rpc('get_admin_submission_detail' as never, {
    target_submission_id: submissionId,
  } as never);
  if (result.error) throw result.error;
  return result.data as Record<string, unknown>;
}

export async function listAdminErrorEvents(input: {
  release?: string | null;
  path?: string | null;
  since?: string | null;
  limit?: number;
  offset?: number;
} = {}) {
  const result = await supabase.rpc('list_admin_error_events' as never, {
    target_release: input.release ?? null,
    target_path: input.path ?? null,
    target_since: input.since ?? null,
    target_limit: input.limit ?? 50,
    target_offset: input.offset ?? 0,
  } as never);
  if (result.error) throw result.error;
  return (result.data as AdminErrorEvent[] | null) ?? [];
}
