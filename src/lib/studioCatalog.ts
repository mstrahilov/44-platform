import type { Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';

export type StudioCatalogSectionId = 'music' | 'books' | 'assets' | 'merch';

export type StudioCatalogSection = {
  id: StudioCatalogSectionId;
  label: string;
  href: string;
  itemLabel: string;
  itemLabelPlural: string;
  newLabel: string;
  editTitle: string;
  createTitle: string;
  createCopy: string;
  typeLabel: string;
  typeOptions: string[];
};

export const STUDIO_CATALOG_SECTIONS: StudioCatalogSection[] = [
  {
    id: 'music',
    label: 'Music',
    href: '/studio#music',
    itemLabel: 'release',
    itemLabelPlural: 'releases',
    newLabel: 'New Release',
    editTitle: 'Edit Release',
    createTitle: 'New Release',
    createCopy: 'Create an album, EP, single, or track release directly from inside the app.',
    typeLabel: 'Release Type',
    typeOptions: ['Album', 'EP', 'Single'],
  },
  {
    id: 'books',
    label: 'Books',
    href: '/studio#books',
    itemLabel: 'book',
    itemLabelPlural: 'books',
    newLabel: 'New Book',
    editTitle: 'Edit Book',
    createTitle: 'New Book',
    createCopy: 'Create a digital book or artbook for readers inside 44OS.',
    typeLabel: 'Book Type',
    typeOptions: ['Lyrics Book', 'Art Book', 'Novel'],
  },
  {
    id: 'assets',
    label: 'Assets',
    href: '/studio#assets',
    itemLabel: 'asset',
    itemLabelPlural: 'assets',
    newLabel: 'New Asset',
    editTitle: 'Edit Asset',
    createTitle: 'New Asset',
    createCopy: 'Create an asset pack, template, preset, or creative tool.',
    typeLabel: 'Asset Type',
    typeOptions: ['Asset Pack', 'Remix Stems'],
  },
  {
    id: 'merch',
    label: 'Merch',
    href: '/studio#merch',
    itemLabel: 'merch item',
    itemLabelPlural: 'merch',
    newLabel: 'New Merch Item',
    editTitle: 'Edit Merch Item',
    createTitle: 'New Merch Item',
    createCopy: 'Create a local-fulfillment merch item that creators deliver directly.',
    typeLabel: 'Merch Type',
    typeOptions: ['T-Shirt', 'Hoodie', 'Sweatshirt', 'Jacket', 'Hat', 'Beanie', 'Poster', 'Print', 'Bag', 'Accessory', 'Sticker Pack', 'Other'],
  },
];

export function getStudioCatalogSection(id: string | null | undefined) {
  return STUDIO_CATALOG_SECTIONS.find(section => section.id === id) ?? STUDIO_CATALOG_SECTIONS[0];
}

export function getStudioCatalogSectionForProduct(product: Pick<Product, 'item_type' | 'experience_type' | 'fulfillment_type'>) {
  const experience = getProductExperience(product);
  if (experience === 'physical') return getStudioCatalogSection('merch');
  if (experience === 'book') return getStudioCatalogSection('books');
  if (experience === 'asset') return getStudioCatalogSection('assets');
  return getStudioCatalogSection('music');
}

export function productBelongsToStudioSection(
  product: Pick<Product, 'item_type' | 'experience_type' | 'fulfillment_type'>,
  sectionId: StudioCatalogSectionId,
) {
  const productSection = getStudioCatalogSectionForProduct(product);
  return productSection.id === sectionId;
}
