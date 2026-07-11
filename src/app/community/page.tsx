'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { HubHero, PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import {
  SocialAuthorLine,
  SocialAvatar,
  SocialPostRow,
  SocialRichText,
  SocialTrashIcon,
} from '@/components/Social';
import {
  acceptQuestionAnswer,
  createCommunityCollaboration,
  createCommunityQuestion,
  createCollaborationResponse,
  createQuestionAnswer,
  deleteCollaborationResponse,
  deleteCommunityCollaboration,
  deleteCommunityQuestion,
  deleteQuestionAnswer,
  loadCollaborationResponses,
  loadCommunityCollaborations,
  loadCommunityQuestions,
  loadQuestionAnswers,
  loadQuestionVotes,
  addQuestionVote,
  updateCommunityCollaborationStatus,
  type CommunityCollaborationResponse,
  type CommunityCollaboration,
  type CommunityQuestion,
  type CommunityQuestionAnswer,
  type CommunityQuestionVote,
} from '@/lib/communityStructured';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';
import { countById, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type ReplyEngagerRow, type SocialPost } from '@/lib/social';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

type PostLike = LikeRow;
type MentionProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
type CommunityProfileState = {
  userId: string;
  profile: StudioProfile | null;
};
type FollowingState = {
  userId: string;
  ids: Set<string>;
};

const COMMUNITY_COPY: Record<'feed' | 'questions' | 'collaboration' | 'topic', { title: string; copy: string; empty: string }> = {
  feed: {
    title: 'Posts',
    copy: 'General posts from creators and fans.',
    empty: 'No posts yet.',
  },
  questions: {
    title: 'Questions',
    copy: 'Ask something specific. Get an answer from someone who has solved it.',
    empty: 'No questions yet.',
  },
  collaboration: {
    title: 'Collaboration',
    copy: 'Looking for a collaborator, or looking to be found.',
    empty: 'No collaboration listings yet.',
  },
  topic: {
    title: 'Topic',
    copy: 'Posts using this hashtag.',
    empty: 'No posts use this hashtag yet.',
  },
};

function buildPostTitle(body: string) {
  return body.trim().replace(/\s+/g, ' ').slice(0, 72) || 'New post';
}

function buildSlug(body: string) {
  const base = normalizeTaxonomyValue(buildPostTitle(body)) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function extractHashtags(value?: string | null) {
  const matches = value?.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(matches.map(match => normalizeTaxonomyValue(match.slice(1))).filter(Boolean)));
}

function titleFromTopic(slug: string) {
  if (slug === 'question') return 'Questions';
  if (slug === 'collaboration') return 'Collaboration';
  return `#${slug}`;
}

function lockedTopicSuffix(topic: string | null) {
  return topic ? ` #${topic}` : '';
}

function composeLockedBody(value: string, topic: string | null) {
  if (!topic) return value;
  const trimmed = value.trimEnd();
  return `${trimmed}${trimmed ? ' ' : ''}#${topic}`;
}

function parseLockedBody(value: string, topic: string | null) {
  if (!topic) return value;
  const suffixPattern = new RegExp(`\\s*#${topic}\\s*$`, 'i');
  return value.replace(suffixPattern, '').trimEnd();
}

function extractMentionQuery(value: string, topic: string | null) {
  const suffix = lockedTopicSuffix(topic).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = topic
    ? new RegExp(`(?:^|\\s)@([a-zA-Z0-9_]{1,})(?=(?:${suffix})?$)`, 'i')
    : /(?:^|\s)@([a-zA-Z0-9_]{1,})$/i;
  const match = value.match(pattern);
  return match?.[1]?.toLowerCase() ?? '';
}

function replaceTrailingMention(value: string, username: string, topic: string | null) {
  const suffix = topic ? lockedTopicSuffix(topic) : '';
  const base = topic && value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  const nextBase = base.replace(/(^|\s)@[a-zA-Z0-9_]*$/i, (_match, prefix: string) => `${prefix}@${username} `);
  return topic ? composeLockedBody(parseLockedBody(nextBase, topic), topic) : nextBase;
}

function CommunityPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [followingState, setFollowingState] = useState<FollowingState | null>(null);
  const [profileState, setProfileState] = useState<CommunityProfileState | null>(null);
  const [likingId, setLikingId] = useState('');
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [query, setQuery] = useState('');
  const [posting, setPosting] = useState(false);
  const [mentionOptions, setMentionOptions] = useState<MentionProfile[]>([]);
  const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
  const [collaborations, setCollaborations] = useState<CommunityCollaboration[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, CommunityQuestionAnswer[]>>({});
  const [questionVotes, setQuestionVotes] = useState<Record<string, CommunityQuestionVote[]>>({});
  const [collaborationResponses, setCollaborationResponses] = useState<Record<string, CommunityCollaborationResponse[]>>({});
  const [openStructuredId, setOpenStructuredId] = useState<string | null>(null);
  const [structuredReplyBody, setStructuredReplyBody] = useState('');
  const [structuredSubmitting, setStructuredSubmitting] = useState(false);
  const [structuredVotingId, setStructuredVotingId] = useState('');
  const [structuredAcceptingId, setStructuredAcceptingId] = useState('');
  const [structuredRequiresSetup, setStructuredRequiresSetup] = useState(false);
  const [structuredLoading, setStructuredLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  const routeView = pathname === '/community/following'
    ? 'feed'
    : pathname === '/community/questions'
      ? 'questions'
      : pathname === '/community/collaboration'
        ? 'collaboration'
        : null;
  const requestedView = routeView ?? searchParams.get('view');
  const postFilter = searchParams.get('filter') === 'following' || searchParams.get('view') === 'following'
    ? 'following'
    : 'all';
  const requestedTopic = normalizeTaxonomyValue(searchParams.get('topic') ?? '');
  const activeCommunityTab = requestedView === 'questions'
      ? 'questions'
      : requestedView === 'collaboration'
        ? 'collaboration'
    : requestedTopic === 'question'
      ? 'questions'
      : requestedTopic === 'collaboration'
        ? 'collaboration'
        : 'feed';
  const forcedTopic = requestedTopic === 'question' || requestedTopic === 'collaboration' ? requestedTopic : null;
  const postComposerValue = composeLockedBody(postBody, forcedTopic);
  const activeMentionQuery = postComposerOpen
    ? extractMentionQuery(postComposerValue, forcedTopic)
    : '';
  const visibleMentionOptions = activeMentionQuery ? mentionOptions : [];

  useEffect(() => {
    if (pathname !== '/community' || routeView || !requestedView) return;
    if (requestedView === 'following') {
      router.replace('/community?filter=following');
    } else if (requestedView === 'questions' || requestedView === 'collaboration') {
      router.replace(`/community/${requestedView}`);
    }
  }, [pathname, requestedView, routeView, router]);

  useEffect(() => {
    async function fetchCommunity() {
      const postResult = await supabase
        .from('posts')
        .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(80);
      if (postResult.error) setError(postResult.error.message);
      const nextPosts = (postResult.data as SocialPost[] | null) ?? [];
      setPosts(nextPosts);
      const postIds = nextPosts.map(post => post.id);
      const [replyResult, likeResult] = postIds.length > 0 ? await Promise.all([
        supabase
          .from('post_replies')
          .select('post_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
          .in('post_id', postIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('post_likes')
          .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false }),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      const replies = (replyResult.data as ReplyEngagerRow[] | null) ?? [];
      setReplyCounts(countById(replies, 'post_id'));
      setRepliersMap(repliersByPost(replies));
      setLikes((likeResult.data as PostLike[] | null) ?? []);
      setPostsLoading(false);
    }
    fetchCommunity();
  }, []);

  useEffect(() => {
    if (activeCommunityTab !== 'questions' && activeCommunityTab !== 'collaboration') return;
    async function loadStructured() {
      setStructuredLoading(true);
      if (activeCommunityTab === 'questions') {
        const result = await loadCommunityQuestions('recent');
        setQuestions(result.rows);
        setStructuredRequiresSetup(result.requiresSetup);
        if (result.error) setError(result.error);
        setStructuredLoading(false);
        return;
      }

      const result = await loadCommunityCollaborations();
      setCollaborations(result.rows);
      setStructuredRequiresSetup(result.requiresSetup);
      if (result.error) setError(result.error);
      setStructuredLoading(false);
    }
    void loadStructured();
  }, [activeCommunityTab]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    loadStudioProfile(activeUserId).then(result => {
      if (alive) setProfileState({ userId: activeUserId, profile: result.profile });
    });
    supabase
      .from('profile_follows')
      .select('following_id')
      .eq('follower_id', activeUserId)
      .then(result => {
        if (!alive) return;
        if (result.error) {
          setError(result.error.message);
          setFollowingState({ userId: activeUserId, ids: new Set() });
          return;
        }
        setFollowingState({
          userId: activeUserId,
          ids: new Set(((result.data ?? []) as Array<{ following_id: string }>).map(row => row.following_id)),
        });
      });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!activeMentionQuery) return;
    let alive = true;
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `${activeMentionQuery}%`)
      .limit(6)
      .then(result => {
        if (!alive) return;
        if (result.error) {
          setMentionOptions([]);
          return;
        }
        setMentionOptions((result.data as MentionProfile[] | null) ?? []);
      });
    return () => { alive = false; };
  }, [activeMentionQuery]);

  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap: LikersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);
  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const followingIds = useMemo(() => (
    followingState && followingState.userId === userId ? followingState.ids : new Set<string>()
  ), [followingState, userId]);
  const canInteract = hasCommunityIdentity(profile);
  const generalPosts = posts;
  const visiblePosts = useMemo(() => {
    let next = generalPosts;
    const normalizedQuery = query.trim().toLowerCase();
    if (postFilter === 'following') {
      next = next.filter(post => typeof post.author_id === 'string' && followingIds.has(post.author_id));
    }
    if (requestedTopic) {
      next = next.filter(post => extractHashtags(post.body).includes(requestedTopic));
    }
    if (normalizedQuery) {
      next = next.filter(post => {
        const author = post.creators?.display_name || post.creators?.username || '';
        return `${post.title ?? ''} ${post.body ?? ''} ${author}`.toLowerCase().includes(normalizedQuery);
      });
    }
    return next;
  }, [followingIds, generalPosts, postFilter, query, requestedTopic]);
  const pageCopy = activeCommunityTab === 'questions'
      ? COMMUNITY_COPY.questions
      : activeCommunityTab === 'collaboration'
        ? COMMUNITY_COPY.collaboration
        : requestedTopic
          ? { ...COMMUNITY_COPY.topic, title: titleFromTopic(requestedTopic), copy: `Posts using #${requestedTopic}.` }
          : {
              ...COMMUNITY_COPY.feed,
              title: 'Community',
              empty: postFilter === 'following' ? 'No posts from people you follow yet.' : COMMUNITY_COPY.feed.empty,
            };
  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return questions;
    return questions.filter(question => {
      const author = question.authors?.display_name || question.authors?.username || '';
      return `${question.title} ${question.body} ${question.tags.join(' ')} ${author}`.toLowerCase().includes(normalizedQuery);
    });
  }, [query, questions]);
  const filteredCollaborations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return collaborations;
    return collaborations.filter(collaboration => {
      const author = collaboration.authors?.display_name || collaboration.authors?.username || '';
      return `${collaboration.title} ${collaboration.body} ${collaboration.role_needed ?? ''} ${collaboration.project_type ?? ''} ${author}`.toLowerCase().includes(normalizedQuery);
    });
  }, [collaborations, query]);

  const communityTools = (
    <div className="page-header-tools">
      <label className="page-search-control">
        <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search Community"
          aria-label="Search Community"
        />
      </label>
      {activeCommunityTab === 'feed' && !requestedTopic ? (
        <details className="page-filter-menu">
          <summary className="page-filter-button" aria-label="Filter Community" title="Filter Community">
            <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
          </summary>
          <div className="page-filter-popover">
            {[
              { id: 'all', label: 'All Posts', href: '/community' },
              { id: 'following', label: 'Following', href: '/community?filter=following' },
            ].map(option => (
              <button
                key={option.id}
                type="button"
                className={postFilter === option.id ? 'page-filter-option page-filter-option-active' : 'page-filter-option'}
                onClick={event => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  router.push(option.href);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );

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

  async function openQuestion(question: CommunityQuestion) {
    if (openStructuredId === question.id) {
      setOpenStructuredId(null);
      setStructuredReplyBody('');
      return;
    }
    setOpenStructuredId(question.id);
    setStructuredReplyBody('');
    if (!questionAnswers[question.id]) {
      const answerResult = await loadQuestionAnswers(question.id);
      if (answerResult.error) {
        setError(answerResult.error);
        return;
      }
      setQuestionAnswers(current => ({ ...current, [question.id]: answerResult.rows }));
      const voteResult = await loadQuestionVotes(question.id, answerResult.rows.map(answer => answer.id));
      if (voteResult.error) {
        setError(voteResult.error);
        return;
      }
      setQuestionVotes(current => ({ ...current, [question.id]: voteResult.rows }));
    }
  }

  async function openCollaboration(collaboration: CommunityCollaboration) {
    if (openStructuredId === collaboration.id) {
      setOpenStructuredId(null);
      setStructuredReplyBody('');
      return;
    }
    setOpenStructuredId(collaboration.id);
    setStructuredReplyBody('');
    if (!collaborationResponses[collaboration.id]) {
      const responseResult = await loadCollaborationResponses(collaboration.id);
      if (responseResult.error) {
        setError(responseResult.error);
        return;
      }
      setCollaborationResponses(current => ({ ...current, [collaboration.id]: responseResult.rows }));
    }
  }

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || posting || !postBody.trim()) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setPosting(true);
    setError('');
    const body = postBody.trim();

    if (activeCommunityTab === 'questions') {
      const title = postTitle.trim() || buildPostTitle(body);
      const result = await createCommunityQuestion({
        authorId: user.id,
        title,
        body,
        tags: extractHashtags(body),
      });

      if (result.error) {
        setError(result.error.message);
        setPosting(false);
        return;
      }

      setQuestions(current => [result.data as CommunityQuestion, ...current]);
      setPostTitle('');
      setPostBody('');
      setPostComposerOpen(false);
      setPosting(false);
      return;
    }

    if (activeCommunityTab === 'collaboration') {
      const title = postTitle.trim() || buildPostTitle(body);
      const roleMatch = body.match(/(?:need|looking for|seeking)\s+([a-z0-9 _-]{3,40})/i);
      const projectMatch = body.match(/(?:for|on)\s+([a-z0-9 _-]{3,40})/i);
      const result = await createCommunityCollaboration({
        authorId: user.id,
        title,
        body,
        roleNeeded: roleMatch?.[1]?.trim() ?? '',
        projectType: projectMatch?.[1]?.trim() ?? '',
      });

      if (result.error) {
        setError(result.error.message);
        setPosting(false);
        return;
      }

      setCollaborations(current => [result.data as CommunityCollaboration, ...current]);
      setPostTitle('');
      setPostBody('');
      setPostComposerOpen(false);
      setPosting(false);
      return;
    }

    const finalBody = forcedTopic ? composeLockedBody(body, forcedTopic).trim() : body;
    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        slug: buildSlug(finalBody),
        title: buildPostTitle(finalBody),
        body: finalBody,
        status: 'published',
      })
      .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code)')
      .single();

    if (insertError) {
      setError(insertError.message);
      setPosting(false);
      return;
    }

    setPosts(current => [data as SocialPost, ...current]);
    setPostBody('');
    setPostComposerOpen(false);
    setPosting(false);
  }

  async function submitQuestionAnswer(event: React.FormEvent<HTMLFormElement>, question: CommunityQuestion) {
    event.preventDefault();
    if (!user || structuredSubmitting || !structuredReplyBody.trim()) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setStructuredSubmitting(true);
    setError('');
    const result = await createQuestionAnswer({
      questionId: question.id,
      authorId: user.id,
      body: structuredReplyBody.trim(),
    });
    if (result.error) {
      setError(result.error.message);
      setStructuredSubmitting(false);
      return;
    }
    const nextAnswer = result.data as CommunityQuestionAnswer;
    setQuestionAnswers(current => ({ ...current, [question.id]: [...(current[question.id] ?? []), nextAnswer] }));
    setQuestions(current => current.map(item => item.id === question.id ? { ...item, answer_count: item.answer_count + 1 } : item));
    setStructuredReplyBody('');
    setStructuredSubmitting(false);
  }

  async function submitCollaborationResponse(event: React.FormEvent<HTMLFormElement>, collaboration: CommunityCollaboration) {
    event.preventDefault();
    if (!user || structuredSubmitting || !structuredReplyBody.trim()) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setStructuredSubmitting(true);
    setError('');
    const result = await createCollaborationResponse({
      collaborationId: collaboration.id,
      authorId: user.id,
      body: structuredReplyBody.trim(),
    });
    if (result.error) {
      setError(result.error.message);
      setStructuredSubmitting(false);
      return;
    }
    const nextResponse = result.data as CommunityCollaborationResponse;
    setCollaborationResponses(current => ({ ...current, [collaboration.id]: [nextResponse, ...(current[collaboration.id] ?? [])] }));
    setStructuredReplyBody('');
    setStructuredSubmitting(false);
  }

  async function voteOnQuestion(question: CommunityQuestion) {
    if (!user || structuredVotingId) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    const existingVotes = questionVotes[question.id] ?? [];
    if (existingVotes.some(vote => vote.profile_id === user.id && vote.question_id === question.id)) return;
    setStructuredVotingId(question.id);
    setError('');
    const result = await addQuestionVote({ profileId: user.id, questionId: question.id });
    if (result.error) {
      setError(result.error.message);
    } else {
      const optimisticVote: CommunityQuestionVote = {
        id: `local-question-${question.id}-${user.id}`,
        question_id: question.id,
        answer_id: null,
        profile_id: user.id,
        value: 1,
      };
      setQuestionVotes(current => ({ ...current, [question.id]: [optimisticVote, ...(current[question.id] ?? [])] }));
      setQuestions(current => current.map(item => item.id === question.id ? { ...item, vote_count: item.vote_count + 1 } : item));
    }
    setStructuredVotingId('');
  }

  async function voteOnAnswer(questionId: string, answer: CommunityQuestionAnswer) {
    if (!user || structuredVotingId) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    const existingVotes = questionVotes[questionId] ?? [];
    if (existingVotes.some(vote => vote.profile_id === user.id && vote.answer_id === answer.id)) return;
    setStructuredVotingId(answer.id);
    setError('');
    const result = await addQuestionVote({ profileId: user.id, answerId: answer.id });
    if (result.error) {
      setError(result.error.message);
    } else {
      const optimisticVote: CommunityQuestionVote = {
        id: `local-answer-${answer.id}-${user.id}`,
        question_id: null,
        answer_id: answer.id,
        profile_id: user.id,
        value: 1,
      };
      setQuestionVotes(current => ({ ...current, [questionId]: [optimisticVote, ...(current[questionId] ?? [])] }));
      setQuestionAnswers(current => ({
        ...current,
        [questionId]: (current[questionId] ?? []).map(item => item.id === answer.id ? { ...item, vote_count: item.vote_count + 1 } : item),
      }));
    }
    setStructuredVotingId('');
  }

  async function acceptAnswer(question: CommunityQuestion, answer: CommunityQuestionAnswer) {
    if (!user || structuredAcceptingId || question.author_id !== user.id) return;
    setStructuredAcceptingId(answer.id);
    setError('');
    const result = await acceptQuestionAnswer({
      questionId: question.id,
      answerId: answer.id,
      ownerId: user.id,
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      setQuestionAnswers(current => ({
        ...current,
        [question.id]: (current[question.id] ?? []).map(item => ({ ...item, is_accepted: item.id === answer.id })),
      }));
      setQuestions(current => current.map(item => item.id === question.id ? { ...item, accepted_answer_id: answer.id, has_accepted_answer: true } : item));
    }
    setStructuredAcceptingId('');
  }

  async function deleteQuestion(question: CommunityQuestion) {
    if (!user || question.author_id !== user.id) return;
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    const result = await deleteCommunityQuestion({ questionId: question.id, ownerId: user.id });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setQuestions(current => current.filter(item => item.id !== question.id));
  }

  async function deleteAnswer(questionId: string, answer: CommunityQuestionAnswer) {
    if (!user || answer.author_id !== user.id) return;
    if (!window.confirm('Delete this answer? This cannot be undone.')) return;
    const result = await deleteQuestionAnswer({ answerId: answer.id, ownerId: user.id });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setQuestionAnswers(current => ({
      ...current,
      [questionId]: (current[questionId] ?? []).filter(item => item.id !== answer.id),
    }));
    setQuestions(current => current.map(item => item.id === questionId ? { ...item, answer_count: Math.max(0, item.answer_count - 1) } : item));
  }

  async function toggleCollaborationStatus(collaboration: CommunityCollaboration) {
    if (!user || collaboration.author_id !== user.id) return;
    const nextStatus = collaboration.status === 'filled' ? 'open' : 'filled';
    const result = await updateCommunityCollaborationStatus({ collaborationId: collaboration.id, ownerId: user.id, status: nextStatus });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setCollaborations(current => current.map(item => item.id === collaboration.id ? { ...item, status: nextStatus } : item));
  }

  async function deleteCollaboration(collaboration: CommunityCollaboration) {
    if (!user || collaboration.author_id !== user.id) return;
    if (!window.confirm('Delete this collaboration post? This cannot be undone.')) return;
    const result = await deleteCommunityCollaboration({ collaborationId: collaboration.id, ownerId: user.id });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setCollaborations(current => current.filter(item => item.id !== collaboration.id));
  }

  async function deleteCollaborationReply(collaborationId: string, response: CommunityCollaborationResponse) {
    if (!user || response.author_id !== user.id) return;
    if (!window.confirm('Delete this response? This cannot be undone.')) return;
    const result = await deleteCollaborationResponse({ responseId: response.id, ownerId: user.id });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setCollaborationResponses(current => ({
      ...current,
      [collaborationId]: (current[collaborationId] ?? []).filter(item => item.id !== response.id),
    }));
  }

  async function toggleLike(post: SocialPost) {
    if (likingId) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setLikingId(post.id);
    setError('');
    const liked = likedIds.has(post.id);
    if (liked) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('profile_id', user.id);
      if (deleteError) setError(deleteError.message);
      else setLikes(current => current.filter(like => !(like.post_id === post.id && like.profile_id === user.id)));
    } else {
      const nextLike: PostLike = {
        post_id: post.id,
        profile_id: user.id,
        profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
      };
      const { error: insertError } = await supabase.from('post_likes').insert({ post_id: post.id, profile_id: user.id });
      if (insertError) setError(insertError.message);
      else setLikes(current => [...current, nextLike]);
    }
    setLikingId('');
  }

  async function deletePost(post: SocialPost) {
    if (!user || post.author_id !== user.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPosts(current => current.filter(p => p.id !== post.id));
  }

  function applyMention(username: string) {
    setPostBody(current => parseLockedBody(replaceTrailingMention(composeLockedBody(current, forcedTopic), username, forcedTopic), forcedTopic));
    setMentionOptions([]);
  }

  return (
    <PageShell>
      <main className="app-page community-app-page">
        <HubHero title={pageCopy.title} copy={pageCopy.copy} actions={communityTools} />

        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

        <form className={postComposerOpen ? 'social-feed-composer social-feed-composer-open' : 'social-feed-composer social-feed-composer-compact'} onSubmit={submitPost}>
            <div className="social-feed-composer-box">
              {postComposerOpen && (activeCommunityTab === 'questions' || activeCommunityTab === 'collaboration') && (
                <input
                  className="os-input-field"
                  value={postTitle}
                  onChange={event => setPostTitle(event.target.value)}
                  placeholder={activeCommunityTab === 'questions' ? 'Question title' : 'Collaboration title'}
                  disabled={!user || posting}
                />
              )}
              <textarea
                value={postComposerValue}
                onChange={event => setPostBody(parseLockedBody(event.target.value, forcedTopic))}
                onFocus={() => requireCommunityAction(() => setPostComposerOpen(true))}
                placeholder={
                  user
                    ? activeCommunityTab === 'questions'
                      ? 'What do you need help with?'
                      : activeCommunityTab === 'collaboration'
                        ? 'Who are you looking for, and what are you building?'
                        : 'Start a new post...'
                    : 'Sign in to post to Community.'
                }
                rows={3}
                disabled={!user || posting}
              />
              {forcedTopic && activeCommunityTab === 'feed' && <div className="social-composer-lock">This post will publish with #{forcedTopic}.</div>}
              {visibleMentionOptions.length > 0 && (
                <div className="social-mention-list">
                  {visibleMentionOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className="social-mention-option"
                      onClick={() => applyMention(option.username || option.display_name || '')}
                    >
                      <SocialAvatar profile={option} />
                      <span className="social-mention-copy">
                        <span className="social-mention-name">{option.display_name || option.username || '44 Member'}</span>
                        {option.username && <span className="social-mention-handle">@{option.username}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {postComposerOpen && <div className="social-feed-composer-actions">
                <button
                  type="button"
                  className="os-button os-button-ghost os-button-compact"
                  onClick={() => {
                    setPostComposerOpen(false);
                    setPostTitle('');
                    setPostBody('');
                    setMentionOptions([]);
                  }}
                >
                  Cancel
                </button>
                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={posting || !postBody.trim()}>
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>}
            </div>
          </form>

        {activeCommunityTab === 'questions' ? (
          <section className="dashboard-list-surface social-feed social-feed-list social-feed-panel" aria-label="Community questions">
            {structuredLoading ? (
              <div className="dashboard-empty">Loading questions...</div>
            ) : structuredRequiresSetup ? (
              <div className="dashboard-empty">Questions needs the reviewed Community SQL applied in Supabase first.</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="dashboard-empty">{query ? 'No Community questions match your search.' : pageCopy.empty}</div>
            ) : (
              filteredQuestions.map(question => (
                <article key={question.id} className="social-feed-post social-structured-clickable" onClick={() => { void openQuestion(question); }}>
                  <div className="social-row social-structured-row">
                    <SocialAvatar profile={question.authors} />
                    <div className="social-row-main">
                      <div className="social-structured-topline">
                        <SocialAuthorLine author={question.authors} createdAt={question.created_at} handleOnly />
                        <div className="social-structured-metrics">
                          <span>{question.vote_count} votes</span>
                          <span>{question.answer_count} answers</span>
                          {question.has_accepted_answer ? <span className="os-status-success">Answered</span> : <span className="os-status-warning">Not answered</span>}
                        </div>
                      </div>
                      <h2 className="social-structured-title">{question.title}</h2>
                      <p className="social-row-body"><SocialRichText text={question.body} /></p>
                      {question.tags.length ? (
                        <div className="social-structured-tags">
                          {question.tags.map(tag => <span key={tag} className="social-structured-tag">#{tag}</span>)}
                        </div>
                      ) : null}
                      <div className="social-structured-actions">
                        <button type="button" className="os-button os-button-ghost os-button-compact" onClick={event => { event.stopPropagation(); requireCommunityAction(() => { void voteOnQuestion(question); }); }} disabled={structuredVotingId === question.id}>
                          Upvote
                        </button>
                        <button type="button" className="os-button os-button-ghost os-button-compact" onClick={event => { event.stopPropagation(); requireCommunityAction(() => { void openQuestion(question); }); }}>
                          View Answers
                        </button>
                        {user && question.author_id === user.id ? (
                          <button type="button" className="os-button os-button-ghost os-button-compact" onClick={event => { event.stopPropagation(); void deleteQuestion(question); }}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                      {openStructuredId === question.id && (
                        <div className="social-structured-thread" onClick={event => event.stopPropagation()}>
                          <form className="social-feed-composer social-feed-composer-open social-structured-composer" onSubmit={event => submitQuestionAnswer(event, question)}>
                            <div className="social-feed-composer-box">
                              <textarea
                                value={structuredReplyBody}
                                onChange={event => setStructuredReplyBody(event.target.value)}
                                placeholder="Write an answer..."
                                rows={3}
                                disabled={structuredSubmitting}
                              />
                              <div className="social-feed-composer-actions">
                                <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => setStructuredReplyBody('')}>
                                  Clear
                                </button>
                                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={structuredSubmitting || !structuredReplyBody.trim()}>
                                  {structuredSubmitting ? 'Posting...' : 'Post Answer'}
                                </button>
                              </div>
                            </div>
                          </form>
                          {(questionAnswers[question.id] ?? []).length ? (
                            <div className="social-structured-list">
                              {[...(questionAnswers[question.id] ?? [])].sort((a, b) => Number(b.is_accepted) - Number(a.is_accepted) || b.vote_count - a.vote_count).map(answer => (
                                <div key={answer.id} className={answer.is_accepted ? 'social-structured-item social-structured-item-accepted' : 'social-structured-item'}>
                                  <div className="social-structured-topline">
                                    <SocialAuthorLine author={answer.authors} createdAt={answer.created_at} handleOnly />
                                    <div className="social-structured-metrics">
                                      <span>{answer.vote_count} votes</span>
                                      {answer.is_accepted ? <span className="os-status-success">Answered</span> : null}
                                    </div>
                                  </div>
                                  <p className="social-row-body"><SocialRichText text={answer.body} /></p>
                                  <div className="social-structured-actions">
                                    <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => requireCommunityAction(() => { void voteOnAnswer(question.id, answer); })} disabled={structuredVotingId === answer.id}>
                                      Upvote
                                    </button>
                                    {user && question.author_id === user.id && !answer.is_accepted ? (
                                      <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => { void acceptAnswer(question, answer); }} disabled={structuredAcceptingId === answer.id}>
                                        Accept
                                      </button>
                                    ) : null}
                                    {user && answer.author_id === user.id ? (
                                      <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => { void deleteAnswer(question.id, answer); }}>
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="social-reply-empty">No answers yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        ) : activeCommunityTab === 'collaboration' ? (
          <section className="dashboard-list-surface social-feed social-feed-list social-feed-panel" aria-label="Community collaboration">
            {structuredLoading ? (
              <div className="dashboard-empty">Loading collaborations...</div>
            ) : structuredRequiresSetup ? (
              <div className="dashboard-empty">Collaboration needs the reviewed Community SQL applied in Supabase first.</div>
            ) : filteredCollaborations.length === 0 ? (
              <div className="dashboard-empty">{query ? 'No Community collaborations match your search.' : pageCopy.empty}</div>
            ) : (
              filteredCollaborations.map(collaboration => (
                <article key={collaboration.id} className="social-feed-post social-structured-clickable" onClick={() => { void openCollaboration(collaboration); }}>
                  <div className="social-row social-structured-row">
                    <SocialAvatar profile={collaboration.authors} />
                    <div className="social-row-main">
                      <div className="social-structured-topline">
                        <SocialAuthorLine author={collaboration.authors} createdAt={collaboration.created_at} handleOnly />
                        <span className={collaboration.status === 'filled' ? 'dashboard-status-pill dashboard-status-pill-success' : 'dashboard-status-pill dashboard-status-pill-warning'}>
                          {collaboration.status === 'filled' ? 'Closed' : 'Open'}
                        </span>
                      </div>
                      <h2 className="social-structured-title">{collaboration.title}</h2>
                      <p className="social-row-body"><SocialRichText text={collaboration.body} /></p>
                      <div className="social-structured-actions">
                        <button type="button" className="os-button os-button-ghost os-button-compact" onClick={event => { event.stopPropagation(); requireCommunityAction(() => { void openCollaboration(collaboration); }); }}>
                          Respond
                        </button>
                        {user && collaboration.author_id === user.id ? (
                          <>
                            <button type="button" className="os-button os-button-ghost os-button-compact" onClick={event => { event.stopPropagation(); void toggleCollaborationStatus(collaboration); }}>
                              {collaboration.status === 'filled' ? 'Reopen' : 'Mark Closed'}
                            </button>
                            <button type="button" className="os-button os-button-ghost os-button-compact" onClick={event => { event.stopPropagation(); void deleteCollaboration(collaboration); }}>
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                      {openStructuredId === collaboration.id && (
                        <div className="social-structured-thread" onClick={event => event.stopPropagation()}>
                          <form className="social-feed-composer social-feed-composer-open social-structured-composer" onSubmit={event => submitCollaborationResponse(event, collaboration)}>
                            <div className="social-feed-composer-box">
                              <textarea
                                value={structuredReplyBody}
                                onChange={event => setStructuredReplyBody(event.target.value)}
                                placeholder="Introduce yourself and explain why you're a fit..."
                                rows={3}
                                disabled={structuredSubmitting}
                              />
                              <div className="social-feed-composer-actions">
                                <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => setStructuredReplyBody('')}>
                                  Clear
                                </button>
                                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={structuredSubmitting || !structuredReplyBody.trim()}>
                                  {structuredSubmitting ? 'Sending...' : 'Send Response'}
                                </button>
                              </div>
                            </div>
                          </form>
                          {(collaborationResponses[collaboration.id] ?? []).length ? (
                            <div className="social-structured-list">
                              {(collaborationResponses[collaboration.id] ?? []).map(response => (
                                <div key={response.id} className="social-structured-item">
                                  <div className="social-structured-topline">
                                    <SocialAuthorLine author={response.authors} createdAt={response.created_at} handleOnly />
                                    {user && response.author_id === user.id ? (
                                      <button type="button" className="os-icon-button" aria-label="Delete response" onClick={() => { void deleteCollaborationReply(collaboration.id, response); }}>
                                        <SocialTrashIcon />
                                      </button>
                                    ) : null}
                                  </div>
                                  <p className="social-row-body"><SocialRichText text={response.body} /></p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="social-reply-empty">No responses yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        ) : (
        <section className="dashboard-list-surface social-feed social-feed-list social-feed-panel" aria-label="Community feed">
          {postsLoading ? (
            <div className="dashboard-empty">Loading posts...</div>
          ) : visiblePosts.length === 0 ? (
            <div className="dashboard-empty">{query ? 'No Community posts match your search.' : pageCopy.empty}</div>
          ) : (
            visiblePosts.map(post => (
              <div key={post.id} className="social-feed-post">
                <SocialPostRow
                  post={post}
                  replyCount={replyCounts[post.id] ?? 0}
                  likeCount={likeCounts[post.id] ?? 0}
                  likers={likersMap[post.id] ?? []}
                  repliers={repliersMap[post.id] ?? []}
                  liked={likedIds.has(post.id)}
                  onLike={() => toggleLike(post)}
                  onDelete={() => deletePost(post)}
                  canDelete={Boolean(user && post.author_id === user.id)}
                  disabled={likingId === post.id}
                />
              </div>
            ))
          )}
        </section>
        )}
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={(
        <PageShell>
          <main className="social-shell">
            <div className="dashboard-empty">Loading community...</div>
          </main>
        </PageShell>
      )}
    >
      <CommunityPageContent />
    </Suspense>
  );
}
