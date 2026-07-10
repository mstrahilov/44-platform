export type ProductExperience = 'music' | 'book' | 'asset' | 'radio' | 'physical' | 'interactive' | 'other';
export type ExperienceAppSlug = 'music' | 'books' | 'assets';

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[-_]+/g, ' ');
}

type ProductExperienceShape = {
  product_type?: string | null;
  experience_type?: string | null;
  fulfillment_type?: string | null;
};
type ProductRouteShape = ProductExperienceShape & {
  id: string;
  slug?: string | null;
};

export function getProductExperience(product: ProductExperienceShape): ProductExperience {
  const experience = normalize(product.experience_type ?? '');
  const fulfillment = normalize(product.fulfillment_type ?? '');
  const productType = normalize(product.product_type);

  if (fulfillment === 'physical' || experience === 'merch') return 'physical';
  if (experience === 'music') return 'music';
  if (experience === 'book') return 'book';
  if (experience === 'asset') return 'asset';
  if (experience === 'radio') return 'radio';
  if (experience === 'game') return 'interactive';

  if (productType.includes('radio')) return 'radio';

  if (
    productType.includes('book') ||
    productType.includes('artbook')
  ) return 'book';

  if (
    productType.includes('asset') ||
    productType.includes('sample') ||
    productType.includes('stem') ||
    productType.includes('preset') ||
    productType.includes('template')
  ) return 'asset';

  if (
    productType.includes('game')
  ) return 'interactive';

  if (
    productType.includes('shirt') ||
    productType.includes('hoodie') ||
    productType.includes('poster') ||
    productType.includes('merch')
  ) return 'physical';

  if (
    productType.includes('album') ||
    productType.includes('ep') ||
    productType.includes('single') ||
    productType.includes('track')
  ) return 'music';

  return 'other';
}

export function productMatchesExperience(
  product: ProductExperienceShape,
  experience: ProductExperience,
) {
  return getProductExperience(product) === experience;
}

export function getExperienceAppSlug(product: ProductExperienceShape): ExperienceAppSlug | null {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'music';
  if (experience === 'book') return 'books';
  if (experience === 'asset') return 'assets';
  return null;
}

export function browseIndexHref(productOrCategory?: ProductExperienceShape | ExperienceAppSlug | 'merch' | 'all' | null) {
  if (!productOrCategory || productOrCategory === 'all') return '/browse';
  if (typeof productOrCategory === 'string') return `/browse/${productOrCategory}`;
  const app = getExperienceAppSlug(productOrCategory);
  if (app) return `/browse/${app}`;
  if (getProductExperience(productOrCategory) === 'physical') return '/browse/merch';
  return '/browse';
}

export function productBrowseHref(product: ProductRouteShape) {
  const identifier = product.slug || product.id;
  return `/browse/item/${identifier}`;
}

export function libraryItemHref(libraryItem: { id: string }) {
  return `/library/item/${libraryItem.id}`;
}

/** @deprecated Use productBrowseHref. Kept so legacy call sites keep a stable redirect target while they are migrated. */
export function productStoreHref(product: ProductRouteShape) {
  return productBrowseHref(product);
}

export function productLibraryHref(
  product: ProductExperienceShape,
  libraryItemId: string,
) {
  if (getProductExperience(product) === 'physical') return '/browse/merch';
  return libraryItemHref({ id: libraryItemId });
}

/** @deprecated Use browseIndexHref. */
export function storeIndexHref(product: ProductExperienceShape) {
  return browseIndexHref(product);
}
