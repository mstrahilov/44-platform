import type { ReactNode } from 'react';
import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import { authorDisplayName, type SocialPost } from '@/lib/social';
import { getDiscussion } from '@/lib/domain/community';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getDiscussion(id) as SocialPost | null;

  if (!post) {
    return buildPageMetadata({
      title: 'Community Thread',
      description: 'Read and join this conversation on 44OS.',
      path: `/community/thread/${id}`,
    });
  }

  const author = authorDisplayName(post.creators);
  return buildPageMetadata({
    title: post.title || `A post by ${author}`,
    description: conciseDescription(post.body, `${post.title} by ${author} on 44OS.`),
    path: `/community/thread/${post.slug || post.id}`,
  });
}

export default function CommunityThreadLayout({ children }: { children: ReactNode }) {
  return children;
}
