import type { Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';

export type DashboardCatalogSectionId = 'music' | 'books' | 'assets';

export type DashboardCatalogSection = {
  id: DashboardCatalogSectionId;
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

export const DASHBOARD_CATALOG_SECTIONS: DashboardCatalogSection[] = [
  {
    id: 'music',
    label: 'Music',
    href: '/dashboard/products',
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
    href: '/dashboard/products?section=books',
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
    href: '/dashboard/products?section=assets',
    itemLabel: 'asset',
    itemLabelPlural: 'assets',
    newLabel: 'New Asset',
    editTitle: 'Edit Asset',
    createTitle: 'New Asset',
    createCopy: 'Create a sample pack, template, preset, or creative tool.',
    typeLabel: 'Asset Type',
    typeOptions: ['Sample Pack', 'Remix Stems'],
  },
];

export function getDashboardCatalogSection(id: string | null | undefined) {
  return DASHBOARD_CATALOG_SECTIONS.find(section => section.id === id) ?? DASHBOARD_CATALOG_SECTIONS[0];
}

export function getDashboardCatalogSectionForProduct(product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>) {
  const experience = getProductExperience(product);
  if (experience === 'book') return getDashboardCatalogSection('books');
  if (experience === 'asset') return getDashboardCatalogSection('assets');
  return getDashboardCatalogSection('music');
}

export function productBelongsToDashboardSection(
  product: Pick<Product, 'category' | 'product_type' | 'runtime_type' | 'experience_type' | 'fulfillment_type'>,
  sectionId: DashboardCatalogSectionId,
) {
  const productSection = getDashboardCatalogSectionForProduct(product);
  return productSection.id === sectionId;
}
