'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
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
      creator_id: user.id,
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
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>New Post</h1>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>Share a project update, announcement, or discussion starter.</p>
          </div>
          <Link href="/dashboard/posts" className="os-button os-button-ghost os-button-compact">Back to Posts</Link>
        </div>

        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Post Title</div><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: New release this Friday" /></label>
            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Type</div><input className="input" value={postType} onChange={e => setPostType(e.target.value)} placeholder="Update, News, Discussion…" /></label>
            </div>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Body</div><textarea className="input" rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your post here." /></label>
            {error && <p style={{ color: '#ff9b9b', fontSize: 14, fontWeight: 600 }}>{error}</p>}
            {!isCreatorProfile(profile) && (
              <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
              <Link className="os-button os-button-ghost" href="/dashboard/posts">Cancel</Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
