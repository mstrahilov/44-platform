'use client';

import { useEffect, useState } from 'react';

type ExchangeRatePayload = {
  base?: string;
  rates?: Record<string, unknown>;
};

let cachedRates: Record<string, number> | undefined;
let pendingRequest: Promise<Record<string, number> | undefined> | null = null;
const USD_ONLY_RATES = Object.freeze({ USD: 1 });

function loadExchangeRates() {
  if (cachedRates) return Promise.resolve(cachedRates);
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetch('/api/exchange-rates')
    .then(async response => {
      if (!response.ok) return undefined;
      const payload = await response.json() as ExchangeRatePayload;
      if (payload.base !== 'USD' || !payload.rates) return undefined;
      const entries = Object.entries(payload.rates).flatMap(([currency, rate]) => (
        /^[A-Z]{3}$/.test(currency) && typeof rate === 'number' && Number.isFinite(rate) && rate > 0
          ? [[currency, rate] as const]
          : []
      ));
      cachedRates = Object.fromEntries(entries);
      return cachedRates;
    })
    .catch(() => undefined)
    .finally(() => { pendingRequest = null; });

  return pendingRequest;
}

export function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number>>(cachedRates ?? USD_ONLY_RATES);

  useEffect(() => {
    let alive = true;
    void loadExchangeRates().then(nextRates => {
      if (alive && nextRates) setRates(nextRates);
    });
    return () => { alive = false; };
  }, []);

  return rates;
}
