import type { Item } from '@/lib/products';
import type { SocialAuthor, SocialPost, SocialReply } from '@/lib/social';

export type CommunityIntent = 'general' | 'question' | 'help' | 'collaboration' | 'showcase' | 'update';

export type CommunityReference = {
  id: string;
  kind: 'person' | 'item';
  label: string;
  href: string;
  imageUrl?: string | null;
  secondary?: string | null;
};

export type CommunityV11Post = SocialPost & {
  content_type?: 'discussion' | 'question' | 'collaboration' | 'creator_update';
  item_id?: string | null;
  community_intent?: CommunityIntent;
  community_references?: CommunityReference[];
  local_only?: boolean;
};

export type CommunityV11Reply = SocialReply & {
  local_only?: boolean;
};

const LOCAL_POSTS_KEY = '44os.community-v11.local-posts';
const LOCAL_REPLIES_KEY = '44os.community-v11.local-replies';

export const COMMUNITY_INTENT_LABELS: Record<CommunityIntent, string> = {
  general: 'General',
  question: 'Question',
  help: 'Assistance',
  collaboration: 'Collaboration',
  showcase: 'Showcase',
  update: 'Update',
};

export const COMMUNITY_INTENT_PLACEHOLDERS: Record<CommunityIntent, string> = {
  general: 'What’s on your mind?',
  question: 'What would you like to ask?',
  help: 'What can you help the community with?',
  collaboration: 'What are you looking for, or what can you offer?',
  showcase: 'What project would you like to showcase?',
  update: 'What’s new?',
};

export const communityV11LocalPreviewEnabled = process.env.NODE_ENV === 'development';

function readLocalArray<T>(key: string) {
  if (!communityV11LocalPreviewEnabled || typeof window === 'undefined') return [] as T[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [] as T[];
  }
}

