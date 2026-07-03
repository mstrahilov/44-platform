'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { PageShell, HubHero, HubSection, Shelf, ProductCard } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';

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
  const storeTabs = [
    { id: 'music', label: 'Music', href: '/store/music', match: (p: Product) => p.category === 'Music' },
    { id: 'apparel', label: 'Apparel', href: '/store/apparel', match: (p: Product) => p.category === 'Apparel' || p.category === 'Merch' },
    { id: 'books', label: 'Books', href: '/store/books', match: (p: Product) => p.category === 'Books' },
    { id: 'games', label: 'Games', href: '/store/games', match: (p: Product) => p.category === 'Games' },
    { id: 'assets', label: 'Assets', href: '/store/assets', match: (p: Product) => p.category === 'Assets' },
  ].filter(tab => products.some(tab.match));

  useTopbarTabs([
    { id: 'all',     label: 'All',      href: '/',              active: true },
    ...storeTabs.map(({ match: _match, ...tab }) => tab),
  ]);

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
