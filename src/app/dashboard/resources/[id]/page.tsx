'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';

export default function EditResourcePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: categoryRows }, profileResult, { data: resourceRow }] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
        loadStudioProfile(user.id),
        supabase.from('resources').select('*').eq('id', id).or(`creator_id.eq.${user.id},author_id.eq.${user.id}`).maybeSingle(),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      if (!resourceRow) {
        setError('Resource not found.');
        setFetching(false);
        return;
      }

      setTitle(resourceRow.title ?? '');
      setCategoryId(resourceRow.category_id ?? '');
      setResourceType(resourceRow.resource_type ?? '');
      setSummary(resourceRow.summary ?? '');
      setBody(resourceRow.body ?? '');
      setCoverUrl(resourceRow.cover_url ?? '');
      setDownloadUrl(resourceRow.download_url ?? '');
      setFetching(false);
    }

    loadData();
  }, [id, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('resources')
      .update({
        title: title.trim(),
        category_id: categoryId,
        resource_type: resourceType.trim(),
        summary: summary.trim(),
        body: body.trim() || summary.trim(),
        cover_url: coverUrl.trim() || null,
        download_url: downloadUrl.trim() || null,
      })
      .eq('id', id)
      .or(`creator_id.eq.${user.id},author_id.eq.${user.id}`);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/dashboard/resources');
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  return (
    <PageShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>Edit Resource</h1>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>Update the resource details stored in 44.</p>
          </div>
          <Link href="/dashboard/resources" className="os-button os-button-ghost os-button-compact">Back to Resources</Link>
        </div>
        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Resource Title</div><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></label>
            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Type</div><input className="input" value={resourceType} onChange={e => setResourceType(e.target.value)} /></label>
            </div>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Summary</div><textarea className="input" rows={3} value={summary} onChange={e => setSummary(e.target.value)} /></label>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Body</div><textarea className="input" rows={8} value={body} onChange={e => setBody(e.target.value)} /></label>
            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <UploadField
                label="Cover Image"
                folder="resources/covers"
                userId={user.id}
                value={coverUrl}
                accept="image/*"
                buttonLabel="Upload cover"
                onChange={setCoverUrl}
              />
              <UploadField
                label="Download File"
                folder="resources/files"
                userId={user.id}
                value={downloadUrl}
                buttonLabel="Upload file"
                onChange={setDownloadUrl}
              />
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Creator</div><input className="input" value={creatorName} readOnly /></label>
            </div>
            {error && <p style={{ color: '#ff9b9b', fontSize: 14, fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <Link className="os-button os-button-ghost" href="/dashboard/resources">Cancel</Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
