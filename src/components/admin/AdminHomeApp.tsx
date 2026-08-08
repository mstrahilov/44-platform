'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { AdminAccessBoundary, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import {
  loadAdminHomeFeaturedState,
  setAdminHomeFeaturedItem,
  type AdminHomeFeaturedState,
} from '@/lib/domain/homeEditorial';

export default function AdminHomeApp() {
  return <AdminAccessBoundary><AdminHomeWorkspace /></AdminAccessBoundary>;
}

function AdminHomeWorkspace() {
  const [state, setState] = useState<AdminHomeFeaturedState | null>(null);
  const [itemId, setItemId] = useState('');
  const [reason, setReason] = useState('');
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
  const unchanged = state?.entries[0]?.item_id === itemId && state.entries.length === 1;
  const canSave = Boolean(itemId && reason.trim().length >= 3 && reason.trim().length <= 500 && !saving && !unchanged);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setStatus('');
    try {
      const nextState = await setAdminHomeFeaturedItem(itemId, reason.trim());
      setState(nextState);
      setReason('');
      setStatus('Discover feature updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update the Discover feature.');
    } finally {
      setSaving(false);
    }
  }

  return <PageShell><main className="admin-page admin-home-page" aria-label="Home editorial">
    <HubHero title="Home editorial" copy="Choose one published Music release to lead Discover. Its hero or cover artwork becomes the feature image." />
    {loading ? <EmptyMessage status>Loading…</EmptyMessage> : null}
    {status ? <div className="dashboard-status ui44-status" role="status">{status}</div> : null}
    {state ? <>
      <section className="dashboard-section">
        <SectionHeader title="Discover feature" description="This is the single editorial banner directly below the Discover tabs." />
        <div className="dashboard-form-step admin-home-editor ui44-panel">
          <label className="dashboard-field">
            <span>Featured release</span>
            <Ui44SelectInput value={itemId} onChange={event => setItemId(event.target.value)}>
              {state.candidates.map(candidate => <option key={candidate.item_id} value={candidate.item_id}>{candidate.title} — {candidate.creator_name}</option>)}
            </Ui44SelectInput>
          </label>
          {selection ? <div className="admin-home-preview">
            {selection.cover_url ? <Image src={selection.cover_url} alt="" width={160} height={160} unoptimized /> : <span className="admin-home-preview-empty" aria-hidden="true">44</span>}
            <div><span className="admin-detail-eyebrow">Preview</span><h2>{selection.title}</h2><p>{selection.creator_name}</p></div>
          </div> : null}
          <label className="dashboard-field">
            <span>Reason</span>
            <Ui44TextInput value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Required for the administrator audit" />
          </label>
          <div className="dashboard-form-actions"><button className="os-button os-button-primary" type="button" disabled={!canSave} onClick={() => { void save(); }}>{saving ? 'Saving…' : unchanged ? 'Already featured' : 'Update feature'}</button></div>
        </div>
      </section>
      <section className="dashboard-section">
        <SectionHeader title="Recent changes" description="The latest audited Home editorial decisions." />
        {state.history.length ? <div className="admin-history-list ui44-panel">{state.history.map(entry => <div className="admin-history-row" key={entry.id}><div><strong>Discover feature updated</strong><p>{entry.reason}</p></div><span>{entry.changed_by}<time dateTime={entry.created_at}>{formatAdminDate(entry.created_at, true)}</time></span></div>)}</div> : <EmptyMessage>No Home editorial changes have been recorded.</EmptyMessage>}
      </section>
    </> : null}
  </main></PageShell>;
}
