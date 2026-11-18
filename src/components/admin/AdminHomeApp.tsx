'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { Ui44SelectInput } from '@/components/ui44/Inputs';
import {
  loadAdminHomeFeaturedState,
  setAdminHomeFeaturedItem,
  type AdminHomeFeaturedState,
} from '@/lib/domain/homeEditorial';
import { OS44Button } from '@/components/OS44Button';

export default function AdminHomeApp() {
  return <AdminAccessBoundary><AdminHomeWorkspace /></AdminAccessBoundary>;
}

function AdminHomeWorkspace() {
  const [state, setState] = useState<AdminHomeFeaturedState | null>(null);
  const [itemId, setItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let alive = true;
    void loadAdminHomeFeaturedState().then(nextState => {
      if (!alive) return;
      setState(nextState);
      setItemId(nextState.entries[0]?.item_id ?? nextState.candidates[0]?.item_id ?? '');
      setLoading(false);
    }).catch(error => {
      if (!alive) return;
      setStatus(error instanceof Error ? error.message : 'Could not load Home editorial controls.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const selection = useMemo(() => state?.candidates.find(candidate => candidate.item_id === itemId)
    ?? state?.entries.find(entry => entry.item_id === itemId), [itemId, state]);
  const releaseById = useMemo(() => new Map(
    [...(state?.candidates ?? []), ...(state?.entries ?? [])].map(release => [release.item_id, release]),
  ), [state]);
  const unchanged = state?.entries[0]?.item_id === itemId && state.entries.length === 1;
  const canSave = Boolean(itemId && !saving && !unchanged);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setStatus('');
    try {
      const nextState = await setAdminHomeFeaturedItem(itemId, 'Not applicable');
      setState(nextState);
      setStatus('Featured release updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update the featured release.');
    } finally {
      setSaving(false);
    }
  }

  return <PageShell><main className="dashboard-page admin-page admin-home-page" aria-label="Featured Release">
    <HubHero title="Featured Release" hideDivider className="admin-home-page-header" />
    {loading ? <EmptyMessage status>Loading…</EmptyMessage> : null}
    {status ? <div className="dashboard-status ui44-status" role="status">{status}</div> : null}
    {state ? <>
      <section className="dashboard-section">
        <div className="dashboard-form-step admin-home-editor ui44-panel">
          {selection ? <div className="admin-home-preview">
            {selection.cover_url ? <Image src={selection.cover_url} alt="" width={160} height={160} unoptimized /> : <span className="admin-home-preview-empty" aria-hidden="true">44</span>}
            <div><span className="admin-detail-eyebrow">Preview</span><h2>{selection.title}</h2><p>{selection.creator_name}</p></div>
          </div> : null}
          <label className="dashboard-field">
            <span>Featured release</span>
            <Ui44SelectInput value={itemId} onChange={event => setItemId(event.target.value)}>
              {state.candidates.map(candidate => <option key={candidate.item_id} value={candidate.item_id}>{candidate.title} — {candidate.creator_name}</option>)}
            </Ui44SelectInput>
          </label>
          <div className="dashboard-form-actions"><OS44Button className="os-button os-button-primary" type="button" disabled={!canSave} onClick={() => { void save(); }}>{saving ? 'Saving…' : 'Update feature'}</OS44Button></div>
        </div>
      </section>
      <section className="dashboard-section">
        <SectionHeader title="Change log" description="The latest audited featured release changes." />
        {state.history.length ? <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip admin-home-history-list">{state.history.map(entry => {
          const featuredItem = entry.new_items?.[0];
          const artwork = featuredItem ? releaseById.get(featuredItem.item_id)?.cover_url : null;
          return <div className="dashboard-list-row studio-overview-row admin-home-history-row" key={entry.id}>
            <span className="studio-overview-artwork" aria-hidden="true">
              {artwork ? <Image className="studio-overview-artwork-image" src={artwork} alt="" width={56} height={56} unoptimized /> : null}
            </span>
            <span className="admin-home-history-copy">
              <strong className="admin-home-history-title">{featuredItem?.title ?? 'Featured release updated'}</strong>
              <span className="admin-home-history-creator">{featuredItem?.creator_name ?? 'Featured release removed'}</span>
              <span className="admin-home-history-meta">Updated by <strong>{entry.changed_by}</strong> on {formatHomeHistoryDate(entry.created_at)}</span>
            </span>
          </div>;
        })}</div> : <EmptyMessage>No Home editorial changes have been recorded.</EmptyMessage>}
      </section>
    </> : null}
  </main></PageShell>;
}

function formatHomeHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
