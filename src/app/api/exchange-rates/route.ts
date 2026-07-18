const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';

type ProviderResponse = {
  result?: string;
  base_code?: string;
  time_last_update_utc?: string;
  rates?: Record<string, unknown>;
};

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  NAD: 18,
  ZAR: 18,
  EUR: 0.92,
  GBP: 0.78,
  CAD: 1.36,
  AUD: 1.51,
  JPY: 157,
  KES: 129,
  NGN: 1500,
  BRL: 5.45,
  INR: 83,
};

export const runtime = 'nodejs';
export const revalidate = 86_400;

function validRates(value: ProviderResponse['rates']) {
  if (!value) return null;
  const entries = Object.entries(value).flatMap(([currency, rate]) => (
    /^[A-Z]{3}$/.test(currency) && typeof rate === 'number' && Number.isFinite(rate) && rate > 0
      ? [[currency, rate] as const]
      : []
  ));
  if (!entries.some(([currency, rate]) => currency === 'USD' && rate === 1)) return null;
  return Object.fromEntries(entries);
}

export async function GET() {
  try {
    const response = await fetch(PROVIDER_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Exchange-rate provider returned ${response.status}.`);
    const payload = await response.json() as ProviderResponse;
    const rates = payload.result === 'success' && payload.base_code === 'USD' ? validRates(payload.rates) : null;
    if (!rates) throw new Error('Exchange-rate provider returned invalid data.');

    return Response.json({
      base: 'USD',
      rates,
      updatedAt: payload.time_last_update_utc ?? null,
      source: 'ExchangeRate-API',
      sourceUrl: 'https://www.exchangerate-api.com',
      fallback: false,
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400' },
    });
  } catch {
    return Response.json({
      base: 'USD',
      rates: FALLBACK_RATES,
      updatedAt: null,
      source: 'ExchangeRate-API',
      sourceUrl: 'https://www.exchangerate-api.com',
      fallback: true,
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }
}
