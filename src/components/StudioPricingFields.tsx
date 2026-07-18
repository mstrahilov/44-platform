'use client';

import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import type { MarketMode } from '@/lib/marketPreferences';

export type StudioAvailability = 'free' | 'paid';

export function formatStudioPriceInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = normalized.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  const safeWhole = whole.replace(/^0+(?=\d)/, '').slice(0, 7);
  return decimalParts.length > 0 ? `${safeWhole || '0'}.${decimals}` : safeWhole;
}

function currencySymbol(currency: string) {
  const symbol = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0).find(part => part.type === 'currency')?.value;
  return symbol ?? currency;
}

export function StudioPriceInput({
  currency,
  value,
  onChange,
  disabled = false,
  describedBy,
}: {
  currency: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <span className="dashboard-price-input">
      <span className="dashboard-price-prefix" aria-hidden="true">{currencySymbol(currency)}</span>
      <Ui44TextInput
        className="os-input-field dashboard-price-value"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={event => onChange(formatStudioPriceInput(event.target.value))}
      />
    </span>
  );
}

export function StudioDigitalPricingFields({
  availability,
  marketMode,
  globalPrice,
  localPrice,
  localCurrency,
  disabled,
  noticeId,
  onAvailabilityChange,
  onMarketModeChange,
  onGlobalPriceChange,
  onLocalPriceChange,
}: {
  availability: StudioAvailability;
  marketMode: MarketMode;
  globalPrice: string;
  localPrice: string;
  localCurrency: string;
  disabled: boolean;
  noticeId: string;
  onAvailabilityChange: (value: StudioAvailability) => void;
  onMarketModeChange: (value: MarketMode) => void;
  onGlobalPriceChange: (value: string) => void;
  onLocalPriceChange: (value: string) => void;
}) {
  const paid = availability === 'paid';

  return (
    <div className="dashboard-form-grid dashboard-form-grid-2 release-market-grid ui44-form-grid">
      <label className="dashboard-field">
        <div className="dashboard-field-label">Availability</div>
        <Ui44SelectInput
          value={availability}
          disabled={disabled}
          aria-describedby={noticeId}
          onChange={event => onAvailabilityChange(event.target.value as StudioAvailability)}
        >
          <option value="free">Free</option>
          <option value="paid">Paid download</option>
        </Ui44SelectInput>
      </label>

      {paid ? (
        <label className="dashboard-field">
          <div className="dashboard-field-label">Market</div>
          <Ui44SelectInput
            value={marketMode}
            disabled={disabled}
            aria-describedby={noticeId}
            onChange={event => onMarketModeChange(event.target.value as MarketMode)}
          >
            <option value="global">Global</option>
            <option value="global_plus_local">Global + Local</option>
          </Ui44SelectInput>
        </label>
      ) : null}

      {paid ? (
        <label className="dashboard-field">
          <div className="dashboard-field-label">Global Price (USD)</div>
          <StudioPriceInput
            currency="USD"
            value={globalPrice}
            disabled={disabled}
            describedBy={noticeId}
            onChange={onGlobalPriceChange}
          />
        </label>
      ) : null}

      {paid && marketMode === 'global_plus_local' ? (
        <label className="dashboard-field">
          <div className="dashboard-field-label">Local Price ({localCurrency})</div>
          <StudioPriceInput
            currency={localCurrency}
            value={localPrice}
            disabled={disabled}
            describedBy={noticeId}
            onChange={onLocalPriceChange}
          />
          <span className="dashboard-form-note">Set this amount independently from the global USD price.</span>
        </label>
      ) : null}
    </div>
  );
}
