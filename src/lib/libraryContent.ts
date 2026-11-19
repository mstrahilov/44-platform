import type { Product } from './products';

export type ProductRuntimeKind = 'music' | 'book' | 'sample_pack' | 'interactive' | 'product';

export interface LibraryPrimaryAction {
  label: string;
  href: string | null;
  activityType: 'open' | 'play' | 'read' | 'download' | 'launch';
  missingMessage: string;
}

export function isFreeLibraryClaim(product: Pick<Product, 'is_free' | 'price_cents'>) {
  return product.is_free || product.price_cents === 0;
}

export function getProductRuntimeKind(product: Product): ProductRuntimeKind {
  const productType = normalize(product.item_type);
  const experience = normalize(product.experience_type ?? '');

  if (experience === 'music') return 'music';
  if (experience === 'book') return 'book';
  if (experience === 'asset') return 'sample_pack';
  if (experience === 'game') return 'interactive';

  if (productType.includes('book')) return 'book';
  if (productType.includes('sample') || productType.includes('stem')) return 'sample_pack';
  if (productType.includes('game')) return 'interactive';
  if (productType.includes('album') || productType.includes('ep') || productType.includes('single')) return 'music';

  return 'product';
}

export function getProductLibraryPrimaryAction(product: Product): LibraryPrimaryAction {
  const runtimeKind = getProductRuntimeKind(product);

  if (runtimeKind === 'music') {
    return {
      label: 'Play',
      href: product.read_url || product.download_url || null,
      activityType: 'play',
      missingMessage: 'Playback is coming soon for this music item.',
    };
  }

  if (runtimeKind === 'book') {
    return {
      label: 'Download',
      href: product.download_url || product.read_url || null,
      activityType: 'download',
      missingMessage: 'Book file coming soon for this item.',
    };
  }

  if (runtimeKind === 'sample_pack') {
    return {
      label: 'Download',
      href: product.download_url || null,
      activityType: 'download',
      missingMessage: 'Sample pack download coming soon for this item.',
    };
  }

  if (runtimeKind === 'interactive') {
    return {
      label: 'Launch',
      href: product.launch_url || null,
      activityType: 'launch',
      missingMessage: 'Launch target coming soon for this interactive item.',
    };
  }

  return {
    label: product.download_url ? 'Download' : 'Open',
    href: product.download_url || product.read_url || product.launch_url || null,
    activityType: product.download_url ? 'download' : 'open',
    missingMessage: 'This item is not ready to open yet.',
  };
}

export function getProductLibraryDetailsTitle(product: Product): string {
  const runtimeKind = getProductRuntimeKind(product);
  if (runtimeKind === 'music') return 'Release';
  if (runtimeKind === 'book') return 'Book';
  if (runtimeKind === 'sample_pack') return 'Asset';
  if (runtimeKind === 'interactive') return 'Interactive';
  return 'Product';
}

export function getProductStoreAccessLabel(product: Pick<Product, 'is_free' | 'price_cents'>) {
  return isFreeLibraryClaim(product) ? 'Library item' : 'Cart coming soon';
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, ' ');
}
