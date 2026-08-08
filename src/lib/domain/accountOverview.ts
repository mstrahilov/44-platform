import { hasCustomerOrders } from '@/lib/domain/customerCommerce';
import { fetchMyTeamAccess } from '@/lib/domain/team';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export type AccountOverview = {
  profile: StudioProfile | null;
  hasOrders: boolean;
  hasTeamAccess: boolean;
};

const ACCOUNT_OVERVIEW_TTL_MS = 30_000;
const accountOverviewCache = new Map<string, {
  expiresAt: number;
  promise: Promise<AccountOverview>;
}>();

export function loadAccountOverview(userId: string) {
  const cached = accountOverviewCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = Promise.all([
    loadStudioProfile(userId).then(result => result.profile).catch(() => null),
    hasCustomerOrders(userId).catch(() => false),
    fetchMyTeamAccess().then(result => result.authorized).catch(() => false),
  ]).then(([profile, hasOrders, hasTeamAccess]) => ({ profile, hasOrders, hasTeamAccess }));

  accountOverviewCache.set(userId, {
    expiresAt: Date.now() + ACCOUNT_OVERVIEW_TTL_MS,
    promise,
  });
  void promise.catch(() => {
    if (accountOverviewCache.get(userId)?.promise === promise) accountOverviewCache.delete(userId);
  });
  return promise;
}

export function preloadAccountOverview(userId: string) {
  void loadAccountOverview(userId).catch(() => undefined);
}
