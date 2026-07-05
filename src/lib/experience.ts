import type { Product } from '@/lib/products';

export type ProductExperience = 'music' | 'book' | 'asset' | 'radio' | 'physical' | 'interactive' | 'other';
export type ExperienceAppSlug = 'music' | 'books' | 'assets';

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[-_]+/g, ' ');
}

export function getProductExperience(product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>): ProductExperience {
  const experience = normalize(product.experience_type ?? '');
  const fulfillment = normalize(product.fulfillment_type ?? '');
  const category = normalize(product.category);
  const productType = normalize(product.product_type);
  const runtime = normalize(product.runtime_type ?? '');

  if (fulfillment === 'physical' || experience === 'merch') return 'physical';
  if (experience === 'music') return 'music';
  if (experience === 'book') return 'book';
  if (experience === 'asset') return 'asset';
  if (experience === 'radio') return 'radio';
  if (experience === 'game') return 'interactive';

  if (
    runtime === 'radio' ||
    category === 'radio' ||
    productType.includes('radio')
  ) return 'radio';

  if (
    runtime === 'book' ||
    category === 'books' ||
    category === 'book' ||
    productType.includes('book') ||
    productType.includes('artbook')
  ) return 'book';

  if (
    runtime === 'asset' ||
    runtime === 'sample pack' ||
    category === 'assets' ||
    category === 'sample packs' ||
    productType.includes('asset') ||
    productType.includes('sample') ||
    productType.includes('stem') ||
    productType.includes('preset') ||
    productType.includes('template')
  ) return 'asset';

  if (
    runtime === 'interactive' ||
    runtime === 'game' ||
    category === 'interactive' ||
    category === 'games' ||
    productType.includes('game')
  ) return 'interactive';

  if (
    runtime === 'physical' ||
    runtime === 'merch' ||
    category === 'apparel' ||
    category === 'merch' ||
    category === 'shop' ||
    productType.includes('shirt') ||
    productType.includes('hoodie') ||
    productType.includes('poster') ||
    productType.includes('merch')
  ) return 'physical';

  if (
    runtime === 'music' ||
    category === 'music' ||
    productType.includes('album') ||
    productType.includes('ep') ||
    productType.includes('single') ||
    productType.includes('track')
  ) return 'music';

  return 'other';
}

export function productMatchesExperience(
  product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>,
  experience: ProductExperience,
) {
  return getProductExperience(product) === experience;
}

export function getExperienceAppSlug(product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>): ExperienceAppSlug | null {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'music';
  if (experience === 'book') return 'books';
  if (experience === 'asset') return 'assets';
  return null;
}

export function productStoreHref(product: Pick<Product, 'id' | 'slug' | 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>) {
  const app = getExperienceAppSlug(product);
  const identifier = product.slug || product.id;
  if (getProductExperience(product) === 'physical') return `/store/merch/${identifier}`;
  return app ? `/store/${app}/${identifier}` : `/store`;
}

export function productLibraryHref(
  product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>,
  libraryItemId: string,
) {
  const app = getExperienceAppSlug(product);
  if (getProductExperience(product) === 'physical') return '/store/merch';
  return app ? `/library/${app}/${libraryItemId}` : `/library`;
}

export function storeIndexHref(product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>) {
  const app = getExperienceAppSlug(product);
  if (app) return `/store/${app}`;
  if (getProductExperience(product) === 'physical') return '/store/merch';
  return '/store';
}
