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
import { ProductGrid, ProductCard } from '@/components/Ui';
import { ItemCommunitySection } from '@/components/ItemCommunitySection';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useTopbarBack } from '@/components/TopbarContext';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);

  useTopbarBack({ href: '/', label: 'Store' });

  useEffect(() => {
    async function fetchProduct() {
      const productQuery = supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)');
      const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ? productQuery.eq('id', id)
        : productQuery.eq('slug', id)
      ).maybeSingle();

      setProduct(data);
      setLoading(false);

      if (data) {
        const relatedQuery = supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('is_published', true)
          .neq('id', data.id)
          .limit(4);

        const relatedScope = data.author_id
          ? relatedQuery.eq('author_id', data.author_id)
          : relatedQuery.eq('creator', data.creator);

        const { data: relatedProducts } = await relatedScope;
        setRelated(relatedProducts ?? []);
      }
    }
    fetchProduct();
  }, [id]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;
      const { data } = await supabase.from('library_items').select('product_id').eq('user_id', userId).eq('product_id', product.id).maybeSingle();
      setOwned(Boolean(data));
    }
    if (user) fetchOwnership(user.id);
    else Promise.resolve().then(() => setOwned(false));
  }, [product, user]);

  async function addToLibrary() {
    if (!product) return;
    if (!user) { alert('Sign in first, then add this to your library.'); return; }
    if (!isFreeLibraryClaim(product)) { alert('Cart is coming soon. Free items can be added to your library now.'); return; }
    const { error } = await supabase.from('library_items').upsert({ user_id: user.id, product_id: product.id, acquisition_type: 'free' }, { onConflict: 'user_id,product_id' });
    if (error) { alert(error.message); return; }
    setOwned(true);
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!product) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Product not found</div>;

  const heroImage = product.hero_url || product.cover_url;
  const canClaimToLibrary = isFreeLibraryClaim(product);
  const primaryAction = canClaimToLibrary ? 'Add to Library' : 'Add to Cart';
  const accessLabel = getProductStoreAccessLabel(product);
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const creatorReleasesLink = `${creatorLink}?tab=releases`;

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
            <span className="view-album-meta-strong">{product.creators?.display_name || product.creator}</span>
            {product.year && (<><span className="view-album-meta-sep" /><span>{product.year}</span></>)}
            <span className="view-album-meta-sep" />
            <span className={`view-album-meta-strong${canClaimToLibrary ? ' view-album-meta-accent' : ''}`}>
              {formatProductPrice(product)}
            </span>
          </div>
          <div className="view-album-actions">
            {owned ? (
              <Link className="os-button os-button-primary" href="/library">View in Library</Link>
            ) : (
              <button className="os-button os-button-primary" onClick={addToLibrary}>{primaryAction}</button>
            )}
            <Link className="os-button os-button-secondary" href={creatorReleasesLink}>View Creator</Link>
          </div>
        </div>
      </div>

      {/* Description — only if it's long enough to matter */}
      {hasDescription && description.length > 40 && (
        <div className="view-section">
          <p className="os-type-body view-description">
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

      <ItemCommunitySection
        subjectType="product"
        subjectId={product.id}
        intent="review"
        sectionTitle="Reviews"
        actionLabel="Post Review"
        titlePlaceholder={`Reviewing "${product.title}"`}
        composerPlaceholder="What did you think of it?"
        emptyMessage="No reviews yet — be the first."
        canPost={owned}
      />

      {/* Related */}
      {related.length > 0 && (
        <div className="view-section">
          <div className="item-community-header" style={{ marginBottom: 16 }}>
            <h2 className="view-section-title" style={{ margin: 0 }}>More from {product.creators?.display_name || product.creator}</h2>
            <Link className="os-button os-button-secondary os-button-compact" href={creatorReleasesLink}>
              View All
            </Link>
          </div>
          <ProductGrid>
            {related.map(item => <ProductCard key={item.id} product={item} />)}
          </ProductGrid>
        </div>
      )}

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
