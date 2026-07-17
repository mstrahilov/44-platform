import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/platform';
import { DEFAULT_CREATOR_COUNTRY, DEFAULT_CREATOR_CURRENCY, DEFAULT_MARKET_MODE } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type StudioProfile = Pick<
  Profile,
  | 'id'
  | 'display_name'
  | 'username'
  | 'role'
  | 'slug'
  | 'avatar_url'
  | 'bio'
  | 'creator_type'
  | 'country_code'
  | 'display_currency'
  | 'home_country_code'
  | 'home_currency'
  | 'item_market_mode'
  | 'service_market_mode'
>;

const LEGACY_PROFILE_SELECT = 'id, display_name, username, role, slug, avatar_url, bio, creator_type';
const EXTENDED_PROFILE_SELECT = `${LEGACY_PROFILE_SELECT}, country_code, display_currency, home_country_code, home_currency, item_market_mode, service_market_mode`;

function normalizeStudioProfile(data: Partial<StudioProfile> | null): StudioProfile | null {
  if (!data?.id) return null;
  return {
    id: data.id,
    display_name: data.display_name ?? null,
    username: data.username ?? null,
    role: data.role ?? null,
    slug: data.slug ?? null,
    avatar_url: data.avatar_url ?? null,
    bio: data.bio ?? null,
    creator_type: data.creator_type ?? null,
    country_code: data.country_code ?? null,
    display_currency: data.display_currency ?? null,
    home_country_code: data.home_country_code ?? DEFAULT_CREATOR_COUNTRY,
    home_currency: data.home_currency ?? DEFAULT_CREATOR_CURRENCY,
    item_market_mode: data.item_market_mode ?? DEFAULT_MARKET_MODE,
    service_market_mode: data.service_market_mode ?? DEFAULT_MARKET_MODE,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function usernameify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

async function resolveUniqueField(
  field: 'username' | 'slug',
  baseValue: string,
  userId: string,
) {
  const fallback = field === 'username' ? `member_${userId.slice(0, 8)}` : `member-${userId.slice(0, 8)}`;
  const seed = baseValue || fallback;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? seed : `${seed}${field === 'username' ? '_' : '-'}${attempt + 1}`;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq(field, candidate)
      .neq('id', userId)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${seed}${field === 'username' ? '_' : '-'}${userId.slice(0, 6)}`;
}

export async function ensureProfileForUser(user: Pick<User, 'id' | 'email' | 'user_metadata'>) {
  const { profile: existingProfile } = await loadStudioProfile(user.id);
  const displayName =
    existingProfile?.display_name?.trim() ||
    user.user_metadata?.display_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    user.email?.split('@')[0] ||
    '44 Member';

  const usernameBase =
    existingProfile?.username?.trim() ||
    user.user_metadata?.username?.trim() ||
    user.email?.split('@')[0] ||
    user.id.slice(0, 8);

  const usernameSeed = usernameify(usernameBase) || `member_${user.id.slice(0, 8)}`;
  const slugSeed = slugify(existingProfile?.slug?.trim() || displayName || usernameSeed) || usernameSeed.replace(/_/g, '-');
  const username = await resolveUniqueField('username', usernameSeed, user.id);
  const slug = await resolveUniqueField('slug', slugSeed, user.id);
  const metadataCountry = typeof user.user_metadata?.country_code === 'string'
    && /^[A-Z]{2}$/.test(user.user_metadata.country_code.toUpperCase())
    ? user.user_metadata.country_code.toUpperCase()
    : null;

  const payload: Database['public']['Tables']['profiles']['Insert'] = {
    id: user.id,
    display_name: displayName,
    username,
    slug,
    role: existingProfile?.role ?? 'member',
    avatar_url: existingProfile?.avatar_url ?? null,
    bio: existingProfile?.bio ?? null,
    creator_type: existingProfile?.creator_type ?? null,
    country_code: existingProfile?.country_code ?? metadataCountry,
    display_currency: existingProfile?.display_currency ?? null,
    home_country_code: existingProfile?.home_country_code ?? metadataCountry,
    home_currency: existingProfile?.home_currency ?? null,
    item_market_mode: existingProfile?.item_market_mode ?? DEFAULT_MARKET_MODE,
    service_market_mode: existingProfile?.service_market_mode ?? DEFAULT_MARKET_MODE,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(EXTENDED_PROFILE_SELECT)
    .single();

  if (isMissingColumnError(error)) {
    const legacyPayload = {
      id: payload.id,
      display_name: payload.display_name,
      username: payload.username,
      slug: payload.slug,
      role: payload.role,
      avatar_url: payload.avatar_url,
      bio: payload.bio,
      creator_type: payload.creator_type,
    };

    const { data: legacyData, error: legacyError } = await supabase
      .from('profiles')
      .upsert(legacyPayload, { onConflict: 'id' })
      .select(LEGACY_PROFILE_SELECT)
      .single();

    return {
      profile: normalizeStudioProfile(legacyData as StudioProfile | null),
      error: legacyError,
    };
  }

  return {
    profile: normalizeStudioProfile(data as StudioProfile | null),
    error,
  };
}

export async function loadStudioProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(EXTENDED_PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('profiles')
      .select(LEGACY_PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();

    return {
      profile: normalizeStudioProfile(legacyData as StudioProfile | null),
      error: legacyError,
    };
  }

  return {
    profile: normalizeStudioProfile(data as StudioProfile | null),
    error,
  };
}

export function getStudioDisplayName(profile: StudioProfile | null, email?: string | null) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email?.split('@')[0] ||
    '44 Creator'
  );
}

export function isCreatorProfile(profile: StudioProfile | null) {
  return profile?.role === 'creator' || profile?.role === 'admin';
}

function escapeFilterValue(value: string) {
  const normalized = String(value);
  if (/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '\\"')}"`;
}

export function getOwnershipKeys(profile: StudioProfile | null, userId: string, email?: string | null) {
  const ids = Array.from(
    new Set([profile?.id, userId].filter((value): value is string => Boolean(value))),
  );

  const names = Array.from(
    new Set(
      [
        profile?.display_name?.trim(),
        profile?.username?.trim(),
        profile?.slug?.trim(),
        email?.split('@')[0]?.trim(),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  return { ids, names };
}

type OwnershipFilterOptions = {
  idFields: string[];
  textFields?: string[];
  profile: StudioProfile | null;
  userId: string;
  email?: string | null;
};

export function buildOwnershipFilter({
  idFields,
  textFields = [],
  profile,
  userId,
  email,
}: OwnershipFilterOptions) {
  const { ids, names } = getOwnershipKeys(profile, userId, email);

  const idFilters = idFields.flatMap(field => ids.map(value => `${field}.eq.${escapeFilterValue(value)}`));
  const textFilters = textFields.flatMap(field => names.map(value => `${field}.ilike.${escapeFilterValue(value)}`));

  return [...idFilters, ...textFilters].join(',');
}
