'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HubHero, PageShell } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { listCreatorItems } from '@/lib/domain/studio';
import { createItemUpdate } from '@/lib/domain/itemCommunity';
import type { Product } from '@/lib/products';
import { loadStudioProfile } from '@/lib/studioProfiles';
import { Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';

export default function NewUpdatePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [itemId, setItemId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    void loadStudioProfile(user.id)
      .then(result => listCreatorItems(result.profile?.id ?? user.id))
      .then(setItems)
      .catch(() => setError('Could not load your releases.'));
  }, [user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!itemId || !title.trim() || !body.trim()) { setError('Choose a release and complete the title and update.'); return; }
    setSaving(true); setError('');
    try {
      await createItemUpdate(itemId, title, body);
      window.location.href = '/studio?studioStatus=update-published';
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not publish this update.');
      setSaving(false);
    }
  }

  if (loading) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  if (!user) return <PageShell><div className="dashboard-page"><HubHero title="New Update" copy="Log in to publish an update." /><Link href="/login" className="os-button os-button-primary">Log In</Link></div></PageShell>;

  return <PageShell><div className="dashboard-page"><HubHero title="New Update" copy="Share an update about one of your releases." />
    <form className="dashboard-form" onSubmit={submit}>
      <section className="dashboard-form-section"><div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
        <label className="dashboard-field"><span className="dashboard-field-label">Release</span><Ui44SelectInput value={itemId} onChange={event => setItemId(event.target.value)}><option value="">Select a release</option>{items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</Ui44SelectInput></label>
        <label className="dashboard-field"><span className="dashboard-field-label">Title</span><Ui44TextInput className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="Enter update title" /></label>
        <label className="dashboard-field"><span className="dashboard-field-label">Update</span><Ui44Textarea className="os-input-textarea" value={body} onChange={event => setBody(event.target.value)} maxLength={10000} placeholder="Write update" /></label>
      </div></section>
      {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}
      <div className="dashboard-form-actions"><div className="dashboard-form-actions-right"><Link className="os-button os-button-secondary" href="/studio">Cancel</Link><button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish Update'}</button></div></div>
    </form>
  </div></PageShell>;
}
