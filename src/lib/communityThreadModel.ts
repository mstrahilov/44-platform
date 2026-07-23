import type { SocialReply } from '@/lib/social';

export const COMMUNITY_THREAD_PAGE_SIZE = 20;
export const COMMUNITY_BRANCH_PREVIEW_SIZE = 2;
export const COMMUNITY_BRANCH_PAGE_SIZE = 10;

export type CommunityThreadDescendant = {
  reply: SocialReply;
  replyingTo: SocialReply | null;
};

export type CommunityThreadBranch = {
  root: SocialReply;
  descendants: CommunityThreadDescendant[];
};

export type CommunityThreadModel = {
  byId: Map<string, SocialReply>;
  directReplies: SocialReply[];
  branches: Map<string, CommunityThreadBranch>;
};

function oldestFirst(a: SocialReply, b: SocialReply) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function buildCommunityThreadModel(replies: SocialReply[]): CommunityThreadModel {
  const byId = new Map(replies.map(reply => [reply.id, reply]));
  const childrenByParent = new Map<string, SocialReply[]>();

  replies.forEach(reply => {
    if (!reply.parent_reply_id || !byId.has(reply.parent_reply_id)) return;
    const children = childrenByParent.get(reply.parent_reply_id) ?? [];
    children.push(reply);
    childrenByParent.set(reply.parent_reply_id, children);
  });
  childrenByParent.forEach(children => children.sort(oldestFirst));

  const directReplies = replies
    .filter(reply => !reply.parent_reply_id || !byId.has(reply.parent_reply_id))
    .sort(oldestFirst);

  const branches = new Map<string, CommunityThreadBranch>();
  directReplies.forEach(root => {
    const descendants: CommunityThreadDescendant[] = [];
    const seen = new Set<string>();

    function visit(parent: SocialReply) {
      (childrenByParent.get(parent.id) ?? []).forEach(child => {
        if (seen.has(child.id)) return;
        seen.add(child.id);
        descendants.push({ reply: child, replyingTo: parent });
        visit(child);
      });
    }

    visit(root);
    branches.set(root.id, { root, descendants });
  });

  return { byId, directReplies, branches };
}

export function visibleDirectReplies(model: CommunityThreadModel, limit: number) {
  return model.directReplies.slice(0, Math.max(COMMUNITY_THREAD_PAGE_SIZE, limit));
}

export function visibleBranchReplies(
  branch: CommunityThreadBranch,
  expanded: boolean,
  limit: number,
) {
  return branch.descendants.slice(
    0,
    expanded
      ? Math.max(COMMUNITY_BRANCH_PAGE_SIZE, limit)
      : COMMUNITY_BRANCH_PREVIEW_SIZE,
  );
}
