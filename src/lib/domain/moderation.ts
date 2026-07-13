import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type ContentReport = Database['public']['Tables']['content_reports']['Row'];
export type ReportReason = ContentReport['reason'];

export async function reportContent(input: {
  entryId?: string | null;
  replyId?: string | null;
  reason: ReportReason;
  details?: string;
}) {
  const result = await supabase.rpc('report_content', {
    target_entry_id: input.entryId ?? undefined,
    target_reply_id: input.replyId ?? undefined,
    report_reason: input.reason,
    report_details: input.details?.trim() || undefined,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function listModerationReports() {
  const result = await supabase
    .from('content_reports')
    .select('*,reporters:profiles!reporter_id(id,username,display_name,avatar_url)')
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function resolveContentReport(input: {
  reportId: string;
  status: 'reviewed' | 'dismissed' | 'actioned';
  moderationStatus?: 'visible' | 'hidden' | 'removed' | null;
  note?: string;
}) {
  const result = await supabase.rpc('resolve_content_report', {
    target_report_id: input.reportId,
    target_status: input.status,
    target_moderation_status: input.moderationStatus ?? undefined,
    target_resolution_note: input.note?.trim() || undefined,
  });
  if (result.error) throw result.error;
}