function writeLocalArray<T>(key: string, value: T[]) {
  if (!communityV11LocalPreviewEnabled || typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function inferCommunityIntent(post: CommunityV11Post): CommunityIntent {
  if (post.community_intent) return post.community_intent;

  // A Community category is authored metadata. Never derive it from prose or
  // mentions: tagging a person or Item must not silently turn a General post
  // into Collaboration, Showcase, Update, or any other category.
  if (post.content_type === 'question') return 'question';
  if (post.content_type === 'collaboration') return 'collaboration';
  if (post.content_type === 'creator_update') return 'update';

  // Assistance and Showcase predate a dedicated database column. Their slug
  // prefixes are written only when the member explicitly selects that option
  // in the composer, so preserving them is not content inference.
  const slug = post.slug?.toLocaleLowerCase() ?? '';
  if (slug.startsWith('assistance-')) return 'help';
  if (slug.startsWith('showcase-')) return 'showcase';
  return 'general';
}

export function inferItemReferences(
  body: string,
  items: Item[],
) {
  const normalizedBody = body.toLocaleLowerCase();
  return items
    .filter(item => {
      const title = item.title.trim();
      if (!title) return false;
      const token = `@${title.toLocaleLowerCase()}`;
      let searchStart = 0;
      while (searchStart < normalizedBody.length) {
        const index = normalizedBody.indexOf(token, searchStart);
        if (index < 0) return false;
        const before = index > 0 ? normalizedBody[index - 1] : '';
        const after = normalizedBody[index + token.length] ?? '';
        if (!/[a-z0-9_]/i.test(before) && !/[a-z0-9_]/i.test(after)) return true;
        searchStart = index + 1;
      }
      return false;
    })
    .map<CommunityReference>(item => ({
      id: item.id,
      kind: 'item',
      label: item.title,
      href: `/store/item/${item.slug || item.id}`,
      imageUrl: item.cover_url || item.hero_url,
      secondary: [item.item_type, item.creators?.display_name || item.creator].filter(Boolean).join(' · '),
    }));
}

export function listLocalCommunityPosts() {
  return readLocalArray<CommunityV11Post>(LOCAL_POSTS_KEY);
}

export function getLocalCommunityPost(identifier: string) {
  return listLocalCommunityPosts().find(post => post.id === identifier || post.slug === identifier) ?? null;
}

export function createLocalCommunityPost(input: {
  author: SocialAuthor;
  body: string;
  intent: CommunityIntent;
  references: CommunityReference[];
}) {
  const id = `local-community-${crypto.randomUUID()}`;
  const post: CommunityV11Post = {
    id,
    slug: id,
    author_id: input.author.id,
    title: input.body.trim().replace(/\s+/g, ' ').slice(0, 72) || 'New post',
    body: input.body.trim(),
    status: 'published',
    created_at: new Date().toISOString(),
    creators: {
      ...input.author,
      slug: input.author.slug || input.author.username || input.author.id,
      name: input.author.display_name || input.author.username || '44 Member',
    },
    content_type: 'discussion',
    community_intent: input.intent,
    community_references: input.references,
    local_only: true,
  };
  writeLocalArray(LOCAL_POSTS_KEY, [post, ...listLocalCommunityPosts()]);
  return post;
}

export function removeLocalCommunityPost(postId: string) {
  writeLocalArray(LOCAL_POSTS_KEY, listLocalCommunityPosts().filter(post => post.id !== postId));
  writeLocalArray(LOCAL_REPLIES_KEY, listLocalCommunityReplies().filter(reply => reply.post_id !== postId));
}

export function updateLocalCommunityPost(postId: string, body: string) {
  const updatedAt = new Date().toISOString();
  let updated: CommunityV11Post | null = null;
  writeLocalArray(
    LOCAL_POSTS_KEY,
    listLocalCommunityPosts().map(post => {
      if (post.id !== postId) return post;
      updated = {
        ...post,
        title: body.trim().replace(/\s+/g, ' ').slice(0, 72) || post.title,
        body: body.trim(),
        updated_at: updatedAt,
      };
      return updated;
    }),
  );
  return updated;
}

export function listLocalCommunityReplies(postId?: string) {
  const replies = readLocalArray<CommunityV11Reply>(LOCAL_REPLIES_KEY);
  return postId ? replies.filter(reply => reply.post_id === postId) : replies;
}

export function createLocalCommunityReply(input: {
  postId: string;
  author: SocialAuthor;
  parentReplyId: string | null;
  body: string;
}) {
  const reply: CommunityV11Reply = {
    id: `local-reply-${crypto.randomUUID()}`,
    post_id: input.postId,
    author_id: input.author.id,
    parent_reply_id: input.parentReplyId,
    body: input.body.trim(),
    status: 'published',
    created_at: new Date().toISOString(),
    authors: input.author,
    local_only: true,
  };
  writeLocalArray(LOCAL_REPLIES_KEY, [...listLocalCommunityReplies(), reply]);
  return reply;
}

export function removeLocalCommunityReply(replyId: string) {
  const all = listLocalCommunityReplies();
  const descendants = new Set<string>([replyId]);
  let changed = true;
  while (changed) {
    changed = false;
    all.forEach(reply => {
      if (reply.parent_reply_id && descendants.has(reply.parent_reply_id) && !descendants.has(reply.id)) {
        descendants.add(reply.id);
        changed = true;
      }
    });
  }
  writeLocalArray(LOCAL_REPLIES_KEY, all.filter(reply => !descendants.has(reply.id)));
}

export function updateLocalCommunityReply(replyId: string, body: string) {
  const updatedAt = new Date().toISOString();
  let updated: CommunityV11Reply | null = null;
  writeLocalArray(
    LOCAL_REPLIES_KEY,
    listLocalCommunityReplies().map(reply => {
      if (reply.id !== replyId) return reply;
      updated = { ...reply, body: body.trim(), updated_at: updatedAt };
      return updated;
    }),
  );
  return updated;
}
