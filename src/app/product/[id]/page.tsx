'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import { getProductStoreAccessLabel, isFreeCollectionClaim } from '@/lib/collectionContent';
import { creatorHref } from '@/lib/platform';
import { PageShell, DetailRow, CenteredMessage, ProductGrid, ProductCard } from '@/components/Ui';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';

interface ProductReview {
  id: string;
  user_id: string;
  product_id: string;
  body: string;
  sentiment: 'recommended' | 'not_recommended';
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSentiment, setReviewSentiment] = useState<'recommended' | 'not_recommended'>('recommended');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      const productQuery = supabase.from('products').select('*');
      const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ? productQuery.eq('id', id)
        : productQuery.eq('slug', id)
      ).maybeSingle();

      setProduct(data);
      setLoading(false);

      if (data) {
        const { data: relatedProducts } = await supabase
          .from('products')
          .select('*')
          .eq('is_published', true)
          .eq('creator', data.creator)
          .neq('id', data.id)
          .limit(8);

        setRelated(relatedProducts ?? []);

        const { data: reviewRows } = await supabase
          .from('product_reviews')
          .select('id,user_id,product_id,body,sentiment,status,created_at,updated_at')
          .eq('product_id', data.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        setReviews((reviewRows as ProductReview[] | null) ?? []);
      }
    }

    fetchProduct();
  }, [id]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;

      const { data } = await supabase
        .from('collection_items')
        .select('product_id')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .maybeSingle();

      setOwned(Boolean(data));
    }

    if (user) {
      fetchOwnership(user.id);
    } else {
      Promise.resolve().then(() => setOwned(false));
    }
  }, [product, user]);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setReviewBody('');
        setReviewSentiment('recommended');
      });
      return;
    }

    const ownReview = reviews.find(review => review.user_id === user.id);
    if (ownReview) {
      Promise.resolve().then(() => {
        setReviewBody(ownReview.body);
        setReviewSentiment(ownReview.sentiment);
      });
    }
  }, [reviews, user]);

  async function addToCollection() {
    if (!product) return;
    if (!user) {
      alert('Sign in first, then add this to your collection.');
      return;
    }
    if (!isFreeCollectionClaim(product)) {
      alert('Cart is coming soon. Free items can be added to your collection now.');
      return;
    }

    const { error } = await supabase
      .from('collection_items')
      .upsert({ user_id: user.id, product_id: product.id, acquisition_type: 'free' }, { onConflict: 'user_id,product_id' });

    if (error) {
      alert(error.message);
      return;
    }

    setOwned(true);
  }

  async function saveReview() {
    if (!product || !user) {
      alert('Sign in first, then leave a review.');
      return;
    }

    if (!owned) {
      alert('Add this item to your collection before leaving a review.');
      return;
    }

    const body = reviewBody.trim();
    if (!body) return;

    setReviewSaving(true);
    const { data, error } = await supabase
      .from('product_reviews')
      .upsert({
        user_id: user.id,
        product_id: product.id,
        body,
        sentiment: reviewSentiment,
        status: 'published',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' })
      .select('id,user_id,product_id,body,sentiment,status,created_at,updated_at')
      .single();

    setReviewSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      setReviews(previous => {
        const withoutOwnReview = previous.filter(review => review.user_id !== user.id);
        return [data as ProductReview, ...withoutOwnReview];
      });
    }

    const unlocked = await unlockSupporterAchievement(user.id, product.id);
    if (unlocked) setToast(unlocked);
  }

  if (loading) return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  if (!product) return <PageShell><CenteredMessage>Product not found</CenteredMessage></PageShell>;

  const heroImage = product.hero_url || product.cover_url;
  const canClaimToCollection = isFreeCollectionClaim(product);
  const primaryAction = owned ? 'Owned' : canClaimToCollection ? 'Add to Collection' : 'Add to Cart';
  const accessLabel = getProductStoreAccessLabel(product);
  const creatorLink = creatorHref(product.creator);

  return (
    <PageShell>
      <section className="collection-release-hero collection-release-hero-product">
        {heroImage && (
          <div className="collection-release-hero-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={product.title} />
          </div>
        )}
        <div className="collection-release-copy">
          <div className="surface-eyebrow">{productMeta(product)}</div>
          <h1>{product.title}</h1>
          <p>{product.long_description || product.short_description}</p>
        </div>
      </section>

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Action Items</div>
        </div>
        <div className="collection-action-row">
          <div
            className="app-card-price os-type-panel-title"
            style={{ color: canClaimToCollection ? 'var(--os-color-owned)' : 'var(--os-color-ink)' }}
          >
            {formatProductPrice(product)}
          </div>
          <div className="collection-action-buttons">
            <button className="os-button os-button-primary" onClick={addToCollection} disabled={owned}>{primaryAction}</button>
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
          </div>
        </div>
      </section>

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Meta</div>
        </div>
        <div className="collection-panel-stack">
          <DetailRow label="Creator" value={product.creator} />
          <DetailRow label="Type" value={product.product_type} />
          <DetailRow label="Access" value={accessLabel} />
          <DetailRow label="Status" value={owned ? 'Owned' : product.is_published ? 'Published' : 'Hidden'} />
          {(product.tags ?? []).length > 0 && (
            <div className="app-tag-row" style={{ marginTop: 'var(--os-space-2)' }}>
              {(product.tags ?? []).map(tag => (
                <Link key={tag} href={browseHref({ tag })} className="os-pill os-type-pill">{tag}</Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <ProductReviewSection
        owned={owned}
        userSignedIn={Boolean(user)}
        reviews={reviews}
        body={reviewBody}
        sentiment={reviewSentiment}
        saving={reviewSaving}
        onBody={setReviewBody}
        onSentiment={setReviewSentiment}
        onSave={saveReview}
      />

      {related.length > 0 && (
        <section className="app-section">
          <div className="hub-section-head">
            <h2 className="hub-section-title os-type-section-title">Similar Products</h2>
          </div>
          <ProductGrid>
            {related.map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </ProductGrid>
        </section>
      )}

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </PageShell>
  );
}

function ProductReviewSection({
  owned,
  userSignedIn,
  reviews,
  body,
  sentiment,
  saving,
  onBody,
  onSentiment,
  onSave,
}: {
  owned: boolean;
  userSignedIn: boolean;
  reviews: ProductReview[];
  body: string;
  sentiment: 'recommended' | 'not_recommended';
  saving: boolean;
  onBody: (value: string) => void;
  onSentiment: (value: 'recommended' | 'not_recommended') => void;
  onSave: () => Promise<void>;
}) {
  const recommended = reviews.filter(review => review.sentiment === 'recommended').length;
  const total = reviews.length;
  const ratio = total > 0 ? Math.round((recommended / total) * 100) : 0;
  const prompt = !userSignedIn
    ? 'Sign in to review this item.'
    : !owned
      ? 'Add this item to your Collection before reviewing it.'
      : 'Recommend this item to the community.';

  return (
    <section id="reviews" className="app-panel app-detail-stack">
      <div>
        <div className="app-panel-title os-type-eyebrow">Community Reviews</div>
        <div className="os-type-section-title">{total > 0 ? `${ratio}% recommend` : 'No reviews yet'}</div>
        <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 'var(--os-space-1)' }}>
          {total > 0 ? `${recommended} of ${total} review${total === 1 ? '' : 's'} recommend this item.` : prompt}
        </p>
      </div>

      <div className="app-detail-stack">
        <div className="app-tag-row">
          <button
            type="button"
            className={sentiment === 'recommended' ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-ghost os-button-compact'}
            onClick={() => onSentiment('recommended')}
          >
            Recommend
          </button>
          <button
            type="button"
            className={sentiment === 'not_recommended' ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-ghost os-button-compact'}
            onClick={() => onSentiment('not_recommended')}
          >
            Not for me
          </button>
        </div>
        <textarea
          className="os-input-textarea"
          value={body}
          onChange={event => onBody(event.target.value)}
          placeholder="Share a short review…"
          disabled={!userSignedIn || !owned}
        />
        <button
          className="os-button os-button-primary os-button-compact"
          type="button"
          disabled={!userSignedIn || !owned || saving || body.trim().length === 0}
          onClick={onSave}
          style={{ alignSelf: 'flex-start' }}
        >
          {saving ? 'Saving…' : 'Save Review'}
        </button>
      </div>

      {reviews.length > 0 && (
        <div className="app-detail-stack">
          {reviews.slice(0, 4).map(review => (
            <article key={review.id} className="app-panel">
              <div className="os-type-eyebrow" style={{ color: review.sentiment === 'recommended' ? 'var(--os-color-owned)' : 'var(--os-color-ink-muted)', marginBottom: 'var(--os-space-2)' }}>
                {review.sentiment === 'recommended' ? 'Recommended' : 'Not for me'}
              </div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{review.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function unlockSupporterAchievement(userId: string, productId: string) {
  const { data: achievement } = await supabase
    .from('product_achievements')
    .select('id,code,title,description,points,trigger_type')
    .eq('product_id', productId)
    .eq('trigger_type', 'reviewed')
    .maybeSingle();

  if (!achievement) return null;

  return unlockAchievementForUser(userId, productId, achievement, { source: 'product_review' });
}
