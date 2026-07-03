'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

type PublishedProductOption = Pick<Product, 'id' | 'title' | 'cover_url' | 'product_type'>;

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'post';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function NewPostPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [publishedProducts, setPublishedProducts] = useState<PublishedProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(searchParams.get('subject_id'));
  const [selectorOpen, setSelectorOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const productLocked = Boolean(searchParams.get('subject_id'));

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    }

    if (selectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectorOpen]);

  useEffect(() => {
    async function loadFormData() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const { data: productRows } = await supabase
        .from('products')
        .select('id, title, cover_url, product_type')
        .eq('author_id', profileId)
        .or('is_published.eq.true,status.eq.published')
        .order('created_at', { ascending: false });

      const productOptions = (productRows as PublishedProductOption[] | null) ?? [];
      setPublishedProducts(productOptions);

      if (!selectedProductId && productOptions.length > 0) {
        setSelectedProductId(productOptions[0].id);
      }
    }

    loadFormData();
  }, [selectedProductId, user]);

  const selectedProduct = useMemo(
    () => publishedProducts.find(product => product.id === selectedProductId) ?? null,
    [publishedProducts, selectedProductId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      setError('Please fill out the title and body.');
      return;
    }
    if (!selectedProductId) {
      setError('Choose which published release this update belongs to.');
      return;
    }

    setSaving(true);
    setError('');

    const { data: createdPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category_id: null,
        slug: buildSlug(title),
        title: title.trim(),
        body: body.trim(),
        post_type: 'update',
        status: 'published',
      })
      .select('id')
      .single();

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    if (createdPost?.id) {
      const { error: tagError } = await supabase.from('post_subjects').insert({
        post_id: createdPost.id,
        subject_type: 'product',
        subject_id: selectedProductId,
      });
      if (tagError) {
        setSaving(false);
        setError(tagError.message);
        return;
      }
    }

    setSaving(false);
    router.push('/dashboard/posts');
  }

  if (loading || !user) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  const noPublishedProducts = publishedProducts.length === 0;

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero
          title="Post Update"
          copy="Share an update for one of your published releases. Owners can see it under that item in their library."
        />
        <div className="dashboard-section">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label className="dashboard-field">
              <div className="dashboard-field-label">Post Title</div>
              <input
                className="os-input-field"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Example: Deluxe version in progress"
              />
            </label>

            <div className="dashboard-field">
              <div className="dashboard-field-label">Release</div>
              <div ref={pickerRef} className="update-subject-picker">
                <button
                  type="button"
                  className="update-subject-trigger"
                  onClick={() => !productLocked && !noPublishedProducts && setSelectorOpen(open => !open)}
                  disabled={noPublishedProducts || productLocked}
                  aria-expanded={selectorOpen}
                >
                  {selectedProduct ? (
                    <>
                      <span className="update-subject-artwork">
                        {selectedProduct.cover_url ? (
                          <img src={selectedProduct.cover_url} alt={selectedProduct.title} />
                        ) : (
                          <span>{selectedProduct.title.slice(0, 1).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="update-subject-copy">
                        <span className="update-subject-title">{selectedProduct.title}</span>
                        <span className="update-subject-meta">{selectedProduct.product_type || 'Release'}</span>
                      </span>
                    </>
                  ) : (
                    <span className="update-subject-placeholder">
                      {noPublishedProducts ? 'Publish a release to post updates.' : 'Choose a published release'}
                    </span>
                  )}
                  {!productLocked && <span className="update-subject-chevron" aria-hidden="true">▾</span>}
                </button>

                {!productLocked && selectorOpen && publishedProducts.length > 0 && (
                  <div className="update-subject-menu">
                    <div className="update-subject-menu-list">
                      {publishedProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          className={product.id === selectedProductId ? 'update-subject-option update-subject-option-active' : 'update-subject-option'}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setSelectorOpen(false);
                          }}
                        >
                          <span className="update-subject-artwork">
                            {product.cover_url ? (
                              <img src={product.cover_url} alt={product.title} />
                            ) : (
                              <span>{product.title.slice(0, 1).toUpperCase()}</span>
                            )}
                          </span>
                          <span className="update-subject-copy">
                            <span className="update-subject-title">{product.title}</span>
                            <span className="update-subject-meta">{product.product_type || 'Release'}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                {productLocked
                  ? 'This update is attached to the selected release and can show up under that item in the library.'
                  : 'This update will be attached to the selected release and can show up under that item in the library.'}
              </p>
            </div>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Body</div>
              <textarea className="os-input-textarea" rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your update here." />
            </label>

            {error && <p className="os-type-body-small" style={{ color: 'var(--os-color-danger)' }}>{error}</p>}
            {!isCreatorProfile(profile) && (
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving || noPublishedProducts}>
                {saving ? 'Saving…' : 'Post Update'}
              </button>
              <Link className="os-button os-button-ghost" href="/dashboard/posts">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<PageShell><div style={{ minHeight: '40vh' }} /></PageShell>}>
      <NewPostPageContent />
    </Suspense>
  );
}
