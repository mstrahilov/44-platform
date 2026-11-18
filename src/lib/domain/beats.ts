import type { Database, Json } from '@/lib/database.types';
import type { BeatCatalogSummary, BeatLicenseOfferSummary, Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';

// Beat catalog, Studio, and standard non-exclusive checkout launched in 1.2.
// Database runtime controls remain the authoritative emergency boundary.
export const beatReviewSurfacesEnabled = true;

export type BeatAttributeTerm = Database['public']['Tables']['beat_attribute_terms']['Row'];
export type BeatDetails = Database['public']['Tables']['beat_details']['Row'];
export type BeatLicenseGrant = Database['public']['Tables']['beat_license_grants']['Row'];

export type BeatDraftInput = {
  itemId?: string | null;
  assetSubtype?: 'beat' | 'vocal-acapella';
  title: string;
  description: string;
  coverUrl: string;
  releaseDate: string;
  previewUrl: string;
  previewDuration: number;
  bpm: number;
  keyRoot: string;
  keyMode: string;
  keyNotApplicable: boolean;
  timeSignature: string;
  sampleStatus: string;
  sampleDisclosure: string;
  externalUrl: string;
  tagIds: string[];
  attributeTermIds: string[];
  privateFiles: Record<'untagged_mp3' | 'untagged_wav' | 'stems_zip', string>;
  tierPrices: Partial<Record<'basic' | 'premium' | 'trackout' | 'exclusive' | 'free', number>>;
};

export async function isBeatDatabaseReviewEnabled() {
  if (!beatReviewSurfacesEnabled) return false;
  const result = await supabase.rpc('beat_review_surfaces_enabled');
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function listBeatAttributeTerms() {
  const result = await supabase
    .from('beat_attribute_terms')
    .select('*')
    .eq('is_active', true)
    .order('attribute_kind')
    .order('sort_order');
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function saveOwnedBeatDraft(input: BeatDraftInput) {
  if (!beatReviewSurfacesEnabled) throw new Error('Beat review surfaces are disabled in this build.');
  const result = await supabase.rpc('save_owned_beat_draft', {
    target_item_id: input.itemId ?? (null as unknown as string),
    target_title: input.title,
    target_description: input.description,
    target_cover_url: input.coverUrl,
    target_release_date: input.releaseDate,
    target_preview_url: input.previewUrl,
    target_preview_duration: input.previewDuration,
    target_bpm: input.bpm,
    target_key_root: input.keyRoot,
    target_key_mode: input.keyMode,
    target_key_not_applicable: input.keyNotApplicable,
    target_time_signature: input.timeSignature,
    target_sample_status: input.sampleStatus,
    target_sample_disclosure: input.sampleDisclosure,
    target_external_url: input.externalUrl,
    target_tag_ids: input.tagIds,
    target_attribute_term_ids: input.attributeTermIds,
    target_private_files: input.privateFiles as Json,
    target_tier_prices: input.tierPrices as Json,
    target_asset_subtype: input.assetSubtype ?? 'beat',
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function loadBeatCatalogSummaries(itemIds: string[]) {
  const summaries = new Map<string, BeatCatalogSummary>();
  if (!beatReviewSurfacesEnabled || itemIds.length === 0) return summaries;

  const [detailsResult, offerResult] = await Promise.all([
    supabase.from('beat_details')
      .select('item_id,preview_track_id,bpm,key_root,key_mode,key_not_applicable,time_signature,sample_status,sample_disclosure,sale_status,attributes:beat_attribute_assignments(term:beat_attribute_terms(attribute_kind,label))')
      .in('item_id', itemIds)
      .eq('attributes.term.is_active', true),
    supabase.from('catalog_offers')
      .select('id,item_id,price_cents,currency,status,license:beat_license_offers(template:beat_license_templates(tier_code,title,short_summary,included_file_kinds,is_exclusive,terms_text,terms_sha256))')
      .in('item_id', itemIds)
      .eq('offer_type', 'beat_license')
      .neq('status', 'archived'),
  ]);
  const firstError = detailsResult.error || offerResult.error;
  if (firstError) throw firstError;

  const offersByItem = new Map<string, BeatLicenseOfferSummary[]>();
  (offerResult.data ?? []).forEach(offer => {
    const template = offer.license?.template;
    if (!template) return;
    const summary: BeatLicenseOfferSummary = {
      id: offer.id,
      tierCode: template.tier_code,
      title: template.title,
      summary: template.short_summary,
      priceCents: offer.price_cents,
      currency: offer.currency,
      status: offer.status,
      includedFileKinds: template.included_file_kinds,
      isExclusive: template.is_exclusive,
      termsText: template.terms_text,
      termsSha256: template.terms_sha256 ?? '',
    };
    offersByItem.set(offer.item_id, [...(offersByItem.get(offer.item_id) ?? []), summary]);
  });

  (detailsResult.data ?? []).forEach(details => {
    const attributes = details.attributes.flatMap(({ term }) => term ? [term] : []);
    const licenseOffers = (offersByItem.get(details.item_id) ?? []).sort((left, right) => (
      ['basic', 'premium', 'trackout'].indexOf(left.tierCode)
      - ['basic', 'premium', 'trackout'].indexOf(right.tierCode)
    ));
    const paidOffers = licenseOffers.filter(offer => offer.priceCents > 0);
    summaries.set(details.item_id, {
      bpm: details.bpm,
      keyRoot: details.key_root,
      keyMode: details.key_mode,
      keyNotApplicable: details.key_not_applicable,
      timeSignature: details.time_signature,
      sampleStatus: details.sample_status,
      sampleDisclosure: details.sample_disclosure,
      saleStatus: details.sale_status,
      previewTrackId: details.preview_track_id,
      moods: attributes.filter(term => term.attribute_kind === 'mood').map(term => term.label),
      instruments: attributes.filter(term => term.attribute_kind === 'instrument').map(term => term.label),
      startingPriceCents: paidOffers.length ? Math.min(...paidOffers.map(offer => offer.priceCents)) : null,
      hasPaidOffers: paidOffers.length > 0,
      availableTierCodes: licenseOffers.map(offer => offer.tierCode),
      licenseOffers,
    });
  });
  return summaries;
}

export async function hydrateBeatProducts(products: Product[]) {
  if (!beatReviewSurfacesEnabled) return products;
  const summaries = await loadBeatCatalogSummaries(products.map(product => product.id));
  return products.map(product => ({ ...product, beat: summaries.get(product.id) }));
}

export async function loadOwnedBeatEditor(itemId: string, ownerId: string) {
  if (!beatReviewSurfacesEnabled) return null;
  const itemResult = await supabase.from('catalog_items').select('*').eq('id', itemId).eq('author_id', ownerId).neq('status', 'archived').maybeSingle();
  if (itemResult.error) throw itemResult.error;
  if (!itemResult.data) return null;
  const [summaryMap, trackResult, fileResult, tagResult, attributeResult, linkResult] = await Promise.all([
    loadBeatCatalogSummaries([itemId]),
    supabase.from('tracks').select('*').eq('item_id', itemId).order('number'),
    supabase.from('beat_files').select('*').eq('item_id', itemId),
    supabase.from('item_tag_assignments').select('item_tag_id').eq('item_id', itemId),
    supabase.from('beat_attribute_assignments').select('term_id').eq('item_id', itemId),
    supabase.from('item_external_links').select('*').eq('item_id', itemId).eq('platform', 'youtube').maybeSingle(),
  ]);
  const error = trackResult.error || fileResult.error || tagResult.error || attributeResult.error || linkResult.error;
  if (error) throw error;
  const files = fileResult.data ?? [];
  const assetIds = files.map(file => file.asset_id);
  const assetResult = assetIds.length
    ? await supabase.from('item_assets').select('*').in('id', assetIds)
    : { data: [], error: null };
  if (assetResult.error) throw assetResult.error;
  const assetById = new Map((assetResult.data ?? []).map(asset => [asset.id, asset]));
  return {
    item: itemResult.data as Product,
    beat: summaryMap.get(itemId) ?? null,
    preview: (trackResult.data ?? [])[0] ?? null,
    tagIds: (tagResult.data ?? []).map(row => row.item_tag_id),
    attributeTermIds: (attributeResult.data ?? []).map(row => row.term_id),
    externalUrl: linkResult.data?.url ?? '',
    privateFiles: Object.fromEntries(files.map(file => [file.file_kind, assetById.get(file.asset_id)?.storage_path ?? ''])),
  };
}

export async function listBuyerBeatLicenses(itemId?: string) {
  let query = supabase.from('beat_license_grants').select('*').order('granted_at', { ascending: false });
  if (itemId) query = query.eq('item_id', itemId);
  const result = await query;
  if (result.error) throw result.error;
  return result.data ?? [];
}
