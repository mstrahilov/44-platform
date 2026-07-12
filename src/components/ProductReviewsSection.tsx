'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { creatorHref, type Profile } from '@/lib/platform';
import { trackProductAchievementTrigger } from '@/lib/achievementTracking';
import Link from 'next/link';
import { SectionHeader } from '@/components/Ui';

type ReviewProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url'>;

type ProductReview = {
  id: string;
  user_id: string;
  item_id: string;
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
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadReviews() {
    const { data, error: loadError } = await supabase
      .from('community_review_content')
      .select('id,user_id,item_id,title,body,sentiment,status,created_at,reviewers:profiles!user_id(id,slug,username,display_name,avatar_url)')
      .eq('item_id', productId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setReviews((data as ProductReview[] | null) ?? []);
  }

  useEffect(() => {
    Promise.resolve().then(() => loadReviews());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const ownReview = useMemo(
    () => reviews.find(review => review.user_id === user?.id) ?? null,
    [reviews, user?.id],
  );

  useEffect(() => {
    if (!ownReview || composerOpen) return;
    Promise.resolve().then(() => setBody(ownReview.body ?? ''));
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

    const { error: reviewError } = await supabase.rpc('upsert_content_review', {
      target_item_id: productId,
      review_body: body.trim(),
      review_title: undefined,
      review_sentiment: 'recommended',
      review_rating: undefined,
    });

    if (reviewError) {
      setSaving(false);
      setError(reviewError.message);
      return;
    }

    setSaving(false);
    setComposerOpen(false);
    await trackProductAchievementTrigger({
      userId: user.id,
      productId,
      triggerType: 'review_created',
      metadata: { source: 'product_review' },
    });
    await loadReviews();
  }

  return (
    <div className="view-section">
      <SectionHeader
        title="Reviews"
        action={
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
        }
      />

      {composerOpen && canPost && (
        <div className="dashboard-list-surface item-community-surface" style={{ marginBottom: 16 }}>
          <form className="item-community-composer item-community-composer-surface" onSubmit={submitReview}>
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

      {reviews.length === 0 ? (
        <p className="app-empty-text view-content-empty">No reviews yet.</p>
      ) : (
        <div className="dashboard-list-surface item-community-surface product-review-list-surface">
          {reviews.map(review => {
            const reviewer = resolveReviewer(review);
            return (
            <article key={review.id} className="product-review-row">
              <div className="product-domain-head">
                <div className="product-review-copy">
                  <Link href={creatorHref(reviewer ?? null)} className="product-review-author">
                    <span className="product-review-avatar">
                      {reviewer?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reviewer.avatar_url} alt="" />
                      ) : (
                        <span>{(reviewer?.display_name || reviewer?.username || '44').slice(0, 2).toUpperCase()}</span>
                      )}
                    </span>
                    <span>{reviewer?.display_name || reviewer?.username || '44 Member'}</span>
                  </Link>
                </div>
              </div>
              <p className="os-type-body product-domain-body">{review.body}</p>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
