'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { creatorHref } from '@/lib/platform';
import { trackProductAchievementTrigger } from '@/lib/achievementTracking';
import Link from 'next/link';
import { SectionHeader } from '@/components/Ui';
import { SocialTrashIcon } from '@/components/Social';
import { deleteItemReview, listItemReviews, saveItemReview, type ItemReview } from '@/lib/domain/itemCommunity';
import { Ui44Textarea } from '@/components/ui44/Inputs';

type ProductReview = ItemReview;

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
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  async function loadReviews() {
    try {
      setReviews(await listItemReviews(productId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load reviews.');
      return;
    }
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
    if (!ownReview) return;
    Promise.resolve().then(() => {
      setComposerOpen(false);
      setBody('');
    });
  }, [ownReview]);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canPost || !body.trim()) return;

    setSaving(true);
    setError('');

    try {
      await saveItemReview(productId, body.trim());
    } catch (reviewError) {
      setSaving(false);
      setError(reviewError instanceof Error ? reviewError.message : 'Could not save your review.');
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

  async function removeReview(review: ProductReview) {
    if (!user || review.user_id !== user.id || deletingId) return;
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    setDeletingId(review.id);
    setError('');
    try {
      await deleteItemReview(review.id);
      setReviews(current => current.filter(item => item.id !== review.id));
      setBody('');
      setComposerOpen(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete your review.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="view-section">
      <SectionHeader
        title="Reviews"
        action={!ownReview ? (
          <button
            type="button"
            className="ui44-symbol-button ui44-symbol-button-add page-filter-button product-review-add"
            aria-label="Leave a review"
            title="Leave a review"
            onClick={() => {
              if (!user) {
                router.push('/login');
                return;
              }
              setComposerOpen(open => !open);
            }}
            disabled={!canPost}
          >
            <span aria-hidden="true">+</span>
          </button>
        ) : undefined}
      />

      {composerOpen && canPost && (
        <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip item-community-surface ui44-section-gap-after-small">
          <form className="item-community-composer item-community-composer-surface ui44-composed-field ui44-composed-field-editor" onSubmit={submitReview}>
            <Ui44Textarea
              surface="bare"
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder="What should someone know before they get this?"
              className="item-community-composer-body"
              rows={4}
              disabled={saving}
            />
            <div className="item-community-composer-actions">
              <div className="os-type-meta ui44-text-muted">
                Reviews help people decide if this item is right for them.
              </div>
              <button className="os-button os-button-primary os-button-compact" type="submit" disabled={saving || !body.trim()}>
                {saving ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error ui44-section-gap-after-small" role="alert">{error}</div>}

      {reviews.length === 0 ? (
        <p className="app-empty-text view-content-empty">No reviews yet.</p>
      ) : (
        <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip item-community-surface product-review-list-surface">
          {reviews.map(review => {
            const reviewer = resolveReviewer(review);
            return (
            <article key={review.id} className="product-review-row ui44-list-row ui44-list-row-review">
              <div className="product-domain-head">
                <div className="product-review-copy">
                  <Link href={creatorHref(reviewer ?? null)} className="product-review-author">
                    <span className="product-review-avatar ui44-identity-avatar ui44-identity-avatar-inline">
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
                {review.user_id === user?.id ? (
                  <button
                    type="button"
                    className="social-action social-action-danger product-review-delete"
                    onClick={() => { void removeReview(review); }}
                    aria-label="Delete review"
                    disabled={deletingId === review.id}
                  >
                    <SocialTrashIcon />
                  </button>
                ) : null}
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
