'use client';

import { useState } from 'react';
import { useUi44DialogFocus } from '@/components/ui44/Dialog';
import { reportContent, type ReportReason } from '@/lib/domain/moderation';

export type CommunityReportTarget =
  | { kind: 'post'; id: string }
  | { kind: 'reply'; id: string };

const REPORT_REASONS: Array<{ id: ReportReason; label: string }> = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'violence', label: 'Violence' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'other', label: 'Something else' },
];

export function CommunityReportDialog({
  target,
  onClose,
}: {
  target: CommunityReportTarget | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useUi44DialogFocus<HTMLElement>({ active: Boolean(target), onDismiss: onClose });

  if (!target) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await reportContent({
        entryId: target.kind === 'post' ? target.id : undefined,
        replyId: target.kind === 'reply' ? target.id : undefined,
        reason,
        details,
      });
      onClose();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Could not submit this report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ui44-dialog-overlay community-report-overlay" role="presentation">
      <button
        type="button"
        className="ui44-dialog-scrim"
        aria-label="Close report"
        onClick={submitting ? undefined : onClose}
      />
      <section
        ref={dialogRef}
        className="ui44-dialog-surface ui44-panel ui44-panel-glass community-report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-report-title"
      >
        <form onSubmit={submit}>
          <div className="community-report-body">
            <h2 id="community-report-title">Report {target.kind}</h2>
            <p>Choose the reason that best describes the issue.</p>
            <label>
              <span>Reason</span>
              <select
                className="ui44-input"
                value={reason}
                onChange={event => setReason(event.target.value as ReportReason)}
                disabled={submitting}
              >
                {REPORT_REASONS.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Details <small>Optional</small></span>
              <textarea
                className="ui44-input ui44-textarea"
                rows={4}
                value={details}
                onChange={event => setDetails(event.target.value)}
                disabled={submitting}
                placeholder="Add any context that would help the moderation team."
              />
            </label>
            {error && <div className="ui44-status ui44-status-error" role="alert">{error}</div>}
          </div>
          <div className="ui44-dialog-actions community-report-actions">
            <button type="button" className="os-button os-button-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="os-button os-button-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
