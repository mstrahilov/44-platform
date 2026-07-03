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

const REGION_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD',
  'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BM', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF',
  'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE',
  'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT',
  'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI',
  'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV',
  'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA',
  'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU',
  'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'ST', 'SV', 'SY',
  'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US',
  'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const;

const COUNTRY_CURRENCY_OVERRIDES: Record<string, string> = {
  AD: 'EUR',
  AE: 'AED',
  AF: 'AFN',
  AG: 'XCD',
  AI: 'XCD',
  AL: 'ALL',
  AM: 'AMD',
  AO: 'AOA',
  AR: 'ARS',
  AS: 'USD',
  AT: 'EUR',
  AU: 'AUD',
  AW: 'AWG',
  AX: 'EUR',
  AZ: 'AZN',
  BA: 'BAM',
  BB: 'BBD',
  BD: 'BDT',
  BE: 'EUR',
  BF: 'XOF',
  BG: 'BGN',
  BH: 'BHD',
  BI: 'BIF',
  BJ: 'XOF',
  BM: 'BMD',
  BN: 'BND',
  BO: 'BOB',
  BR: 'BRL',
  BS: 'BSD',
  BT: 'BTN',
  BW: 'BWP',
  BY: 'BYN',
  BZ: 'BZD',
  CA: 'CAD',
  CD: 'CDF',
  CF: 'XAF',
  CG: 'XAF',
  CH: 'CHF',
  CI: 'XOF',
  CK: 'NZD',
  CL: 'CLP',
  CM: 'XAF',
  CN: 'CNY',
  CO: 'COP',
  CR: 'CRC',
  CU: 'CUP',
  CV: 'CVE',
  CX: 'AUD',
  CY: 'EUR',
  CZ: 'CZK',
  DE: 'EUR',
  DJ: 'DJF',
  DK: 'DKK',
  DM: 'XCD',
  DO: 'DOP',
  DZ: 'DZD',
  EC: 'USD',
  EE: 'EUR',
  EG: 'EGP',
  ER: 'ERN',
  ES: 'EUR',
  ET: 'ETB',
  FI: 'EUR',
  FJ: 'FJD',
  FK: 'FKP',
  FM: 'USD',
  FO: 'DKK',
  FR: 'EUR',
  GA: 'XAF',
  GB: 'GBP',
  GD: 'XCD',
  GE: 'GEL',
  GF: 'EUR',
  GG: 'GBP',
  GH: 'GHS',
  GI: 'GIP',
  GL: 'DKK',
  GM: 'GMD',
  GN: 'GNF',
  GP: 'EUR',
  GQ: 'XAF',
  GR: 'EUR',
  GT: 'GTQ',
  GU: 'USD',
  GW: 'XOF',
  GY: 'GYD',
  HK: 'HKD',
  HN: 'HNL',
  HR: 'EUR',
  HT: 'HTG',
  HU: 'HUF',
  ID: 'IDR',
  IE: 'EUR',
  IL: 'ILS',
  IM: 'GBP',
  IN: 'INR',
  IQ: 'IQD',
  IR: 'IRR',
  IS: 'ISK',
  IT: 'EUR',
  JE: 'GBP',
  JM: 'JMD',
  JO: 'JOD',
  JP: 'JPY',
  KE: 'KES',
  KG: 'KGS',
  KH: 'KHR',
  KI: 'AUD',
  KM: 'KMF',
  KN: 'XCD',
  KP: 'KPW',
  KR: 'KRW',
  KW: 'KWD',
  KY: 'KYD',
  KZ: 'KZT',
  LA: 'LAK',
  LB: 'LBP',
  LC: 'XCD',
  LI: 'CHF',
  LK: 'LKR',
  LR: 'LRD',
  LS: 'LSL',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  LY: 'LYD',
  MA: 'MAD',
  MC: 'EUR',
  MD: 'MDL',
  ME: 'EUR',
  MG: 'MGA',
  MH: 'USD',
  MK: 'MKD',
  ML: 'XOF',
  MM: 'MMK',
  MN: 'MNT',
  MO: 'MOP',
  MP: 'USD',
  MQ: 'EUR',
  MR: 'MRU',
  MS: 'XCD',
  MT: 'EUR',
  MU: 'MUR',
  MV: 'MVR',
  MW: 'MWK',
  MX: 'MXN',
  MY: 'MYR',
  MZ: 'MZN',
  NA: 'NAD',
  NC: 'XPF',
  NE: 'XOF',
  NF: 'AUD',
  NG: 'NGN',
  NI: 'NIO',
  NL: 'EUR',
  NO: 'NOK',
  NP: 'NPR',
  NR: 'AUD',
  NU: 'NZD',
  NZ: 'NZD',
  OM: 'OMR',
  PA: 'PAB',
  PE: 'PEN',
  PF: 'XPF',
  PG: 'PGK',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PM: 'EUR',
  PN: 'NZD',
  PR: 'USD',
  PS: 'ILS',
  PT: 'EUR',
  PW: 'USD',
  PY: 'PYG',
  QA: 'QAR',
  RE: 'EUR',
  RO: 'RON',
  RS: 'RSD',
  RU: 'RUB',
  RW: 'RWF',
  SA: 'SAR',
  SB: 'SBD',
  SC: 'SCR',
  SD: 'SDG',
  SE: 'SEK',
  SG: 'SGD',
  SH: 'SHP',
  SI: 'EUR',
  SK: 'EUR',
  SL: 'SLE',
  SM: 'EUR',
  SN: 'XOF',
  SO: 'SOS',
  SR: 'SRD',
  ST: 'STN',
  SV: 'USD',
  SY: 'SYP',
  SZ: 'SZL',
  TC: 'USD',
  TD: 'XAF',
  TG: 'XOF',
  TH: 'THB',
  TJ: 'TJS',
  TL: 'USD',
  TM: 'TMT',
  TN: 'TND',
  TO: 'TOP',
  TR: 'TRY',
  TT: 'TTD',
  TV: 'AUD',
  TW: 'TWD',
  TZ: 'TZS',
  UA: 'UAH',
  UG: 'UGX',
  US: 'USD',
  UY: 'UYU',
  UZ: 'UZS',
  VA: 'EUR',
  VC: 'XCD',
  VE: 'VES',
  VG: 'USD',
  VI: 'USD',
  VN: 'VND',
  VU: 'VUV',
  WF: 'XPF',
  WS: 'WST',
  YE: 'YER',
  YT: 'EUR',
  ZA: 'ZAR',
  ZM: 'ZMW',
  ZW: 'USD',
};

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const currencyNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'currency' })
    : null;

function buildCountries(): CountryOption[] {
  return [...REGION_CODES]
    .map(code => ({
      code,
      name: regionNames?.of(code) || code,
      currency: COUNTRY_CURRENCY_OVERRIDES[code] || DEFAULT_CREATOR_CURRENCY,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildCurrencies(): CurrencyOption[] {
  const supported = typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('currency')
    : ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'BGN', 'BRL', 'INR', 'KES', 'NAD', 'NGN', 'ZAR'];

  return [...supported]
    .map(code => ({
      code,
      label: currencyNames?.of(code) || code,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const COUNTRIES: CountryOption[] = buildCountries();
export const CURRENCIES: CurrencyOption[] = buildCurrencies();

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
