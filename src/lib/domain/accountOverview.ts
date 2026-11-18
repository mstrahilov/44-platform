import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export type AccountOverview = {
  profile: StudioProfile | null;
};

const ACCOUNT_OVERVIEW_TTL_MS = 30_000;
const accountOverviewCache = new Map<string, {
  expiresAt: number;
  promise: Promise<AccountOverview>;
}>();

export function loadAccountOverview(userId: string) {
  const cached = accountOverviewCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = loadStudioProfile(userId).then(({ profile, error }) => {
    if (error) throw error;
    return { profile };
  });

  accountOverviewCache.set(userId, {
    expiresAt: Date.now() + ACCOUNT_OVERVIEW_TTL_MS,
    promise,
  });
  void promise.catch(() => {
    if (accountOverviewCache.get(userId)?.promise === promise) accountOverviewCache.delete(userId);
  });
  return promise;
}
