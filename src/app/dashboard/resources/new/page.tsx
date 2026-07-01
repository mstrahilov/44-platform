'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
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
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
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
    const cleanSummary = summary.trim();
    const cleanType = resourceType.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanSummary) {
      setError('Please fill out the title, category, type, and summary.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase.from('resources').insert({
      creator_id: profile?.id ?? user.id,
      author_id: profile?.id ?? user.id,
      category_id: categoryId,
      slug: buildSlug(cleanTitle),
      title: cleanTitle,
      summary: cleanSummary,
      body: cleanBody || cleanSummary,
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
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>
              New Resource
            </h1>

            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>
              Create guides, articles, lessons, templates, and downloadable resources from inside the app.
            </p>
          </div>

          <Link href="/dashboard/resources" className="os-button os-button-ghost os-button-compact">
            Back to Resources
          </Link>
        </div>

        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Resource Title</div>
              <input className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Example: Publishing Your First Release" />
            </label>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div>
                <select className="input" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Type</div>
                <input className="input" value={resourceType} onChange={event => setResourceType(event.target.value)} placeholder="Guide, Template, Lesson, Download…" />
              </label>
            </div>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Summary</div>
              <textarea className="input" rows={3} value={summary} onChange={event => setSummary(event.target.value)} placeholder="A short description that helps someone understand the value of this resource." />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Body</div>
              <textarea className="input" rows={8} value={body} onChange={event => setBody(event.target.value)} placeholder="Write the resource content here. This can stay minimal for now and be expanded later." />
            </label>

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

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Creator</div>
                <input className="input" value={creatorName} readOnly />
              </label>
            </div>

            {error && (
              <p style={{ color: '#ff9b9b', fontSize: 14, fontWeight: 600 }}>
                {error}
              </p>
            )}

            {!isCreatorProfile(profile) && (
              <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <Link className="os-button os-button-ghost" href="/dashboard/resources">
                Cancel
              </Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
