'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewCommunityThreadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order');
      const rows = (data as Category[] | null) ?? [];
      setCategories(rows);
      const defaultCategory = rows.find(row => row.slug === 'discussions') ?? rows[0] ?? null;
      setCategoryId(defaultCategory?.id ?? '');
      setPostType(defaultCategory?.slug ?? 'discussion');
    }

    loadCategories();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      setError('Please add both a title and a message.');
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category_id: categoryId || null,
        slug: buildSlug(title),
        title: title.trim(),
        body: body.trim(),
        post_type: postType || 'discussion',
        status: 'published',
      })
      .select('id, slug')
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const nextSlug = (data as { id: string; slug: string | null } | null)?.slug ?? (data as { id: string } | null)?.id;
    router.push(`/community/thread/${nextSlug}`);
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <h1 className="os-type-page-title">Start a Discussion</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
              Ask a question, share feedback, or open a conversation for the community.
            </p>
          </div>
          <Link href="/community/browse" className="os-button os-button-ghost os-button-compact">Back</Link>
        </div>

        <div className="app-panel" style={{ padding: 'var(--os-space-6, 28px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Title</div>
              <input
                className="os-input-large"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="What do you want to talk about?"
                style={{ width: '100%' }}
              />
            </label>

            <div>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Category</div>
              <div className="settings-segment" role="group" aria-label="Post category">
                {categories.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    className={category.id === categoryId ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                    onClick={() => {
                      setCategoryId(category.id);
                      setPostType(category.slug);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Message</div>
              <textarea
                className="os-input-textarea"
                rows={10}
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Share the context, the question, or the update."
                style={{ minHeight: 200 }}
              />
            </label>

            {error && (
              <div className="os-type-body-small" style={{ color: 'var(--os-color-error, #ff6b6b)', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Link className="os-button os-button-ghost" href="/community/browse">Cancel</Link>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
