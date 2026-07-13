'use client';

import { useEffect, useState } from 'react';
import { SectionHeader } from '@/components/Ui';
import { createItemUpdate, listItemUpdates, type ItemUpdate } from '@/lib/domain/itemCommunity';

export function StudioCreatorUpdates({ itemId }: { itemId: string }) {
  const [updates, setUpdates] = useState<ItemUpdate[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void listItemUpdates(itemId).then(setUpdates).catch(() => {}); }, [itemId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createItemUpdate(itemId, title, body, version);
      setUpdates(await listItemUpdates(itemId));
      setTitle(''); setBody(''); setVersion('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not publish this update.');
    }
    setSaving(false);
  }

  return (
    <section className="dashboard-form-section">
      <SectionHeader title="Creator Updates" description="Publish release notes and progress updates to this Item's Store and Library hub." />
      {error && <div className="dashboard-status dashboard-status-error">{error}</div>}
      <form className="dashboard-form" onSubmit={submit}>
        <div className="dashboard-form-grid dashboard-form-grid-3">
          <label className="dashboard-field"><span className="dashboard-field-label">Title</span><input className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} /></label>
          <label className="dashboard-field"><span className="dashboard-field-label">Version (optional)</span><input className="os-input-field" value={version} onChange={event => setVersion(event.target.value)} maxLength={80} /></label>
        </div>
        <label className="dashboard-field"><span className="dashboard-field-label">Update</span><textarea className="os-input-textarea" value={body} onChange={event => setBody(event.target.value)} maxLength={10000} /></label>
        <div className="dashboard-form-actions"><button className="os-button os-button-secondary" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish Update'}</button></div>
      </form>
      {updates.length > 0 && <div className="dashboard-list-surface">{updates.map(update => <div className="dashboard-list-row" key={update.id}><span className="dashboard-row-copy"><span className="dashboard-row-title">{update.title}</span><span className="dashboard-row-subtitle">{update.version_label || 'Published update'}</span></span></div>)}</div>}
    </section>
  );
}
