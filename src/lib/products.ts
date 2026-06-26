export interface Product {
  id: string;
  title: string;
  creator: string;
  product_type: string;
  category: string;
  description: string | null;
  price_cents: number;
  is_free: boolean;
  is_published: boolean;
  featured: boolean;
  tags: string[] | null;
  cover_url: string | null;
  linked_release_id: string | null;
  created_at: string;
}

export function formatProductPrice(product: Pick<Product, 'is_free' | 'price_cents'>) {
  if (product.is_free || product.price_cents === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price_cents / 100);
}

export function productMeta(product: Pick<Product, 'product_type' | 'category'>) {
  return `${product.product_type} · ${product.category}`;
}

export function browseHref(params: { category?: string; tag?: string; filter?: string; q?: string }) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `/browse?${query}` : '/browse';
}

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'fallback-muses',
    title: 'MUSES',
    creator: 'Tellali',
    product_type: 'EP',
    category: 'Music',
    description: 'Eight tracks. No filler. A debut EP built on voice, touch, and memory.',
    price_cents: 799,
    is_free: false,
    is_published: true,
    featured: true,
    tags: ['44 Exclusive', 'Electronic', 'Alternative'],
    cover_url: null,
    linked_release_id: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'fallback-shadowsea',
    title: 'THE GREAT SHADOWSEA',
    creator: 'Ølsten',
    product_type: 'Album',
    category: 'Music',
    description: 'A large-format album from the Ølsten catalog.',
    price_cents: 0,
    is_free: true,
    is_published: true,
    featured: false,
    tags: ['Album', 'Free'],
    cover_url: null,
    linked_release_id: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'fallback-soma',
    title: 'SOMA',
    creator: '44 CORPORATION',
    product_type: 'Game',
    category: 'Games',
    description: 'First-person puzzle game. Copy a state from any object. Paste it onto another.',
    price_cents: 1499,
    is_free: false,
    is_published: true,
    featured: true,
    tags: ['Game', 'Puzzle'],
    cover_url: null,
    linked_release_id: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'fallback-myth',
    title: 'ELSEWHERE MYTH VOL. 1',
    creator: '44 CORPORATION',
    product_type: 'Book',
    category: 'Books',
    description: 'Locations, factions, and mythology from a world built inside a dream.',
    price_cents: 1299,
    is_free: false,
    is_published: true,
    featured: true,
    tags: ['Book', 'Lore'],
    cover_url: null,
    linked_release_id: null,
    created_at: new Date(0).toISOString(),
  },
];
