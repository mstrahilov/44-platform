'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
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
      }
    }

    fetchProduct();
  }, [id]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      const { data } = await supabase
        .from('library_items')
        .select('product_id')
        .eq('user_id', userId)
        .eq('product_id', id)
        .maybeSingle();

      setOwned(Boolean(data));
    }

    if (user) {
      fetchOwnership(user.id);
    } else {
      Promise.resolve().then(() => setOwned(false));
    }
  }, [id, user]);

  async function addToLibrary() {
    if (!product) return;
    if (!user) {
      alert('Sign in first, then add this to your library.');
      return;
    }
    if (!product.is_free) {
      alert('Paid checkout is coming later. Free products can be added now.');
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

  if (loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (!product) return <CenteredMessage>Product not found</CenteredMessage>;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 56px' }}>
      <div className="product-shell">
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section style={{ minHeight: 460, borderRadius: 30, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', position: 'relative', background: getHeroBackground(product) }}>
            {product.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
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
              <InfoLine label="Access" value={product.is_free ? 'Free library claim' : 'Checkout coming soon'} />
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

          {related.length > 0 && (
            <section>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.52)', marginBottom: 12 }}>More Like This</div>
              <div className="related-grid">
                {related.map(item => (
                  <Link key={item.id} href={`/product/${item.id}`} style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.09)', background: getHeroBackground(item), minHeight: 160, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{item.category}</div>
                    <div style={{ fontSize: 18, fontWeight: 780, lineHeight: 1, color: '#fff' }}>{item.title}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.055)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: 22 }}>
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 18, background: getHeroBackground(product), border: '1px solid rgba(255,255,255,0.09)', marginBottom: 18, overflow: 'hidden' }}>
              {product.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: product.is_free ? '#93FF00' : '#fff', letterSpacing: '-0.03em' }}>{formatProductPrice(product)}</div>
              {owned && <div className="chip">Owned</div>}
            </div>
            <button className="btn-primary" onClick={addToLibrary} style={{ width: '100%', marginBottom: 10 }}>{owned ? 'Owned' : product.is_free ? 'Add to Library' : 'Checkout Soon'}</button>
            <Link className="btn-ghost" href={browseHref({ q: product.creator })} style={{ width: '100%' }}>View Creator</Link>
          </div>

          <InfoPanel title="Product Details">
            <InfoLine label="Creator" value={product.creator} />
            <InfoLine label="Type" value={product.product_type} />
            <InfoLine label="Status" value={product.is_published ? 'Published' : 'Hidden'} />
          </InfoPanel>
        </aside>
      </div>
    </div>
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
