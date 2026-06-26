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
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      setProduct(data);
      setLoading(false);
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

    if (product.linked_release_id) {
      const { data: existingProductItem } = await supabase
        .from('library_items')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingProductItem) {
        setOwned(true);
        return;
      }

      const { data: upgradedReleaseItem, error: upgradeError } = await supabase
        .from('library_items')
        .update({ product_id: product.id })
        .eq('user_id', user.id)
        .eq('release_id', product.linked_release_id)
        .select('product_id')
        .maybeSingle();

      if (upgradeError) {
        alert(upgradeError.message);
        return;
      }

      if (upgradedReleaseItem) {
        setOwned(true);
        return;
      }
    }

    const { error } = await supabase
      .from('library_items')
      .upsert({
        user_id: user.id,
        product_id: product.id,
        release_id: product.linked_release_id,
        acquisition_type: 'free',
        listen_count: 0,
        last_listened: null,
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 48px' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 28, display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28 }}>
        <div style={{ width: 240, height: 240, borderRadius: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden' }}>
          {product.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>{productMeta(product)}</div>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff', marginBottom: 8 }}>{product.title}</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>by {product.creator}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.7, maxWidth: 720, marginBottom: 22 }}>{product.description}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
            <Link href={browseHref({ category: product.category })} style={{ background: 'rgba(147,255,0,0.10)', border: '1px solid rgba(147,255,0,0.20)', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#93FF00', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{product.category}</Link>
            {(product.tags ?? []).map(tag => (
              <Link key={tag} href={browseHref({ tag })} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.48)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {tag}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: product.is_free ? '#93FF00' : '#fff' }}>{formatProductPrice(product)}</div>
            <button className="btn-primary" onClick={addToLibrary}>{owned ? 'Owned' : product.is_free ? 'Add to Library' : 'Checkout Soon'}</button>
          </div>
        </div>
      </div>
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
