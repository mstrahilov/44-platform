import type { Product } from './products';

export type ProductRuntimeKind = 'music' | 'book' | 'sample_pack' | 'interactive' | 'product';

export interface CollectionPrimaryAction {
  label: string;
  href: string | null;
  activityType: 'open' | 'play' | 'read' | 'download' | 'launch';
  missingMessage: string;
}

export interface ProductCollectionContent {
  runtimeKind: ProductRuntimeKind;
  detailsTitle: string;
  contentTitle: string;
  accessLabel: string;
  emptyCopy: string;
  notes: string[];
}

export function isFreeCollectionClaim(product: Pick<Product, 'is_free' | 'price_cents'>) {
  return product.is_free || product.price_cents === 0;
}

export function getProductRuntimeKind(product: Product): ProductRuntimeKind {
  const category = normalize(product.category);
  const productType = normalize(product.product_type);
  const runtime = normalize(product.runtime_type ?? '');

  if (runtime === 'book' || category === 'books' || productType.includes('book')) return 'book';
  if (runtime === 'sample pack' || category === 'sample packs' || productType.includes('sample')) return 'sample_pack';
  if (runtime === 'interactive' || runtime === 'game' || category === 'interactive' || category === 'games' || productType.includes('game')) return 'interactive';
  if (runtime === 'music' || category === 'music' || productType.includes('album') || productType.includes('ep') || productType.includes('single')) return 'music';

  return 'product';
}

export function getProductCollectionPrimaryAction(product: Product): CollectionPrimaryAction {
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

export function getProductCollectionContent(product: Product): ProductCollectionContent {
  const runtimeKind = getProductRuntimeKind(product);

  if (runtimeKind === 'music') {
    return {
      runtimeKind,
      detailsTitle: 'Release',
      contentTitle: 'Music',
      accessLabel: 'Playable release',
      emptyCopy: 'Tracklist, credits, and release notes will live here.',
      notes: ['Tracklist from Supabase', 'Achievements can unlock from listening', 'Downloads can be enabled per release or track'],
    };
  }

  if (runtimeKind === 'book') {
    return {
      runtimeKind,
      detailsTitle: 'Book',
      contentTitle: 'Reader / Download',
      accessLabel: 'Owned digital book',
      emptyCopy: 'Book description, reader notes, and download details will live here.',
      notes: ['PDF / digital edition', 'In-app reader can be layered in later', 'Downloads keep a copy on the user machine'],
    };
  }

  if (runtimeKind === 'sample_pack') {
    return {
      runtimeKind,
      detailsTitle: 'Sample Pack',
      contentTitle: 'Pack Contents',
      accessLabel: 'Downloadable files',
      emptyCopy: 'Sample pack contents, file types, and usage notes will live here.',
      notes: ['Samples, presets, stems, or project files', 'Creator usage/license notes', 'Download history can be added later'],
    };
  }

  if (runtimeKind === 'interactive') {
    return {
      runtimeKind,
      detailsTitle: 'Interactive',
      contentTitle: 'Launch Notes',
      accessLabel: 'Launchable experience',
      emptyCopy: 'Controls, requirements, and experience details will live here.',
      notes: ['Unity/WebGL launch target', 'Achievements and hidden unlocks can connect here', 'Save/progress bridge can be added later'],
    };
  }

  return {
    runtimeKind,
    detailsTitle: 'Product',
    contentTitle: 'About',
    accessLabel: 'Collection item',
    emptyCopy: 'No description yet.',
    notes: ['Owned product', 'Product-specific actions can be configured in Supabase'],
  };
}

export function getProductStoreAccessLabel(product: Pick<Product, 'is_free' | 'price_cents'>) {
  return isFreeCollectionClaim(product) ? 'Collection item' : 'Cart coming soon';
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, ' ');
}
