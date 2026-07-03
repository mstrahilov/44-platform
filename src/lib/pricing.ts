import {
  DEFAULT_VIEWER_COUNTRY,
  DEFAULT_VIEWER_CURRENCY,
  getStoredViewerCountry,
  getStoredViewerCurrency,
  normalizeMarketMode,
  type MarketMode,
} from '@/lib/marketPreferences';

export type PriceContext = {
  viewerCountry?: string | null;
  viewerCurrency?: string | null;
  rates?: Record<string, number>;
};

export type PriceSource = {
  is_free?: boolean | null;
  price_cents?: number | null;
  starting_price_cents?: number | null;
  market_mode?: MarketMode | string | null;
  local_price_cents?: number | null;
  local_currency?: string | null;
  creators?: {
    country_code?: string | null;
    home_country_code?: string | null;
    display_currency?: string | null;
    home_currency?: string | null;
  } | null;
};

const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  NAD: 18,
  ZAR: 18,
  EUR: 0.92,
  GBP: 0.78,
  BGN: 1.8,
  KES: 129,
  NGN: 1500,
  BRL: 5.45,
  INR: 83,
};

function centsForItem(item: PriceSource) {
  return item.price_cents ?? item.starting_price_cents ?? 0;
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function convertUsdCents(cents: number, currency: string, rates: Record<string, number>) {
  const rate = rates[currency] ?? DEFAULT_RATES[currency];
  if (!rate || currency === 'USD') return cents;
  return Math.round(cents * rate);
}

export function resolvePrice(item: PriceSource, context: PriceContext = {}) {
  const baseCents = centsForItem(item);
  if (item.is_free || baseCents <= 0) {
    return {
      label: 'Free',
      currency: 'USD',
      cents: 0,
      source: 'free' as const,
    };
  }

  const viewerCountry = context.viewerCountry || getStoredViewerCountry() || DEFAULT_VIEWER_COUNTRY;
  const viewerCurrency = context.viewerCurrency || getStoredViewerCurrency() || DEFAULT_VIEWER_CURRENCY;
  const creatorCountry = item.creators?.home_country_code || item.creators?.country_code;
  const marketMode = normalizeMarketMode(item.market_mode);
  const localCurrency = item.local_currency || item.creators?.home_currency || item.creators?.display_currency || 'USD';
  const localCents = item.local_price_cents ?? 0;

  if (
    localCents > 0 &&
    creatorCountry &&
    viewerCountry === creatorCountry &&
    marketMode === 'global_plus_local'
  ) {
    return {
      label: formatCurrency(localCents, localCurrency),
      currency: localCurrency,
      cents: localCents,
      source: 'local' as const,
    };
  }

  const rates = context.rates ?? DEFAULT_RATES;
  const convertedCents = convertUsdCents(baseCents, viewerCurrency, rates);
  return {
    label: formatCurrency(convertedCents, viewerCurrency),
    currency: viewerCurrency,
    cents: convertedCents,
    source: viewerCurrency === 'USD' ? ('global' as const) : ('converted' as const),
  };
}

export function formatPrice(item: PriceSource, context?: PriceContext) {
  return resolvePrice(item, context).label;
}

export function formatStartingPrice(item: PriceSource, context?: PriceContext) {
  const resolved = resolvePrice(item, context);
  return resolved.source === 'free' ? 'Free inquiry' : `From ${resolved.label}`;
}
