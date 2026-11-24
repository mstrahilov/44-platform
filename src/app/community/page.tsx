'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { CommunityMentionSelect, CommunityPostTagSelect } from '@/components/CommunityPostTagSelect';
import {
  CommunityReportDialog,
  type CommunityReportTarget,
} from '@/components/CommunityReportDialog';
import { FilterPopover } from '@/components/FilterPopover';
import { SocialAvatar, SocialPostRow } from '@/components/Social';
import { HubHero, PageShell } from '@/components/Ui';
import { OS44Button } from '@/components/OS44Button';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import {
  COMMUNITY_INTENT_PLACEHOLDERS,
  communityItemReference,
  communityPostSavesEnabled,
  communityV11LocalPreviewEnabled,
  createLocalCommunityPost,
  inferCommunityIntent,
  inferItemReferences,
  listLocalCommunityPosts,
  listLocalCommunityReplies,
  listLocalCommunitySavedPostIds,
  removeLocalCommunityPost,
  setLocalCommunityPostSaved,
  updateLocalCommunityPost,
  type CommunityCatalogItem,
  type CommunityIntent,
  type CommunityReference,
  type CommunityV11Post,
} from '@/lib/communityV11';
import {
  deleteDiscussion,
  createCommunityPost,
  listFollowedProfileIds,
  loadCommunityFeed,
  loadSavedCommunityPostIds,
  searchCommunityReferences,
  setCommunityPostSaved,
  setDiscussionLike,
  updateDiscussion,
  type CommunityReferenceOption,
} from '@/lib/domain/community';
import { listCommunityReferenceItems } from '@/lib/domain/catalog';
import { listRecentCommunityMembers } from '@/lib/domain/profiles';
import { localMaskPreviewEnabled, localMaskProduct } from '@/lib/localMaskPreview';
import {
  countById,
  likersByPost,
  repliersByPost,
  type CountMap,
  type LikeRow,
  type LikersMap,
} from '@/lib/social';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';

type CommunityProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

type FollowingState = {
  userId: string;
  ids: Set<string>;
};

type IntentView = 'all' | CommunityIntent;
type CommunityPostFilter = 'all' | 'following' | 'saved';

const INTENT_TABS: Array<{ id: IntentView; label: string; href: string }> = [
  { id: 'all', label: 'All', href: '/community' },
  { id: 'update', label: 'Updates', href: '/community/updates' },
  { id: 'question', label: 'Questions', href: '/community/questions' },
  { id: 'showcase', label: 'Showcase', href: '/community/showcase' },
  { id: 'collaboration', label: 'Collaboration', href: '/community/collaboration' },
];

function extractMentionQuery(value: string) {
  const match = value.match(/(?:^|\s)@([^\s@]{1,48})$/u);
  return match?.[1]?.toLocaleLowerCase() ?? '';
}

function applyMentionText(value: string, option: CommunityReferenceOption) {
  return value.replace(/(^|\s)@[^\s@]{0,48}$/u, (_match, prefix: string) => `${prefix}${option.insertText} `);
}

