'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { creatorHref, type Profile } from '@/lib/platform';
import Link from 'next/link';

type ReviewProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url'>;

type ProductReview = {
  id: string;
  user_id: string;
  product_id: string;
  title: string | null;
  body: string;
  sentiment: string;
  status: string;
  created_at: string;
  reviewers?: ReviewProfile | ReviewProfile[] | null;
};

function resolveReviewer(review: ProductReview) {
  return Array.isArray(review.reviewers) ? review.reviewers[0] : review.reviewers;
}

export function ProductReviewsSection({
  productId,
  canPost,
}: {
  productId: string;
  canPost: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadReviews() {
    const { data, error: loadError } = await supabase
      .from('product_reviews')
      .select('id,user_id,product_id,title,body,sentiment,status,created_at,reviewers:profiles!user_id(id,slug,username,display_name,avatar_url)')
      .eq('product_id', productId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setReviews((data as ProductReview[] | null) ?? []);
  }

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const ownReview = useMemo(
    () => reviews.find(review => review.user_id === user?.id) ?? null,
    [reviews, user?.id],
  );

  useEffect(() => {
    if (!ownReview || composerOpen) return;
    setTitle(ownReview.title ?? '');
    setBody(ownReview.body ?? '');
  }, [composerOpen, ownReview]);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canPost || !body.trim()) return;

    setSaving(true);
    setError('');

    const { error: reviewError } = await supabase
      .from('product_reviews')
      .upsert({
        user_id: user.id,
        product_id: productId,
        title: title.trim() || null,
        body: body.trim(),
        sentiment: 'recommended',
        status: 'published',
      }, { onConflict: 'user_id,product_id' });

    if (reviewError) {
      setSaving(false);
      setError(reviewError.message);
      return;
    }

    setSaving(false);
    setComposerOpen(false);
    await loadReviews();
  }

  return (
    <div className="view-section">
      <div className="item-community-header" style={{ marginBottom: 16 }}>
        <h2 className="view-section-title" style={{ margin: 0 }}>Reviews</h2>
        <button
          type="button"
          className="os-button os-button-secondary os-button-compact"
          onClick={() => {
            if (!user) {
              router.push('/login');
              return;
            }
            setComposerOpen(open => !open);
          }}
          disabled={!canPost}
        >
          {composerOpen ? 'Cancel' : ownReview ? 'Edit Review' : 'Post Review'}
        </button>
      </div>

      {composerOpen && canPost && (
        <div className="dashboard-list-surface item-community-surface" style={{ marginBottom: 16 }}>
          <form className="item-community-composer item-community-composer-surface" onSubmit={submitReview}>
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Review headline"
              className="item-community-composer-title"
              disabled={saving}
            />
            <textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder="What should someone know before they get this?"
              className="item-community-composer-body"
              rows={4}
              disabled={saving}
            />
            <div className="item-community-composer-actions">
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
                Reviews help people decide if this item is right for them.
              </div>
              <button className="os-button os-button-primary os-button-compact" type="submit" disabled={saving || !body.trim()}>
                {saving ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="dashboard-status dashboard-status-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="dashboard-list-surface item-community-surface">
        {reviews.length === 0 ? (
          <div className="dashboard-empty">No reviews yet.</div>
        ) : (
          reviews.map(review => {
            const reviewer = resolveReviewer(review);
            return (
            <article key={review.id} className="product-review-row">
              <div className="product-domain-head">
                <div>
                  <h3 className="os-type-card-title">{review.title || 'Recommended'}</h3>
                  <Link href={creatorHref(reviewer ?? null)} className="os-type-meta product-domain-meta-link">
                    {reviewer?.display_name || reviewer?.username || '44 Member'}
                  </Link>
                </div>
                <span className="os-pill os-status-owned">Recommended</span>
              </div>
              <p className="os-type-body product-domain-body">{review.body}</p>
            </article>
            );
          })
        )}
      </div>
    </div>
  );
}
