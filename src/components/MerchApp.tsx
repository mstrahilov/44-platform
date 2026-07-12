'use client';

import { useEffect, useState } from 'react';
import { listPublishedCatalogItems } from '@/lib/domain/catalog';
import type { Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';
import { PageShell, HubHero, ProductGrid, ProductCard, EmptyMessage } from '@/components/Ui';

type MerchRoute = 'store';

export function MerchApp({ route }: { route: MerchRoute }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(route === 'store');

  useEffect(() => {
    if (route !== 'store') return;

    async function load() {
      setLoading(true);
      const data = await listPublishedCatalogItems();
      setProducts(data.filter(product => getProductExperience(product) === 'physical'));
      setLoading(false);
    }

    load();
  }, [route]);

  return (
    <PageShell>
      <main className="app-page">
        <HubHero title="Merch" copy="Physical goods from creators: apparel, merch, and shipped items." />

        {loading ? (
          <EmptyMessage>Loading...</EmptyMessage>
        ) : products.length === 0 ? (
          <EmptyMessage>No merch is published yet.</EmptyMessage>
        ) : (
          <ProductGrid>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </main>
    </PageShell>
  );
}
