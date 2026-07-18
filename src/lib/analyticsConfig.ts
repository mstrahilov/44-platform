const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

export function getAnalyticsMeasurementId() {
  const value = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim().toUpperCase() ?? '';
  return GA_MEASUREMENT_ID_PATTERN.test(value) ? value : null;
}
