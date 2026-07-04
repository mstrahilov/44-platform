import type { ProjectStatus } from '@/lib/platform';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  inquiry: 'Inquiry',
  pending: 'Pending Review',
  accepted: 'Accepted',
  declined: 'Declined',
  in_progress: 'In Progress',
  awaiting_payment: 'Awaiting Payment',
  completed: 'Completed',
  canceled: 'Canceled',
};

export function projectStatusLabel(status: string | null | undefined) {
  if (!status) return 'Pending Review';
  return PROJECT_STATUS_LABEL[status as ProjectStatus] ?? status;
}

// Statuses that mean the client can still cancel / withdraw.
export function isOpenProjectStatus(status: string | null | undefined) {
  return ['inquiry', 'pending', 'accepted', 'in_progress', 'awaiting_payment'].includes(status ?? '');
}

export function projectHref(id: string) {
  return `/projects/${id}`;
}

export function formatBriefBudget(cents: number | null | undefined, currency = 'USD') {
  if (cents == null || cents <= 0) return 'Open to proposals';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
