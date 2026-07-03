export type MarketMode = 'global' | 'global_plus_local';

export type CountryOption = {
  code: string;
  name: string;
  currency: string;
};

export type CurrencyOption = {
  code: string;
  label: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: 'NA', name: 'Namibia', currency: 'NAD' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'IN', name: 'India', currency: 'INR' },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'NAD', label: 'Namibian Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'BGN', label: 'Bulgarian Lev' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'INR', label: 'Indian Rupee' },
];

export const DEFAULT_VIEWER_COUNTRY = 'US';
export const DEFAULT_VIEWER_CURRENCY = 'USD';
export const DEFAULT_CREATOR_COUNTRY = 'US';
export const DEFAULT_CREATOR_CURRENCY = 'USD';
export const DEFAULT_MARKET_MODE: MarketMode = 'global';

export const VIEWER_COUNTRY_STORAGE_KEY = '44-setting-country';
export const VIEWER_CURRENCY_STORAGE_KEY = '44-setting-display-currency';
export const CREATOR_PREFERENCES_STORAGE_KEY = '44-dashboard-market-preferences';

export function countryName(code?: string | null) {
  return COUNTRIES.find(country => country.code === code)?.name ?? 'United States';
}

export function currencyForCountry(code?: string | null) {
  return COUNTRIES.find(country => country.code === code)?.currency ?? DEFAULT_CREATOR_CURRENCY;
}

export function normalizeMarketMode(value?: string | null): MarketMode {
  return value === 'global_plus_local' || value === 'both' || value === 'local' ? 'global_plus_local' : 'global';
}

export function getStoredViewerCountry() {
  if (typeof window === 'undefined') return DEFAULT_VIEWER_COUNTRY;
  return window.localStorage.getItem(VIEWER_COUNTRY_STORAGE_KEY) || DEFAULT_VIEWER_COUNTRY;
}

export function getStoredViewerCurrency() {
  if (typeof window === 'undefined') return DEFAULT_VIEWER_CURRENCY;
  return window.localStorage.getItem(VIEWER_CURRENCY_STORAGE_KEY) || DEFAULT_VIEWER_CURRENCY;
}

export function setStoredViewerPreferences(countryCode: string, currency: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VIEWER_COUNTRY_STORAGE_KEY, countryCode);
  window.localStorage.setItem(VIEWER_CURRENCY_STORAGE_KEY, currency);
}

export type StoredCreatorPreferences = {
  homeCountryCode: string;
  homeCurrency: string;
  serviceMarket: MarketMode;
  productMarket: MarketMode;
};

export function getStoredCreatorPreferences(): StoredCreatorPreferences | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(CREATOR_PREFERENCES_STORAGE_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<StoredCreatorPreferences>;
    const homeCountryCode = value.homeCountryCode || DEFAULT_CREATOR_COUNTRY;
    return {
      homeCountryCode,
      homeCurrency: currencyForCountry(homeCountryCode),
      serviceMarket: normalizeMarketMode(value.serviceMarket),
      productMarket: normalizeMarketMode(value.productMarket),
    };
  } catch {
    return null;
  }
}

export function setStoredCreatorPreferences(value: StoredCreatorPreferences) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CREATOR_PREFERENCES_STORAGE_KEY, JSON.stringify(value));
}
