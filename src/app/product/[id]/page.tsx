'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import { getProductStoreAccessLabel, isFreeLibraryClaim } from '@/lib/libraryContent';
import { getProductExperience, productLibraryHref, productStoreHref, storeIndexHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { ProductGrid, ProductCard } from '@/components/Ui';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useTopbarBack } from '@/components/TopbarContext';
import { addToCart, useCart } from '@/lib/cart';
import { resolvePrice } from '@/lib/pricing';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';

type ProductTrack = {
  id: string;
  title: string;
  number?: number | null;
  track_number?: number | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
  download_url?: string | null;
};

export default function ProductPage() {
  notFound();
}

export function ProductStoreDetail({
  identifier,
  backHref,
  backLabel,
  legacyRedirect = false,
  releasePage = false,
  merchPage = false,
}: {
  identifier: string;
  backHref?: string;
  backLabel?: string;
  legacyRedirect?: boolean;
  releasePage?: boolean;
  merchPage?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const { currentTrack, isPlaying, playQueue, toggleTrack } = useMusicPlayer();
  const [product, setProduct] = useState<Product | null>(null);
  const [tracks, setTracks] = useState<ProductTrack[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [owned, setOwned] = useState(false);
  const [ownedLibraryItemId, setOwnedLibraryItemId] = useState<string | null>(null);
  const [ownedAcquisitionType, setOwnedAcquisitionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useTopbarBack({ href: backHref ?? '/', label: backLabel ?? 'Store' });

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setTracks([]);
      const productQuery = supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)');
      const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
        ? productQuery.eq('id', identifier)
        : productQuery.eq('slug', identifier)
      ).maybeSingle();

      setProduct(data);
      setLoading(false);

      if (data && merchPage && getProductExperience(data) !== 'physical') {
        router.replace(productStoreHref(data));
        return;
      }

      if (data && legacyRedirect) {
        const target = productStoreHref(data);
        router.replace(target);
        return;
      }

      if (data) {
        if (releasePage || getProductExperience(data) === 'music') {
          const { data: trackRows } = await supabase
            .from('tracks')
            .select('*')
            .eq('product_id', data.id);
          setTracks(((trackRows as ProductTrack[] | null) ?? []).sort((a, b) => trackOrder(a) - trackOrder(b)));
        }

        const relatedLimit = getProductExperience(data) === 'physical' ? 12 : 4;
        const relatedQuery = supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('is_published', true)
          .neq('id', data.id)
          .limit(relatedLimit);

        const relatedScope = data.author_id
          ? relatedQuery.eq('author_id', data.author_id)
          : relatedQuery.eq('creator', data.creator);

        const { data: relatedProducts } = await relatedScope;
        const relatedRows = (relatedProducts ?? []) as Product[];
        setRelated(
          getProductExperience(data) === 'physical'
            ? relatedRows.filter(item => getProductExperience(item) === 'physical').slice(0, 4)
            : relatedRows.slice(0, 4),
        );
      }
    }
    fetchProduct();
  }, [identifier, legacyRedirect, merchPage, releasePage, router]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;
      const { data } = await supabase.from('library_items').select('id, product_id, acquisition_type').eq('user_id', userId).eq('product_id', product.id).maybeSingle();
      setOwned(Boolean(data));
      setOwnedLibraryItemId(data?.id ?? null);
      setOwnedAcquisitionType(data?.acquisition_type ?? null);
    }
    if (user) fetchOwnership(user.id);
    else Promise.resolve().then(() => {
      setOwned(false);
      setOwnedLibraryItemId(null);
      setOwnedAcquisitionType(null);
    });
  }, [product, user]);

  useEffect(() => {
    async function recordSharedVisit() {
      if (!product) return;
      const referrerId = searchParams.get('ref');
      if (!referrerId || referrerId === user?.id) return;

      await supabase.from('product_share_visits').insert({
        product_id: product.id,
        referrer_id: referrerId,
        visitor_id: user?.id ?? null,
      });

    }

    recordSharedVisit();
  }, [product, searchParams, user?.id]);

  async function addToLibrary() {
    if (!product) return;
    if (!user) { alert('Sign in first, then add this to your library.'); return; }
    if (!canSaveProductToLibrary(product)) return;
    const { error } = await supabase.from('library_items').upsert({ user_id: user.id, product_id: product.id, acquisition_type: 'free' }, { onConflict: 'user_id,product_id' });
    if (error) { alert(error.message); return; }
    setOwned(true);
    setOwnedAcquisitionType('free');
    const { data } = await supabase.from('library_items').select('id, acquisition_type').eq('user_id', user.id).eq('product_id', product.id).maybeSingle();
    setOwnedLibraryItemId(data?.id ?? null);
    setOwnedAcquisitionType(data?.acquisition_type ?? 'free');
  }

  function addProductToCart() {
    if (!product) return;
    const price = resolvePrice(product);
    addToCart({
      product_id: product.id,
      title: product.title,
      creator: product.creators?.display_name || product.creator || '44 Creator',
      cover_url: product.cover_url,
      price_cents: price.cents,
      currency: price.currency,
      slug: product.slug ?? null,
      href: productStoreHref(product),
    });
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!product) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Item not found</div>;

  const heroImage = product.hero_url || product.cover_url;
  const productExperience = getProductExperience(product);
  const isReleasePage = releasePage || productExperience === 'music';
  const isPhysicalMerch = productExperience === 'physical';
  const canClaimToLibrary = canSaveProductToLibrary(product);
  const hasDownloadUnlock = ownedAcquisitionType === 'purchase';
  const accessLabel = isPhysicalMerch
    ? 'Physical merch'
    : isReleasePage
      ? 'Free streaming · purchase unlocks downloads'
      : getProductStoreAccessLabel(product);
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const creatorReleasesLink = `${creatorLink}?tab=releases`;
  const creatorProductLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}fromProduct=${encodeURIComponent(product.id)}`;
  const libraryHref = ownedLibraryItemId ? productLibraryHref(product, ownedLibraryItemId) : storeIndexHref(product).replace('/store', '/library');

  const hasDescription = Boolean(product.long_description || product.short_description);
  const description = product.long_description || product.short_description || '';
  const playableTracks: MusicQueueTrack[] = (
    tracks
      .filter(track => track.audio_url)
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: product.creators?.display_name || product.creator || '44 Creator',
        releaseTitle: product.title,
        artworkUrl: product.cover_url || product.hero_url || null,
        audioUrl: track.audio_url as string,
        durationSeconds: track.duration_seconds ?? null,
        productId: product.id,
      }))
  );

  function playRelease() {
    if (playableTracks.length > 0) playQueue(playableTracks);
  }

  function toggleReleaseTrack(track: ProductTrack) {
    if (!track.audio_url) return;
    const index = playableTracks.findIndex(item => item.id === track.id);
    if (index >= 0) toggleTrack(playableTracks, index);
  }

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
          <div className="view-album-eyebrow">{isReleasePage ? 'Release' : isPhysicalMerch ? 'Physical Merch' : productMeta(product)}</div>
          <h1 className="view-album-title">{product.title}</h1>
          <div className="view-album-meta">
            <span className="view-album-meta-strong">{product.creators?.display_name || product.creator}</span>
            {product.year && (<><span className="view-album-meta-sep" /><span>{product.year}</span></>)}
            <span className="view-album-meta-sep" />
            <span className={`view-album-meta-strong${canClaimToLibrary ? ' view-album-meta-accent' : ''}`}>
              {formatProductPrice(product)}
            </span>
            {isPhysicalMerch && (<><span className="view-album-meta-sep" /><span>Ships from 44</span></>)}
          </div>
          <div className="view-album-actions">
            {isReleasePage && playableTracks.length > 0 && (
              <button className="os-button os-button-primary" type="button" onClick={playRelease}>
                Play Release
              </button>
            )}
            {owned ? (
              <Link className={isReleasePage && playableTracks.length > 0 ? 'os-button os-button-secondary' : 'os-button os-button-primary'} href={libraryHref}>In Library</Link>
            ) : canClaimToLibrary ? (
              <button className={isReleasePage && playableTracks.length > 0 ? 'os-button os-button-secondary' : 'os-button os-button-primary'} onClick={addToLibrary}>Add to Library</button>
            ) : isReleasePage && !user ? (
              <Link className={isReleasePage && playableTracks.length > 0 ? 'os-button os-button-secondary' : 'os-button os-button-primary'} href="/login">Sign In to Save</Link>
            ) : cart.has(product.id) ? (
              <Link className={isReleasePage && playableTracks.length > 0 ? 'os-button os-button-secondary' : 'os-button os-button-primary'} href="/cart">View Cart</Link>
            ) : (
              <button className={isReleasePage && playableTracks.length > 0 ? 'os-button os-button-secondary' : 'os-button os-button-primary'} onClick={addProductToCart}>Add to Cart</button>
            )}
            {isReleasePage && (
              hasDownloadUnlock ? (
                <Link className="os-button os-button-secondary" href={libraryHref}>Download</Link>
              ) : cart.has(product.id) ? (
                <Link className="os-button os-button-secondary" href="/cart">View Cart</Link>
              ) : (
                <button className="os-button os-button-secondary" type="button" onClick={addProductToCart}>Buy Download</button>
              )
            )}
            <Link className="os-button os-button-secondary" href={creatorProductLink}>View Creator</Link>
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

      {isReleasePage && (
        <div className="view-section">
          <div className="item-community-header" style={{ marginBottom: 16 }}>
            <h2 className="view-section-title" style={{ margin: 0 }}>Tracklist</h2>
            {playableTracks.length > 0 && (
              <button className="os-button os-button-secondary os-button-compact" type="button" onClick={playRelease}>
                Play All
              </button>
            )}
          </div>
          {tracks.length === 0 ? (
            <div className="dashboard-list-surface">
              <div className="dashboard-empty">No tracks are published for this release yet.</div>
            </div>
          ) : (
            <div className="view-tracklist">
              {tracks.map((track, index) => {
                const active = currentTrack?.id === track.id;
                return (
                  <div className="view-track-row" key={track.id}>
                    <div className="view-track-number">{trackOrder(track) || index + 1}</div>
                    <button
                      className="view-track-play"
                      type="button"
                      disabled={!track.audio_url}
                      aria-label={`${active && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                      onClick={() => toggleReleaseTrack(track)}
                    >
                      {active && isPlaying ? 'II' : '>'}
                    </button>
                    <div className="view-track-title">{track.title}</div>
                    <div className="view-track-duration">{formatTrackDuration(track.duration_seconds)}</div>
                  </div>
                );
              })}
            </div>
          )}
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
              <Link key={tag} href={browseHref({ q: tag })} className="os-pill os-type-pill">{tag}</Link>
            ))}
          </div>
        )}
      </div>

      <ProductReviewsSection productId={product.id} canPost={owned} />

      {/* Related */}
      {related.length > 0 && (
        <div className="view-section">
          <div className="item-community-header" style={{ marginBottom: 16 }}>
            <h2 className="view-section-title" style={{ margin: 0 }}>{isPhysicalMerch ? 'Related Merch' : `More from ${product.creators?.display_name || product.creator}`}</h2>
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

function trackOrder(track: ProductTrack) {
  return track.track_number ?? track.number ?? 0;
}

function canSaveProductToLibrary(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'physical') return false;
  if (experience === 'music') return true;
  return isFreeLibraryClaim(product);
}

function formatTrackDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}
