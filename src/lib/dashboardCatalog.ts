export {
  STUDIO_CATALOG_SECTIONS as DASHBOARD_CATALOG_SECTIONS,
  getStudioCatalogSection as getDashboardCatalogSection,
  getStudioCatalogSectionForProduct as getDashboardCatalogSectionForProduct,
  productBelongsToStudioSection as productBelongsToDashboardSection,
} from '@/lib/studioCatalog';

export type {
  StudioCatalogSection as DashboardCatalogSection,
  StudioCatalogSectionId as DashboardCatalogSectionId,
} from '@/lib/studioCatalog';
