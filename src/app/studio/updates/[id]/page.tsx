'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HubHero, PageShell } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { deleteItemUpdate, updateItemUpdate, type ItemUpdate } from '@/lib/domain/itemCommunity';
import { supabase } from '@/lib/supabase';

export default function EditUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const [updateId, setUpdateId] = useState('');
  const [update, setUpdate] = useState<ItemUpdate | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void params.then(({ id }) => setUpdateId(id));
  }, [params]);

  useEffect(() => {
    if (!user || !updateId) return;
    void supabase.from('community_update_content').select('id,item_id,author_id,title,body,version_label,status,created_at').eq('id', updateId).maybeSingle()
      .then(result => {
        if (result.error || !result.data) { setError(result.error?.message ?? 'Update not found.'); return; }
        const row = result.data as ItemUpdate;
        setUpdate(row); setTitle(row.title); setBody(row.body);
      });
  }, [updateId, user]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!updateId || !title.trim() || !body.trim()) { setError('Complete the title and update.'); return; }
    setSaving(true); setError('');
    try { await updateItemUpdate(updateId, title, body); window.location.href = '/studio'; }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save this update.'); setSaving(false); }
  }

  async function remove() {
    if (!updateId || !window.confirm('Delete this update?')) return;
    setDeleting(true); setError('');
    try { await deleteItemUpdate(updateId); window.location.href = '/studio'; }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this update.'); setDeleting(false); }
  }

  if (loading || !user || !update) return <PageShell><div className="dashboard-page"><HubHero title="Edit Update" copy={error || 'Loading update…'} />{error && <Link href="/studio" className="os-button os-button-secondary">Back to Studio</Link>}</div></PageShell>;

  return <PageShell><div className="dashboard-page"><HubHero title="Edit Update" copy="Update this creator announcement." />
    <form className="dashboard-form" onSubmit={save}><section className="dashboard-form-section"><div className="dashboard-form-step">
      <label className="dashboard-field"><span className="dashboard-field-label">Title</span><input className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} /></label>
      <label className="dashboard-field"><span className="dashboard-field-label">Update</span><textarea className="os-input-textarea" value={body} onChange={event => setBody(event.target.value)} maxLength={10000} /></label>
    </div></section>
    {error && <div className="dashboard-status dashboard-status-error">{error}</div>}
    <div className="dashboard-form-actions"><div className="dashboard-form-actions-left"><button className="os-button os-button-danger" type="button" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Update'}</button></div><div className="dashboard-form-actions-right"><Link className="os-button os-button-secondary" href="/studio">Cancel</Link><button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></div></div>
    </form></div></PageShell>;
}
