'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { EmptyMessage, PageShell } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (authLoading) return;
      if (!user) {
        if (alive) setChecking(false);
        return;
      }
      const result = await loadStudioProfile(user.id);
      if (!alive) return;
      setAuthorized(result.profile?.role === 'admin');
      setChecking(false);
    }
    void check();
    return () => { alive = false; };
  }, [authLoading, user]);

  return { authorized, loading: authLoading || checking, user };
}

export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  const access = useAdminAccess();
  if (access.loading) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading administrator workspace" /></PageShell>;
  if (!access.authorized) return <PageShell><EmptyMessage>Administrator access is required.</EmptyMessage></PageShell>;
  return children;
}

export function AdminPager({ page, total, pageSize = 8, hrefForPage }: { page: number; total: number; pageSize?: number; hrefForPage: (page: number) => string }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  return <nav className="admin-pager" aria-label="Pagination">
    {page > 1 ? <Link className="os-button os-button-ghost os-button-compact" href={hrefForPage(page - 1)}>Previous</Link> : <span />}
    <span>Page {page} of {pageCount}</span>
    {page < pageCount ? <Link className="os-button os-button-ghost os-button-compact" href={hrefForPage(page + 1)}>Next</Link> : <span />}
  </nav>;
}

export function AdminAvatar({ src, name, size = 48 }: { src?: string | null; name?: string | null; size?: number }) {
  if (src) return <Image className="admin-avatar" src={src} alt="" width={size} height={size} unoptimized />;
  const initial = (name || '4').trim().slice(0, 1).toUpperCase();
  return <span className="admin-avatar admin-avatar-empty" style={{ width: size, height: size }} aria-hidden="true">{initial}</span>;
}

export function AdminStatusBadge({ children, tone = 'quiet' }: { children: ReactNode; tone?: 'quiet' | 'success' | 'warning' | 'danger' }) {
  return <span className={`admin-record-status admin-record-status-${tone} ui44-badge`}>{children}</span>;
}

export function AdminActionDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  requireTitle,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  requireTitle?: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => { setReason(''); setConfirmation(''); setError(''); });
  }, [open]);

  if (!open) return null;
  const valid = reason.trim().length >= 3 && reason.trim().length <= 500 && (!requireTitle || confirmation === requireTitle);
  return <div className="admin-dialog-layer" role="presentation">
    <button className="admin-dialog-scrim" type="button" aria-label="Close dialog" onClick={saving ? undefined : onClose} />
    <section className="admin-dialog ui44-panel" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
      <h2 id="admin-dialog-title">{title}</h2>
      <p>{description}</p>
      <label className="admin-dialog-field">
        <span>Reason</span>
        <textarea value={reason} maxLength={500} onChange={event => setReason(event.target.value)} placeholder="Required for the administrator audit" autoFocus />
      </label>
      {requireTitle ? <label className="admin-dialog-field">
        <span>Type “{requireTitle}” to confirm</span>
        <input value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      </label> : null}
      {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
      <div className="admin-dialog-actions">
        <button className="os-button os-button-ghost" type="button" disabled={saving} onClick={onClose}>Cancel</button>
        <button className={danger ? 'os-button os-button-danger' : 'os-button os-button-primary'} type="button" disabled={!valid || saving} onClick={() => {
          setError('');
          void onConfirm(reason.trim()).catch(actionError => setError(actionError instanceof Error ? actionError.message : 'The administrator action failed.'));
        }}>{saving ? 'Working…' : confirmLabel}</button>
      </div>
    </section>
  </div>;
}

export function formatAdminDate(value?: string | null, withTime = false) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en', withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

