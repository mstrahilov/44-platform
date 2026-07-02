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
import { ProductGrid, ProductCard } from '@/components/Ui';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';
import { useTopbarBack } from '@/components/TopbarContext';

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

  useTopbarBack({ href: '/', label: 'Store' });

  useEffect(() => {
    async function fetchProduct() {
      const productQuery = supabase
        .from('products')
        .select('*, creators:profiles!author_id(id, slug, username, display_name, avatar_url)');
      const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ? productQuery.eq('id', id)
        : productQuery.eq('slug', id)
      ).maybeSingle();

      setProduct(data);
      setLoading(false);

      if (data) {
        const relatedQuery = supabase
          .from('products')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, avatar_url)')
          .eq('is_published', true)
          .neq('id', data.id)
          .limit(8);

        const relatedScope = data.author_id
          ? relatedQuery.eq('author_id', data.author_id)
          : relatedQuery.eq('creator', data.creator);

        const [{ data: relatedProducts }, { data: reviewRows }] = await Promise.all([
          relatedScope,
          supabase.from('product_reviews').select('id,user_id,product_id,body,sentiment,status,created_at,updated_at').eq('product_id', data.id).eq('status', 'published').order('created_at', { ascending: false }),
        ]);
        setRelated(relatedProducts ?? []);
        setReviews((reviewRows as ProductReview[] | null) ?? []);
      }
    }
    fetchProduct();
  }, [id]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;
      const { data } = await supabase.from('collection_items').select('product_id').eq('user_id', userId).eq('product_id', product.id).maybeSingle();
      setOwned(Boolean(data));
    }
    if (user) fetchOwnership(user.id);
    else Promise.resolve().then(() => setOwned(false));
  }, [product, user]);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => { setReviewBody(''); setReviewSentiment('recommended'); });
      return;
    }
    const ownReview = reviews.find(r => r.user_id === user.id);
    if (ownReview) {
      Promise.resolve().then(() => { setReviewBody(ownReview.body); setReviewSentiment(ownReview.sentiment); });
    }
  }, [reviews, user]);

  async function addToCollection() {
    if (!product) return;
    if (!user) { alert('Sign in first, then add this to your collection.'); return; }
    if (!isFreeCollectionClaim(product)) { alert('Cart is coming soon. Free items can be added to your collection now.'); return; }
    const { error } = await supabase.from('collection_items').upsert({ user_id: user.id, product_id: product.id, acquisition_type: 'free' }, { onConflict: 'user_id,product_id' });
    if (error) { alert(error.message); return; }
    setOwned(true);
  }

  async function saveReview() {
    if (!product || !user) { alert('Sign in first, then leave a review.'); return; }
    if (!owned) { alert('Add this item to your collection before reviewing it.'); return; }
    const body = reviewBody.trim();
    if (!body) return;
    setReviewSaving(true);
    const { data, error } = await supabase
      .from('product_reviews')
      .upsert({ user_id: user.id, product_id: product.id, body, sentiment: reviewSentiment, status: 'published', updated_at: new Date().toISOString() }, { onConflict: 'user_id,product_id' })
      .select('id,user_id,product_id,body,sentiment,status,created_at,updated_at').single();
    setReviewSaving(false);
    if (error) { alert(error.message); return; }
    if (data) setReviews(prev => [data as ProductReview, ...prev.filter(r => r.user_id !== user.id)]);
    const unlocked = await unlockSupporterAchievement(user.id, product.id);
    if (unlocked) setToast(unlocked);
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!product) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Product not found</div>;

  const heroImage = product.hero_url || product.cover_url;
  const canClaimToCollection = isFreeCollectionClaim(product);
  const primaryAction = owned ? 'Owned' : canClaimToCollection ? 'Add to Collection' : 'Add to Cart';
  const accessLabel = getProductStoreAccessLabel(product);
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const recommended = reviews.filter(r => r.sentiment === 'recommended').length;
  const total = reviews.length;
  const ratio = total > 0 ? Math.round((recommended / total) * 100) : 0;

  const hasDescription = Boolean(product.long_description || product.short_description);
  const description = product.long_description || product.short_description || '';

  return (
    <div className="view-detail-single">

      {/* Album-style header */}
      <div
        className={heroImage ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as React.CSSProperties : undefined}
      >
        <div className="view-album-cover">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow">{productMeta(product)}</div>
          <h1 className="view-album-title">{product.title}</h1>
          <div className="view-album-meta">
            <span style={{ fontWeight: 700 }}>{product.creators?.display_name || product.creator}</span>
            {product.year && (<><span className="view-album-meta-sep" /><span>{product.year}</span></>)}
            <span className="view-album-meta-sep" />
            <span style={{ color: canClaimToCollection ? '#7cff4f' : '#fff', fontWeight: 700 }}>
              {formatProductPrice(product)}
            </span>
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" onClick={addToCollection} disabled={owned}>{primaryAction}</button>
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
          </div>
        </div>
      </div>

      {/* Description — only if it's long enough to matter */}
      {hasDescription && description.length > 40 && (
        <div className="view-section">
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720, fontSize: 16 }}>
            {description}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="view-section">
        <h2 className="view-section-title">Details</h2>
        <div>
          <div className="view-row">
            <span className="view-row-label">Creator</span>
            <span className="view-row-value">{product.creators?.display_name || product.creator}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Type</span>
            <span className="view-row-value">{product.product_type}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Access</span>
            <span className="view-row-value">{accessLabel}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Status</span>
            <span className="view-row-value">{owned ? 'Owned' : product.is_published ? 'Published' : 'Hidden'}</span>
          </div>
        </div>
        {(product.tags ?? []).length > 0 && (
          <div className="app-tag-row" style={{ marginTop: 24 }}>
            {(product.tags ?? []).map(tag => (
              <Link key={tag} href={browseHref({ tag })} className="os-pill os-type-pill">{tag}</Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="view-section">
        <h2 className="view-section-title">Community Reviews</h2>
        <div style={{ marginBottom: 20 }}>
          <div className="os-type-section-title" style={{ marginBottom: 4 }}>{total > 0 ? `${ratio}% recommend` : 'No reviews yet'}</div>
          {total > 0 && (
            <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              {recommended} of {total} review{total === 1 ? '' : 's'} recommend this item.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
          <div className="app-tag-row">
            <button type="button" className={sentiment(reviewSentiment, 'recommended')} onClick={() => setReviewSentiment('recommended')}>Recommend</button>
            <button type="button" className={sentiment(reviewSentiment, 'not_recommended')} onClick={() => setReviewSentiment('not_recommended')}>Not for me</button>
          </div>
          <textarea className="os-input-textarea" value={reviewBody} onChange={e => setReviewBody(e.target.value)} placeholder="Share a short review…" disabled={!user || !owned} />
          <button className="os-button os-button-primary os-button-compact" type="button" disabled={!user || !owned || reviewSaving || reviewBody.trim().length === 0} onClick={saveReview} style={{ alignSelf: 'flex-start' }}>
            {reviewSaving ? 'Saving…' : 'Save Review'}
          </button>
        </div>

        {reviews.length > 0 && (
          <div>
            {reviews.slice(0, 6).map(review => (
              <div key={review.id} className="view-row" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '18px 0', gap: 6 }}>
                <div className="os-type-eyebrow" style={{ color: review.sentiment === 'recommended' ? 'var(--os-color-owned)' : 'var(--os-color-ink-muted)' }}>
                  {review.sentiment === 'recommended' ? 'Recommended' : 'Not for me'}
                </div>
                <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{review.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="view-section">
          <h2 className="view-section-title">More from {product.creators?.display_name || product.creator}</h2>
          <ProductGrid>
            {related.map(item => <ProductCard key={item.id} product={item} />)}
          </ProductGrid>
        </div>
      )}

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function sentiment(current: string, value: string) {
  return current === value
    ? 'os-button os-button-primary os-button-compact'
    : 'os-button os-button-ghost os-button-compact';
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
