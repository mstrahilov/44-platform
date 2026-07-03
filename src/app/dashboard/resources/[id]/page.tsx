'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { RichEditor } from '@/components/RichEditor';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';

export default function EditResourcePage() {
  useTopbarBack({ href: '/dashboard/resources', label: 'Resources' });
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: categoryRows }, profileResult] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const profileId = profileResult.profile?.id ?? user.id;
      const { data: resourceRow } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .eq('author_id', profileId)
        .maybeSingle();

      if (!resourceRow) {
        setError('Resource not found.');
        setFetching(false);
        return;
      }

      setTitle(resourceRow.title ?? '');
      setCategoryId(resourceRow.category_id ?? '');
      setResourceType(resourceRow.resource_type ?? '');
      setShortDescription(resourceRow.short_description ?? '');
      setLongDescription(resourceRow.long_description ?? '');
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
    setSuccess('');
    const profileResult = await loadStudioProfile(user.id);
    const profileId = profileResult.profile?.id ?? user.id;

    const { error: updateError } = await supabase
      .from('resources')
      .update({
        title: title.trim(),
        category_id: categoryId,
        resource_type: resourceType.trim(),
        short_description: shortDescription.trim(),
        long_description: longDescription.trim(),
        cover_url: coverUrl.trim() || null,
        download_url: downloadUrl.trim() || null,
      })
      .eq('id', id)
      .eq('author_id', profileId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess('Changes saved.');
    router.push('/dashboard/resources');
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    const profileResult = await loadStudioProfile(user.id);
    const profileId = profileResult.profile?.id ?? user.id;

    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
      .eq('author_id', profileId);

    if (deleteError) {
      setDeleting(false);
      setError(deleteError.message);
      return;
    }

    setDeleting(false);
    router.push('/dashboard/resources');
  }

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero title="Edit Resource" copy="Update the resource details stored in 44." />
        <div className="dashboard-flat">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field"><div className="dashboard-field-label">Resource Title</div><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></label>
            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field"><div className="dashboard-field-label">Category</div><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="dashboard-field"><div className="dashboard-field-label">Type</div><input className="input" value={resourceType} onChange={e => setResourceType(e.target.value)} /></label>
            </div>
            <label className="dashboard-field"><div className="dashboard-field-label">Short Description</div><textarea className="input" rows={3} value={shortDescription} onChange={e => setShortDescription(e.target.value)} /></label>
            <div className="dashboard-field">
              <div className="dashboard-field-label">Article Content</div>
              <RichEditor
                value={longDescription}
                onChange={setLongDescription}
                userId={user.id}
                placeholder="Write the article. Add headings, quotes, links, and inline images."
              />
            </div>
            <div className="dashboard-form-grid dashboard-form-grid-3">
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
              <label className="dashboard-field"><div className="dashboard-field-label">Creator</div><input className="input" value={creatorName} readOnly /></label>
            </div>
            {error && <div className="dashboard-status dashboard-status-error">{error}</div>}
            {success && <div className="dashboard-status dashboard-status-success">{success}</div>}
            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left">
                <button className="os-button os-button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete Resource</button>
              </div>
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href="/dashboard/resources">Cancel</Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        </div>
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Delete Resource"
          description="Delete this resource? This will permanently remove it from 44."
          confirmLabel="Delete Resource"
          destructive
          busy={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            setShowDeleteConfirm(false);
            await handleDelete();
          }}
        />
      </div>
    </PageShell>
  );
}