function textareaCaretAnchor(textarea: HTMLTextAreaElement) {
  const composer = textarea.closest<HTMLElement>('.community-v11-composer');
  if (!composer) return null;
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const caret = document.createElement('span');
  const textareaRect = textarea.getBoundingClientRect();
  const composerRect = composer.getBoundingClientRect();
  Object.assign(mirror.style, {
    position: 'fixed',
    left: `${textareaRect.left}px`,
    top: `${textareaRect.top}px`,
    width: `${textareaRect.width}px`,
    boxSizing: computed.boxSizing,
    padding: computed.padding,
    border: computed.border,
    font: computed.font,
    letterSpacing: computed.letterSpacing,
    lineHeight: computed.lineHeight,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  mirror.textContent = textarea.value.slice(0, textarea.selectionStart ?? textarea.value.length);
  caret.textContent = '\u200b';
  mirror.appendChild(caret);
  document.body.appendChild(mirror);
  const caretRect = caret.getBoundingClientRect();
  mirror.remove();
  const menuWidth = Math.min(390, Math.max(260, composer.clientWidth - 32));
  return {
    left: Math.max(12, Math.min(caretRect.left - composerRect.left, composer.clientWidth - menuWidth - 12)),
    top: Math.max(72, caretRect.bottom - composerRect.top + 8),
    width: menuWidth,
  };
}

function sortPosts(posts: CommunityV11Post[]) {
  return [...posts].sort((a, b) => (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ));
}

function CommunityPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [posts, setPosts] = useState<CommunityV11Post[]>([]);
  const [items, setItems] = useState<CommunityCatalogItem[]>([]);
  const [recentMembers, setRecentMembers] = useState<Awaited<ReturnType<typeof listRecentCommunityMembers>>>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [followingState, setFollowingState] = useState<FollowingState | null>(null);
  const [profileState, setProfileState] = useState<CommunityProfileState | null>(null);
  const [likingId, setLikingId] = useState('');
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => new Set());
  const [savingPostId, setSavingPostId] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerIntent, setComposerIntent] = useState<CommunityIntent | ''>('');
  const [postBody, setPostBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [mentionOptions, setMentionOptions] = useState<CommunityReferenceOption[]>([]);
  const [mentionAnchor, setMentionAnchor] = useState<{ left: number; top: number; width: number } | null>(null);
  const [selectedReferences, setSelectedReferences] = useState<CommunityReference[]>([]);
  const [editingPostId, setEditingPostId] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [reportTarget, setReportTarget] = useState<CommunityReportTarget | null>(null);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeIntent: IntentView = pathname === '/community/general'
    ? 'general'
    : pathname === '/community/questions'
      ? 'question'
      : pathname === '/community/help'
        ? 'help'
        : pathname === '/community/collaboration'
          ? 'collaboration'
          : pathname === '/community/showcase'
            ? 'showcase'
            : pathname === '/community/updates'
              ? 'update'
              : 'all';
  const postFilter: CommunityPostFilter = searchParams.get('filter') === 'following'
    ? 'following'
    : searchParams.get('filter') === 'saved'
      ? 'saved'
      : 'all';

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('44:community-filter-state', { detail: { active: postFilter !== 'all' } }));
  }, [postFilter]);

  const activeMentionQuery = composerOpen ? extractMentionQuery(postBody) : '';
  useEffect(() => {
    let alive = true;
    void listCommunityReferenceItems(200).then(catalog => {
      if (!alive) return;
      setItems(localMaskPreviewEnabled && !catalog.some(item => item.id === localMaskProduct.id)
        ? [...catalog, localMaskProduct]
        : catalog);
    }).catch(() => { if (alive && localMaskPreviewEnabled) setItems([localMaskProduct]); });
    void listRecentCommunityMembers().then(members => {
      if (alive) setRecentMembers(members);
    }).catch(() => undefined);

    async function fetchCommunity() {
      setPostsLoading(true);
      setError('');
      try {
        const feed = await loadCommunityFeed();
        if (!alive) return;
        const localPosts = communityV11LocalPreviewEnabled ? listLocalCommunityPosts() : [];
        const localReplyRows = localPosts.flatMap(post => listLocalCommunityReplies(post.id).map(reply => ({
          post_id: post.id,
          author_id: reply.author_id ?? '',
          authors: reply.authors ?? null,
        }))).filter(reply => Boolean(reply.author_id));
        setPosts(sortPosts([...localPosts, ...feed.posts]));
        setReplyCounts({
          ...countById(feed.replies, 'post_id'),
          ...countById(localReplyRows, 'post_id'),
        });
        setRepliersMap({
          ...repliersByPost(feed.replies),
          ...repliersByPost(localReplyRows),
        });
        setLikes(feed.likes);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load Community posts.');
      }
      if (alive) setPostsLoading(false);
    }
    void fetchCommunity();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    void Promise.all([
      loadStudioProfile(activeUserId),
      listFollowedProfileIds(activeUserId),
    ]).then(([profileResult, followedIds]) => {
      if (!alive) return;
      setProfileState({ userId: activeUserId, profile: profileResult.profile });
      setFollowingState({ userId: activeUserId, ids: new Set(followedIds) });
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load your Community preferences.');
      setFollowingState({ userId: activeUserId, ids: new Set() });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!communityPostSavesEnabled || !userId) {
      Promise.resolve().then(() => setSavedPostIds(new Set()));
      return;
    }
    let alive = true;
    void loadSavedCommunityPostIds(userId).then(ids => {
      if (alive) setSavedPostIds(new Set([...ids, ...listLocalCommunitySavedPostIds()]));
    }).catch(loadError => {
      if (!alive) return;
      // The local preview can be used before the new Supabase migration is applied.
      // Keep the feature usable locally without masking real production errors.
      if (communityV11LocalPreviewEnabled) {
        setSavedPostIds(listLocalCommunitySavedPostIds());
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Could not load your saved posts.');
      }
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!activeMentionQuery) {
      Promise.resolve().then(() => setMentionOptions([]));
      return;
    }
    let alive = true;
    void searchCommunityReferences(activeMentionQuery)
      .then(options => {
        if (alive) setMentionOptions(options);
      })
      .catch(() => {
        if (alive) setMentionOptions([]);
      });
    return () => { alive = false; };
  }, [activeMentionQuery]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const canInteract = hasCommunityIdentity(profile);
  const canPostUpdate = profile?.role === 'creator' || profile?.role === 'admin';
  const followingIds = useMemo(() => (
    followingState && followingState.userId === userId ? followingState.ids : new Set<string>()
  ), [followingState, userId]);
  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);
  const visiblePosts = useMemo(() => posts.filter(post => {
    if (activeIntent !== 'all' && inferCommunityIntent(post) !== activeIntent) return false;
    if (postFilter === 'following' && !(post.author_id && followingIds.has(post.author_id))) return false;
    if (postFilter === 'saved' && !savedPostIds.has(post.id)) return false;
    return true;
  }), [activeIntent, followingIds, postFilter, posts, savedPostIds]);
  function requireCommunityAction(action: () => void) {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    action();
  }

  function openComposer() {
    requireCommunityAction(() => {
      router.push('/community/new');
    });
  }

  function resetComposer() {
    setComposerOpen(false);
    setComposerIntent('');
    setPostBody('');
    setMentionOptions([]);
    setMentionAnchor(null);
    setSelectedReferences([]);
  }

  function applyReference(option: CommunityReferenceOption) {
    setPostBody(current => applyMentionText(current, option));
    setSelectedReferences(current => (
      current.some(reference => reference.id === option.id && reference.kind === option.kind)
        ? current
        : [...current, option]
    ));
    setMentionOptions([]);
    setMentionAnchor(null);
    window.requestAnimationFrame(() => {
      const textarea = composerTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile || posting || !postBody.trim()) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    if (composerIntent === 'update' && !canPostUpdate) return;

    setPosting(true);
    setError('');
    try {
      const created = communityV11LocalPreviewEnabled
        ? createLocalCommunityPost({
            author: profile,
            body: postBody,
            intent: composerIntent || 'general',
            references: selectedReferences,
          })
        : await createCommunityPost({
            body: postBody,
            intent: composerIntent || 'general',
            references: selectedReferences,
          });
      setPosts(current => sortPosts([created, ...current]));
      resetComposer();
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Could not publish this post.');
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(post: CommunityV11Post) {
    if (likingId || !user) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setLikingId(post.id);
    setError('');
    const liked = likedIds.has(post.id);
    if (post.local_only) {
      setLikes(current => liked
        ? current.filter(like => !(like.post_id === post.id && like.profile_id === user.id))
        : [...current, {
            post_id: post.id,
            profile_id: user.id,
            profiles: profile ? {
              id: profile.id,
              display_name: profile.display_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
            } : null,
          }]);
      setLikingId('');
      return;
    }
    try {
      await setDiscussionLike(post.id, user.id, !liked);
      setLikes(current => liked
        ? current.filter(like => !(like.post_id === post.id && like.profile_id === user.id))
        : [...current, {
            post_id: post.id,
            profile_id: user.id,
            profiles: profile ? {
              id: profile.id,
              display_name: profile.display_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
            } : null,
          }]);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Could not update this like.');
    }
    setLikingId('');
  }

  async function toggleSave(post: CommunityV11Post) {
    if (!communityPostSavesEnabled || savingPostId) return;
    if (!user) {
      const query = searchParams.toString();
      const returnTo = `${pathname}${query ? `?${query}` : ''}`;
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setSavingPostId(post.id);
    setError('');
    const saved = savedPostIds.has(post.id);
    setSavedPostIds(current => {
      const next = new Set(current);
      if (saved) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    try {
      if (post.local_only) {
        setLocalCommunityPostSaved(post.id, !saved);
      } else {
        await setCommunityPostSaved(post.id, user.id, !saved);
      }
    } catch (saveError) {
      if (communityV11LocalPreviewEnabled && !post.local_only) {
        setLocalCommunityPostSaved(post.id, !saved);
        setSavingPostId('');
        return;
      }
      setSavedPostIds(current => {
        const next = new Set(current);
        if (saved) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setError(saveError instanceof Error ? saveError.message : 'Could not update this saved post.');
    } finally {
      setSavingPostId('');
    }
  }

  async function deletePost(post: CommunityV11Post) {
    if (!user || post.author_id !== user.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    if (post.local_only) {
      removeLocalCommunityPost(post.id);
      setPosts(current => current.filter(item => item.id !== post.id));
      return;
    }
    try {
      await deleteDiscussion(post.id, user.id);
      setPosts(current => current.filter(item => item.id !== post.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this post.');
    }
  }

  function beginEditingPost(post: CommunityV11Post) {
    if (!user || post.author_id !== user.id) return;
    setEditingPostId(post.id);
    setEditBody(post.body ?? '');
  }

  function cancelEditingPost() {
    if (editSaving) return;
    setEditingPostId('');
    setEditBody('');
  }

  async function savePostEdit(post: CommunityV11Post) {
    if (!user || post.author_id !== user.id || editSaving || !editBody.trim()) return;
    setEditSaving(true);
    setError('');
    try {
      const updated = post.local_only
        ? updateLocalCommunityPost(post.id, editBody)
        : await updateDiscussion(post.id, user.id, editBody);
      if (!updated) throw new Error('Could not update this post.');
      setPosts(current => current.map(item => item.id === post.id ? updated : item));
      setEditingPostId('');
      setEditBody('');
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Could not update this post.');
    } finally {
      setEditSaving(false);
    }
  }

  function openPostReport(post: CommunityV11Post) {
    requireCommunityAction(() => setReportTarget({ kind: 'post', id: post.id }));
  }

  function referencesForPost(post: CommunityV11Post) {
    return post.community_references?.length
      ? post.community_references
      : [
          ...(post.item_id
            ? items.filter(item => item.id === post.item_id).map(communityItemReference)
            : []),
          ...inferItemReferences(post.body ?? '', items),
        ].filter((reference, index, all) => all.findIndex(candidate => candidate.kind === reference.kind && candidate.id === reference.id) === index);
  }

  const communityTools = (
    <div className="page-header-tools">
      {!composerOpen && (
        <button
          type="button"
          className="ui44-symbol-button ui44-symbol-button-add page-compose-button"
          aria-label="Create a new post"
          onClick={openComposer}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="m11 13 1-.3L21.5 3.2a1.8 1.8 0 0 0-2.5-2.5L9.5 10.2 9 14l2-.7Z" />
          </svg>
        </button>
      )}
      <button
        type="button"
        data-filter-popover-trigger="true"
        className={`ui44-symbol-button ui44-symbol-button-filter page-filter-button${postFilter !== 'all' ? ' ui44-symbol-button-active page-filter-button-active' : ''}`}
        aria-label="Filter Community"
        title="Filter Community"
        onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Filter Community' } }))}
      >
        <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
      </button>
      <FilterPopover
        label="Filter Community"
        active={postFilter !== 'all'}
        hideTrigger
        popoverClassName="community-filter-popover"
        popoverStyle={{
          position: 'fixed',
          zIndex: 1200,
          top: 'calc(var(--os-topbar-height) + 8px)',
          right: 'var(--os-content-inset)',
          left: 'auto',
          width: 'min(220px, calc(100vw - (var(--os-content-inset) * 2)))',
          maxWidth: 'calc(100vw - (var(--os-content-inset) * 2))',
        }}
      >
        {({ close }) => <>
          {[
            { id: 'all', label: 'All Posts', href: pathname },
            { id: 'saved', label: 'Saved Posts', href: `${pathname}?filter=saved` },
            { id: 'following', label: 'People You Follow', href: `${pathname}?filter=following` },
          ].map(option => (
            <button
              key={option.id}
              type="button"
              className={postFilter === option.id ? 'ui44-paper-menu-item ui44-paper-menu-item-selected page-filter-option page-filter-option-active' : 'ui44-paper-menu-item page-filter-option'}
              onClick={() => {
                close();
                if (option.id === 'saved' && !user) {
                  router.push(`/login?returnTo=${encodeURIComponent(option.href)}`);
                  return;
                }
                router.push(option.href);
              }}
            >
              {option.label}
            </button>
          ))}
        </>}
      </FilterPopover>
    </div>
  );

  const filterQuery = postFilter === 'all' ? '' : `?filter=${postFilter}`;

  return (
    <PageShell>
      <main className="app-page community-app-page community-v11-page">
        <div className="community-v11-opening section-tab-page-opening">
          <HubHero title="Community" actions={communityTools} />
          <SectionTabs
            ariaLabel="Community post types"
            className="community-intent-rail"
            dockToTopbar
            toolbarSpacing
            topbarTabs={INTENT_TABS.map(tab => ({
              ...tab,
              href: `${tab.href}${filterQuery}`,
              active: activeIntent === tab.id,
              variant: 'section' as const,
            }))}
          >
            {INTENT_TABS.map(tab => (
              <SectionTab
                key={tab.id}
                  href={`${tab.href}${filterQuery}`}
                active={activeIntent === tab.id}
              >
                {tab.label}
              </SectionTab>
            ))}
          </SectionTabs>
        </div>

        {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}

        {composerOpen && (
          <div className="community-v11-composer-layer" role="presentation" onClick={resetComposer}>
          <form className="community-v11-composer ui44-panel ui44-panel-glass" onSubmit={submitPost} role="dialog" aria-modal="true" aria-labelledby="community-composer-title" onClick={event => event.stopPropagation()}>
            <div className="community-v11-composer-heading">
              <OS44Button className="community-v11-composer-cancel" onClick={resetComposer}>Cancel</OS44Button>
              <h2 id="community-composer-title">New Post</h2>
              <OS44Button type="submit" className="community-v11-composer-post" disabled={posting || !postBody.trim()}>{posting ? 'Posting…' : 'Post'}</OS44Button>
            </div>
            <div className="community-v11-composer-field-label">
              <label htmlFor="community-composer-body">What&apos;s on your mind?</label>
              <button type="button" className="community-v11-composer-photo" aria-label="Attach Photo" title="Attach Photo">▧</button>
            </div>
            <textarea
              id="community-composer-body"
              ref={composerTextareaRef}
              className="ui44-input ui44-textarea ui44-input-bare"
              value={postBody}
              onChange={event => {
                setPostBody(event.target.value);
                setMentionAnchor(textareaCaretAnchor(event.currentTarget));
              }}
              onClick={event => setMentionAnchor(textareaCaretAnchor(event.currentTarget))}
              onKeyUp={event => setMentionAnchor(textareaCaretAnchor(event.currentTarget))}
              placeholder={COMMUNITY_INTENT_PLACEHOLDERS[composerIntent || 'general']}
              rows={5}
              autoFocus
              disabled={posting}
            />
            {mentionOptions.length > 0 && mentionAnchor && (
              <div
                className="ui44-paper-menu social-mention-list community-reference-menu community-reference-menu-caret"
                role="listbox"
                aria-label="Mention suggestions"
                style={{
                  left: mentionAnchor.left,
                  top: mentionAnchor.top,
                  width: mentionAnchor.width,
                }}
              >
                <ReferenceOptionList options={mentionOptions} onSelect={applyReference} />
              </div>
            )}
            <CommunityMentionSelect
              items={items}
              value={selectedReferences.find(reference => reference.kind === 'item')?.id ?? ''}
              onChange={itemId => {
                const item = items.find(candidate => candidate.id === itemId);
                setSelectedReferences(current => [
                  ...current.filter(reference => reference.kind !== 'item'),
                  ...(item ? [communityItemReference(item)] : []),
                ]);
              }}
            />
            <CommunityPostTagSelect value={composerIntent} canPostUpdate={canPostUpdate} onChange={setComposerIntent} />
            {composerIntent === 'update' && <p className="community-composer-helper">Type @ to mention one of your published Items.</p>}
          </form>
          </div>
        )}

        <div className="community-v11-content-grid">
          <section className="community-v11-main-column dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip social-feed social-feed-list social-feed-panel" aria-label="Community feed">
            {postsLoading ? (
              <div className="dashboard-empty ui44-state ui44-state-loading" role="status" aria-live="polite">Loading posts...</div>
            ) : visiblePosts.length === 0 ? (
              <div className="dashboard-empty">
                {postFilter === 'following'
                  ? 'No posts from people you follow yet.'
                  : postFilter === 'saved'
                    ? 'No saved posts yet.'
                    : `No ${activeIntent === 'all' ? 'posts' : INTENT_TABS.find(tab => tab.id === activeIntent)?.label.toLocaleLowerCase()} yet.`}
              </div>
            ) : (
              visiblePosts.map(post => {
                const intent = inferCommunityIntent(post);
                return (
                  <div key={post.id} className="social-feed-post" data-community-intent={intent}>
                    <SocialPostRow
                      post={post}
                      replyCount={replyCounts[post.id] ?? 0}
                      likeCount={likeCounts[post.id] ?? 0}
                      likers={likersMap[post.id] ?? []}
                      repliers={repliersMap[post.id] ?? []}
                      liked={likedIds.has(post.id)}
                      onLike={() => { void toggleLike(post); }}
                      saved={savedPostIds.has(post.id)}
                      onSave={() => { void toggleSave(post); }}
                      saveDisabled={savingPostId === post.id}
                      onDelete={() => { void deletePost(post); }}
                      onEdit={() => beginEditingPost(post)}
                      onReport={() => openPostReport(post)}
                      canDelete={Boolean(user && post.author_id === user.id)}
                      canEdit={Boolean(user && post.author_id === user.id)}
                      disabled={likingId === post.id}
                      references={referencesForPost(post)}
                      editing={editingPostId === post.id}
                      rowClassName="community-post-card"
                      showAuthorHandle={false}
                      editBody={editingPostId === post.id ? editBody : post.body ?? ''}
                      editSaving={editSaving && editingPostId === post.id}
                      onEditBodyChange={setEditBody}
                      onSaveEdit={() => { void savePostEdit(post); }}
                      onCancelEdit={cancelEditingPost}
                    />
                  </div>
                );
              })
            )}
          </section>
          <aside className="community-v11-aside" aria-label="New members">
            <section className="community-v11-members-panel ui44-panel ui44-panel-glass">
              <h2>New members</h2>
              <div className="community-v11-member-list">
                {recentMembers.map(member => {
                  const profilePath = `/profile/${member.username || member.slug || member.id}`;
                  return (
                    <Link key={member.id} href={profilePath} className="community-v11-member">
                      <SocialAvatar profile={member} />
                      <span className="community-v11-member-copy">
                        <strong>{member.display_name || member.username || '44 member'}</strong>
                        <small>@{member.username || member.slug || 'member'}</small>
                      </span>
                    </Link>
                  );
                })}
                {recentMembers.length === 0 && <p className="community-v11-members-empty">New members will appear here.</p>}
              </div>
              <Link href="/search?scope=members" className="community-v11-members-view-all">View all</Link>
            </section>
          </aside>
        </div>
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
      <CommunityReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </PageShell>
  );
}

function ReferenceOptionList({
  options,
  onSelect,
}: {
  options: CommunityReferenceOption[];
  onSelect: (option: CommunityReferenceOption) => void;
}) {
  if (options.length === 0) return null;
  return (
    <>
      {options.map(option => (
        <button
          key={`${option.kind}-${option.id}`}
          type="button"
          className="ui44-paper-menu-item social-mention-option community-reference-option"
          role="option"
          aria-selected="false"
          data-reference-kind={option.kind}
          onClick={() => onSelect(option)}
        >
          {option.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="community-reference-image" src={option.imageUrl} alt="" />
          ) : option.kind === 'person' ? (
            <SocialAvatar profile={{ display_name: option.displayLabel }} />
          ) : (
            <span className="community-reference-image community-reference-image-empty" aria-hidden="true" />
          )}
          <span className="social-mention-copy">
            <span className="social-mention-name">{option.displayLabel}</span>
            <span className="social-mention-handle">{option.secondary}</span>
          </span>
        </button>
      ))}
    </>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={(
        <PageShell>
          <main className="social-shell">
            <div className="dashboard-empty ui44-state ui44-state-loading" role="status" aria-live="polite">Loading community...</div>
          </main>
        </PageShell>
      )}
    >
      <CommunityPageContent />
    </Suspense>
  );
}
