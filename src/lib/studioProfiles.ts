import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/platform';
import { supabase } from '@/lib/supabase';

export type StudioProfile = Pick<
  Profile,
  'id' | 'display_name' | 'username' | 'role' | 'slug' | 'avatar_url' | 'bio' | 'creator_type'
>;

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

  const payload = {
    id: user.id,
    display_name: displayName,
    username,
    slug,
    role: existingProfile?.role ?? 'member',
    avatar_url: existingProfile?.avatar_url ?? null,
    bio: existingProfile?.bio ?? null,
    creator_type: existingProfile?.creator_type ?? null,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, display_name, username, role, slug, avatar_url, bio, creator_type')
    .single();

  return {
    profile: (data as StudioProfile | null) ?? null,
    error,
  };
}

export async function loadStudioProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, role, slug, avatar_url, bio, creator_type')
    .eq('id', userId)
    .maybeSingle();

  return {
    profile: (data as StudioProfile | null) ?? null,
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
