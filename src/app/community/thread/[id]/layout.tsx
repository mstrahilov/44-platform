import type { ReactNode } from 'react';
import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { authorDisplayName, type SocialPost } from '@/lib/social';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const select = 'id, slug, title, body, creators:profiles!author_id(display_name, username, slug)';
  let post: SocialPost | null = null;

  const { data: slugMatch } = await supabase
    .from('community_discussions')
    .select(select)
    .eq('slug', id)
    .eq('status', 'published')
    .maybeSingle();
  post = (slugMatch as SocialPost | null) ?? null;

  if (!post) {
    const { data: idMatch } = await supabase
      .from('community_discussions')
      .select(select)
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();
    post = (idMatch as SocialPost | null) ?? null;
  }

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
