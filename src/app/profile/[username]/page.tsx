import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import type { Profile } from '@/lib/platform';
import { getPublicProfile } from '@/lib/domain/profiles';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username) as Profile | null;
  if (!profile) {
    return buildPageMetadata({
      title: 'Profile',
      description: 'View creator and member profiles on 44OS.',
      path: `/profile/${username}`,
      type: 'profile',
    });
  }

  const displayName = profile.display_name || profile.username || profile.slug || '44 Creator';
  return buildPageMetadata({
    title: displayName,
    description: conciseDescription(profile.bio, `${displayName} on 44OS.`),
    path: `/profile/${profile.username || profile.slug || username}`,
    image: profile.hero_url || profile.avatar_url || null,
    type: 'profile',
  });
}

export { default } from '@/components/PublicProfileApp';
