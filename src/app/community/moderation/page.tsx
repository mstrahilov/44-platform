'use client';

import { useEffect, useState } from 'react';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';
import { listModerationReports, resolveContentReport } from '@/lib/domain/moderation';

type ModerationReport = Awaited<ReturnType<typeof listModerationReports>>[number];

export default function CommunityModerationPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      if (!user) { setLoading(false); return; }
      const profile = await loadStudioProfile(user.id);
      if (profile.profile?.role !== 'admin') { setLoading(false); return; }
      setAuthorized(true);
      try {
        setReports(await listModerationReports());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load moderation reports.');
      }
      setLoading(false);
    }
    void load();
  }, [authLoading, user]);

  async function resolve(report: ModerationReport, action: 'dismissed' | 'hidden' | 'removed') {
    try {
      await resolveContentReport({
        reportId: report.id,
        status: action === 'dismissed' ? 'dismissed' : 'actioned',
        moderationStatus: action === 'dismissed' ? null : action,
      });
      setReports(current => current.map(item => item.id === report.id ? {
        ...item,
        status: action === 'dismissed' ? 'dismissed' : 'actioned',
      } : item));
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Could not resolve this report.');
    }
  }

  if (authLoading || loading) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  if (!authorized) return <PageShell><EmptyMessage>Administrator access is required.</EmptyMessage></PageShell>;

  return (
    <PageShell>
      <main className="social-shell">
        <HubHero title="Moderation" copy="Review Community reports and apply visible moderation state." />
        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}
        <div className="dashboard-list-surface">
          {reports.length === 0 ? <div className="dashboard-empty">No reports yet.</div> : reports.map(report => (
            <div className="dashboard-list-row" key={report.id}>
              <div className="dashboard-row-copy">
                <div className="dashboard-row-title">{report.reason}</div>
                <div className="dashboard-row-subtitle">
                  {report.entry_id ? `Post ${report.entry_id}` : `Reply ${report.reply_id}`} · {report.status}
                </div>
                {report.details ? <div className="os-type-body-small">{report.details}</div> : null}
              </div>
              {report.status === 'pending' ? (
                <div className="dashboard-row-actions">
                  <button className="os-button os-button-ghost os-button-compact" type="button" onClick={() => { void resolve(report, 'dismissed'); }}>Dismiss</button>
                  <button className="os-button os-button-secondary os-button-compact" type="button" onClick={() => { void resolve(report, 'hidden'); }}>Hide</button>
                  <button className="os-button os-button-danger os-button-compact" type="button" onClick={() => { void resolve(report, 'removed'); }}>Remove</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
