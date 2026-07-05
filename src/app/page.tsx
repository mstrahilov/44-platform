'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { PageShell, HubHero, HubSection, Shelf, ProductCard } from '@/components/Ui';

export default function StorePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)')
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('year', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      setProducts(data ?? []);
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchOwnedItems(userId: string) {
      const { data } = await supabase
        .from('library_items')
        .select('product_id')
        .eq('user_id', userId);

      setOwnedProductIds((data ?? []).map(item => item.product_id).filter(Boolean));
    }

    if (user) {
      fetchOwnedItems(user.id);
    } else {
      Promise.resolve().then(() => setOwnedProductIds([]));
    }
  }, [user]);

  const musicProducts = products.filter(p => p.category === 'Music').slice(0, 4);
  const merchProducts = products
    .filter(p => p.category === 'Apparel' || p.category === 'Merch')
    .slice(0, 4);
  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Store"
          copy="Explore music, apparel, digital goods, and releases from creators on 44."
        />

        {musicProducts.length > 0 && (
          <HubSection title="Explore Music" href="/store/music">
            <Shelf>
              {musicProducts.map(product => (
                <div key={product.id} className="app-shelf-item">
                  <ProductCard product={product} owned={ownedProductIds.includes(product.id)} />
                </div>
              ))}
            </Shelf>
          </HubSection>
        )}

        {merchProducts.length > 0 && (
          <HubSection title="Explore Merch" href="/store/merch">
            <Shelf>
              {merchProducts.map(product => (
                <div key={product.id} className="app-shelf-item">
                  <ProductCard product={product} owned={ownedProductIds.includes(product.id)} />
                </div>
              ))}
            </Shelf>
          </HubSection>
        )}
      </div>
    </PageShell>
  );
}
