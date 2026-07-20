'use client';

import { Ui44CheckboxInput, Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
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
  freeAccessDescription,
  paidDownloadRequired = false,
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
  freeAccessDescription?: string;
  paidDownloadRequired?: boolean;
  onAvailabilityChange: (value: StudioAvailability) => void;
  onMarketModeChange: (value: MarketMode) => void;
  onGlobalPriceChange: (value: string) => void;
  onLocalPriceChange: (value: string) => void;
}) {
  const paid = paidDownloadRequired || availability === 'paid';

  return (
    <div className="dashboard-form-grid dashboard-form-grid-2 release-market-grid ui44-form-grid">
      {freeAccessDescription ? (
        <div className="dashboard-field dashboard-field-full studio-paid-download-field">
          <div className="dashboard-field-label">Download</div>
          <label className="studio-paid-download-toggle">
            <Ui44CheckboxInput
              checked={paid}
              disabled={disabled}
              aria-describedby={disabled ? noticeId : undefined}
              onChange={event => onAvailabilityChange(event.target.checked ? 'paid' : 'free')}
            />
            <span>
              <strong>Offer a paid download</strong>
              <small>{freeAccessDescription}</small>
            </span>
          </label>
          {disabled ? <span id={noticeId} className="dashboard-form-note">Paid downloads are not available for this account.</span> : null}
        </div>
      ) : paidDownloadRequired ? (
        <div className="dashboard-field dashboard-field-full studio-paid-download-field">
          <div className="dashboard-field-label">Download price</div>
          <div className="studio-paid-download-required">
            <strong>Sample Packs are paid downloads</strong>
            <small>Set the price listeners pay to download the complete pack. Public previews remain available before purchase.</small>
          </div>
          {disabled ? <span id={noticeId} className="dashboard-form-note">Paid downloads are not available for this account.</span> : null}
        </div>
      ) : (
        <label className="dashboard-field">
          <div className="dashboard-field-label">Availability</div>
          <Ui44SelectInput
            value={availability}
            disabled={disabled}
            aria-describedby={disabled ? noticeId : undefined}
            onChange={event => onAvailabilityChange(event.target.value as StudioAvailability)}
          >
            <option value="free">Free</option>
            <option value="paid">Paid download</option>
          </Ui44SelectInput>
          {disabled ? <span id={noticeId} className="dashboard-form-note">Paid downloads are not available for this account.</span> : null}
        </label>
      )}

      {paid ? (
        <label className="dashboard-field">
          <div className="dashboard-field-label">Market</div>
          <Ui44SelectInput
            value={marketMode}
            disabled={disabled}
            onChange={event => onMarketModeChange(event.target.value as MarketMode)}
          >
            <option value="global">Global price only</option>
            <option value="global_plus_local">Global + local price</option>
          </Ui44SelectInput>
          <span className="dashboard-form-note">Add a separate local price only when it helps listeners in your home market.</span>
        </label>
      ) : null}

      {paid ? (
        <label className="dashboard-field">
          <div className="dashboard-field-label">Global Price (USD)</div>
          <StudioPriceInput
            currency="USD"
            value={globalPrice}
            disabled={disabled}
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
            onChange={onLocalPriceChange}
          />
          <span className="dashboard-form-note">Set this amount independently from the global USD price.</span>
        </label>
      ) : null}
    </div>
  );
}
