'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import { getProductStoreAccessLabel, isFreeLibraryClaim } from '@/lib/libraryContent';
import { creatorHref } from '@/lib/platform';
import { DockedContent, DockedLayout, DockedPanel } from '@/components/Ui';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';

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
          .eq('category', data.category)
          .neq('id', data.id)
          .limit(4);

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
        .from('library_items')
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

  async function addToLibrary() {
    if (!product) return;
    if (!user) {
      alert('Sign in first, then add this to your library.');
      return;
    }
    if (!isFreeLibraryClaim(product)) {
      alert('Cart is coming soon. Free items can be added to your library now.');
      return;
    }

    const { error } = await supabase
      .from('library_items')
      .upsert({
        user_id: user.id,
        product_id: product.id,
        acquisition_type: 'free',
      }, { onConflict: 'user_id,product_id' });

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
      alert('Add this item to your library before leaving a review.');
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

  if (loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (!product) return <CenteredMessage>Product not found</CenteredMessage>;

  const heroImage = product.hero_url || product.cover_url;
  const canClaimToLibrary = isFreeLibraryClaim(product);
  const primaryAction = owned ? 'Owned' : canClaimToLibrary ? 'Add to Library' : 'Add to Cart';
  const accessLabel = getProductStoreAccessLabel(product);

  return (
    <DockedLayout side="right">
        <DockedContent>
          <section style={{ minHeight: 460, borderRadius: 30, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', position: 'relative', background: getHeroBackground(product) }}>
            {heroImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.92), rgba(8,8,14,0.58) 48%, rgba(8,8,14,0.16)), radial-gradient(circle at 75% 20%, rgba(255,255,255,0.18), transparent 34%)' }} />
            <div style={{ position: 'relative', zIndex: 1, minHeight: 460, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <Link className="btn-ghost" href="/browse" style={{ marginBottom: 28 }}>Back to Browse</Link>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: 10 }}>{productMeta(product)}</div>
                <h1 style={{ maxWidth: 820, fontSize: 64, fontWeight: 780, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#fff', marginBottom: 14 }}>{product.title}</h1>
                <div style={{ fontSize: 18, fontWeight: 650, color: 'rgba(255,255,255,0.62)' }}>by {product.creator}</div>
              </div>
              <p style={{ maxWidth: 720, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75 }}>{product.description}</p>
            </div>
          </section>

          <section className="product-info-grid">
            <InfoPanel title="Included">
              <InfoLine label="Format" value={product.product_type} />
              <InfoLine label="Category" value={product.category} />
              <InfoLine label="Access" value={accessLabel} />
            </InfoPanel>
            <InfoPanel title="Discovery">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Link href={browseHref({ category: product.category })} className="chip">{product.category}</Link>
                {(product.tags ?? []).map(tag => (
                  <Link key={tag} href={browseHref({ tag })} className="chip">{tag}</Link>
                ))}
              </div>
            </InfoPanel>
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
            <section>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.52)', marginBottom: 12 }}>More Like This</div>
              <div className="related-grid">
                {related.map(item => (
                  <Link key={item.id} href={`/product/${item.slug || item.id}`} style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.09)', background: getHeroBackground(item), minHeight: 160, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{item.category}</div>
                    <div style={{ fontSize: 18, fontWeight: 780, lineHeight: 1, color: '#fff' }}>{item.title}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </DockedContent>

        <DockedPanel>
          <div className="detail-panel-stack">
            <div className="detail-panel-image" style={{ background: getHeroBackground(product) }}>
              {product.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.cover_url} alt="" />
              )}
            </div>
            <div className="detail-panel-copy">
              <div className="detail-panel-title">{product.title}</div>
              <div className="detail-panel-subtitle">by {product.creator}</div>
              <div className="detail-panel-description">{product.description ?? productMeta(product)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div className="detail-panel-price" style={{ color: canClaimToLibrary ? '#93FF00' : '#fff' }}>{formatProductPrice(product)}</div>
              {owned && <div className="chip">Owned</div>}
            </div>
            <div className="detail-panel-actions">
              <button className="btn-primary" onClick={addToLibrary} disabled={owned} style={{ opacity: owned ? 0.72 : 1 }}>{primaryAction}</button>
              <Link className="btn-ghost" href={creatorHref(product.creator)}>View Creator</Link>
            </div>
            <div className="divider" />
            <div className="detail-panel-meta">
              <div className="detail-panel-section-title">Product Details</div>
              <InfoLine label="Creator" value={product.creator} />
              <InfoLine label="Type" value={product.product_type} />
              <InfoLine label="Access" value={accessLabel} />
              <InfoLine label="Status" value={product.is_published ? 'Published' : 'Hidden'} />
            </div>
          </div>
        </DockedPanel>
        <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </DockedLayout>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 22, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
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
      ? 'Add this item to your Library before reviewing it.'
      : 'Recommend this item to the community.';

  return (
    <section id="reviews" className="product-review-panel">
      <div className="product-review-summary">
        <div>
          <div className="surface-eyebrow">Community Reviews</div>
          <h2>{total > 0 ? `${ratio}% recommend` : 'No reviews yet'}</h2>
          <p>{total > 0 ? `${recommended} of ${total} review${total === 1 ? '' : 's'} recommend this item.` : prompt}</p>
        </div>
        <div className="product-review-meter" aria-hidden="true">
          <span style={{ width: `${ratio}%` }} />
        </div>
      </div>

      <div className="product-review-form">
        <div className="product-review-toggle">
          <button type="button" className={sentiment === 'recommended' ? 'active' : ''} onClick={() => onSentiment('recommended')}>Recommend</button>
          <button type="button" className={sentiment === 'not_recommended' ? 'active' : ''} onClick={() => onSentiment('not_recommended')}>Not for me</button>
        </div>
        <textarea value={body} onChange={event => onBody(event.target.value)} placeholder="Share a short review..." disabled={!userSignedIn || !owned} />
        <button className="btn-primary" type="button" disabled={!userSignedIn || !owned || saving || body.trim().length === 0} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Review'}
        </button>
      </div>

      {reviews.length > 0 && (
        <div className="product-review-list">
          {reviews.slice(0, 4).map(review => (
            <article key={review.id} className="product-review-card">
              <div>{review.sentiment === 'recommended' ? 'Recommended' : 'Not for me'}</div>
              <p>{review.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.38)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 750, color: 'rgba(255,255,255,0.76)', textAlign: 'right' }}>{value}</div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: 500 }}>
      {children}
    </div>
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

  const { data: existingUnlock } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievement.id)
    .maybeSingle();

  if (existingUnlock) return null;

  const { error } = await supabase.from('user_achievements').insert({
    user_id: userId,
    product_id: productId,
    achievement_id: achievement.id,
  });

  if (error) return null;

  await supabase.from('achievement_events').insert({
    user_id: userId,
    product_id: productId,
    achievement_id: achievement.id,
    event_type: 'achievement_unlocked',
    metadata: { trigger_type: 'reviewed', achievement_code: achievement.code, source: 'product_review' },
  });

  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    points: achievement.points,
  };
}

function getHeroBackground(product: Product) {
  const tones: Record<string, string> = {
    Music: 'linear-gradient(135deg, rgba(72,74,92,0.92), rgba(14,14,22,0.96)), radial-gradient(circle at 78% 18%, rgba(147,255,0,0.22), transparent 36%)',
    Games: 'linear-gradient(135deg, rgba(32,42,78,0.94), rgba(9,12,20,0.96)), radial-gradient(circle at 75% 22%, rgba(92,144,255,0.30), transparent 38%)',
    Books: 'linear-gradient(135deg, rgba(78,65,52,0.92), rgba(18,15,14,0.96)), radial-gradient(circle at 74% 20%, rgba(255,230,200,0.20), transparent 36%)',
    'Sample Packs': 'linear-gradient(135deg, rgba(60,48,76,0.92), rgba(15,12,20,0.96)), radial-gradient(circle at 76% 20%, rgba(220,170,255,0.24), transparent 36%)',
    Interactive: 'linear-gradient(135deg, rgba(30,64,68,0.92), rgba(8,16,18,0.96)), radial-gradient(circle at 76% 20%, rgba(125,255,232,0.22), transparent 36%)',
    Tools: 'linear-gradient(135deg, rgba(58,61,68,0.94), rgba(14,15,18,0.96)), radial-gradient(circle at 76% 20%, rgba(255,255,255,0.20), transparent 36%)',
    Apparel: 'linear-gradient(135deg, rgba(70,60,58,0.92), rgba(18,15,14,0.96)), radial-gradient(circle at 76% 20%, rgba(255,205,160,0.22), transparent 36%)',
  };

  return tones[product.category] ?? tones.Music;
}
