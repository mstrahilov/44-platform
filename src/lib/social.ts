import type { CommunityPost, CommunityReply, Profile } from '@/lib/platform';

export type SocialAuthor = Pick<
  Profile,
  'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'role' | 'creator_type'
> & {
  name?: string | null;
};

export type SocialPost = CommunityPost & {
  creators?: SocialAuthor | null;
};

export type SocialReply = CommunityReply & {
  authors?: Pick<Profile, 'id' | 'slug' | 'display_name' | 'username' | 'avatar_url'> | null;
};

export type SocialLiker = Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>;

export type LikeRow = {
  post_id: string;
  profile_id: string;
  profiles?: SocialLiker | null;
};

export type LikersMap = Record<string, SocialLiker[]>;

export function likersByPost(rows: LikeRow[]): LikersMap {
  return rows.reduce<LikersMap>((acc, row) => {
    if (!row.profiles) return acc;
    if (!acc[row.post_id]) acc[row.post_id] = [];
    acc[row.post_id].push(row.profiles);
    return acc;
  }, {});
}

export type ReplyEngagerRow = {
  post_id: string;
  author_id: string;
  authors?: SocialLiker | null;
};

export function repliersByPost(rows: ReplyEngagerRow[]): LikersMap {
  const seen = new Map<string, Set<string>>();
  return rows.reduce<LikersMap>((acc, row) => {
    if (!row.authors) return acc;
    const set = seen.get(row.post_id) ?? new Set<string>();
    if (set.has(row.authors.id)) return acc;
    set.add(row.authors.id);
    seen.set(row.post_id, set);
    if (!acc[row.post_id]) acc[row.post_id] = [];
    acc[row.post_id].push(row.authors);
    return acc;
  }, {});
}

export type SubjectType = 'product' | 'service' | 'resource' | 'library_item' | 'profile';

export function defaultCategoryForSubject(subjectType: SubjectType): string {
  switch (subjectType) {
    case 'product': return 'reviews';
    case 'service': return 'reviews';
    case 'resource': return 'questions';
    case 'library_item': return 'updates';
    case 'profile': return 'discussions';
  }
}

export type CountMap = Record<string, number>;

export function countById<T extends object>(rows: T[], key: keyof T) {
  return rows.reduce<CountMap>((acc, row) => {
    const id = row[key];
    if (typeof id === 'string') acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
}

export function authorDisplayName(author?: Partial<SocialAuthor> | null) {
  return author?.display_name || author?.name || author?.username || '44 Member';
}

export function authorHandle(author?: Partial<SocialAuthor> | null) {
  return author?.username || author?.slug || null;
}

export function authorHref(author?: Partial<SocialAuthor> | null) {
  const handle = authorHandle(author);
  return handle ? `/community/profile/${handle}` : '/community';
}

export function initials(value?: string | null) {
  const label = value?.trim() || '44';
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

export function compactDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (Number.isNaN(date.getTime())) return '';
  if (diff < minute) return 'now';
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function normalizeConversationKey(a: string, b: string) {
  return [a, b].sort().join(':');
}
