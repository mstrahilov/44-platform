'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { getStudioDisplayName, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'resource';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewResourcePage() {
  useTopbarBack({ href: '/dashboard/resources', label: 'Resources' });
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadFormData() {
      if (!user) return;

      const [{ data: categoryRows }, profileResult] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      const resolvedCategories = (categoryRows as Category[] | null) ?? [];
      setCategories(resolvedCategories);
      setCategoryId(resolvedCategories[0]?.id ?? '');
      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
    }

    loadFormData();
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const cleanTitle = title.trim();
    const cleanShortDescription = shortDescription.trim();
    const cleanLongDescription = longDescription.trim();
    const cleanType = resourceType.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanShortDescription || !cleanLongDescription) {
      setError('Please fill out the title, category, type, and both descriptions.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase.from('resources').insert({
      author_id: profile?.id ?? user.id,
      category_id: categoryId,
      slug: buildSlug(cleanTitle),
      title: cleanTitle,
      short_description: cleanShortDescription,
      long_description: cleanLongDescription,
      resource_type: cleanType,
      cover_url: coverUrl.trim() || null,
      download_url: downloadUrl.trim() || null,
      status: 'draft',
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/dashboard/resources');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-editor">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">New Resource</h1>
            <p className="os-type-body">
              Create guides, articles, lessons, templates, and downloadable resources from inside the app.
            </p>
          </div>
        </header>

        <GlassPanel className="dashboard-form-panel" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field">
              <div className="dashboard-field-label">Resource Title</div>
              <input className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Example: Publishing Your First Release" />
            </label>

            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field">
                <div className="dashboard-field-label">Category</div>
                <select className="input" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="dashboard-field">
                <div className="dashboard-field-label">Type</div>
                <input className="input" value={resourceType} onChange={event => setResourceType(event.target.value)} placeholder="Guide, Template, Lesson, Download…" />
              </label>
            </div>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Short Description</div>
              <textarea className="input" rows={3} value={shortDescription} onChange={event => setShortDescription(event.target.value)} placeholder="Short card copy for this resource." />
            </label>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Long Description</div>
              <textarea className="input" rows={8} value={longDescription} onChange={event => setLongDescription(event.target.value)} placeholder="Write the full resource content or in-app reading copy here." />
            </label>

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

              <label className="dashboard-field">
                <div className="dashboard-field-label">Creator</div>
                <input className="input" value={creatorName} readOnly />
              </label>
            </div>

            {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

            {!isCreatorProfile(profile) && (
              <p className="dashboard-form-note">
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left" />
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href="/dashboard/resources">
                  Cancel
                </Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
