export function normalizeOptionalReleaseDate(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) return null;
  return normalized;
}

export function releaseYear(date: string | null, fallbackYear: string) {
  if (date) return Number(date.slice(0, 4));
  return /^\d{4}$/.test(fallbackYear.trim()) ? Number(fallbackYear) : null;
}
