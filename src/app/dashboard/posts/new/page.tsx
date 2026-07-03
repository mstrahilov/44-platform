'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'post';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewPostPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [postType, setPostType] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadFormData() {
      if (!user) return;
      const [{ data: categoryRows }, profileResult] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      const resolvedCategories = (categoryRows as Category[] | null) ?? [];
      setCategories(resolvedCategories);
      setCategoryId(resolvedCategories[0]?.id ?? '');
      setPostType(resolvedCategories[0]?.slug ?? 'update');
      setProfile(profileResult.profile);
    }

    loadFormData();
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      setError('Please fill out the title and body.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      category_id: categoryId || null,
      slug: buildSlug(title),
      title: title.trim(),
      body: body.trim(),
      post_type: postType.trim() || 'update',
      status: 'draft',
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/dashboard/posts');
  }

  if (loading || !user) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero title="New Post" copy="Share a project update, announcement, or discussion starter." />
        <div className="dashboard-section">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label className="dashboard-field"><div className="dashboard-field-label">Post Title</div><input className="os-input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: New release this Friday" /></label>
            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label className="dashboard-field"><div className="dashboard-field-label">Category</div><select className="os-input-field" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="dashboard-field"><div className="dashboard-field-label">Type</div><input className="os-input-field" value={postType} onChange={e => setPostType(e.target.value)} placeholder="Update, News, Discussion…" /></label>
            </div>
            <label className="dashboard-field"><div className="dashboard-field-label">Body</div><textarea className="os-input-textarea" rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your post here." /></label>
            {error && <p className="os-type-body-small" style={{ color: 'var(--os-color-danger)' }}>{error}</p>}
            {!isCreatorProfile(profile) && (
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
              <Link className="os-button os-button-ghost" href="/dashboard/posts">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
