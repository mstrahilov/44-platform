'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { SocialPostRow } from '@/components/Social';
import {
  countById,
  likersByPost,
  repliersByPost,
  type LikeRow,
  type LikersMap,
  type ReplyEngagerRow,
  type SocialPost,
  type SubjectType,
} from '@/lib/social';

type Props = {
  subjectType: SubjectType;
  subjectId: string;
  subjectLabel: string;
  categorySlugs: string[];        // e.g. ['reviews'] or ['questions'] or ['updates']
  sectionTitle: string;           // e.g. 'Reviews', 'Questions', 'Updates'
  actionLabel: string;            // e.g. 'Post Review', 'Ask a Question', 'Post Update'
  composerPlaceholder?: string;   // body placeholder text
  titlePlaceholder?: string;      // title placeholder text
  emptyMessage: string;
  canPost?: boolean;              // gate the composer (e.g. only album creator can Post Update)
  showAction?: boolean;           // hide composer entirely if false
};

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export function ItemCommunitySection({
  subjectType,
  subjectId,
  subjectLabel: _subjectLabel,
  categorySlugs,
  sectionTitle,
  actionLabel,
  composerPlaceholder = 'Share your thoughts…',
  titlePlaceholder = 'Add a headline',
  emptyMessage,
  canPost = true,
  showAction = true,
}: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [postType, setPostType] = useState<string>(categorySlugs[0] ?? 'discussion');
  const [error, setError] = useState('');

  // Composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  useEffect(() => {
    async function loadCategory() {
      const { data } = await supabase
        .from('categories')
        .select('id, slug')
        .eq('scope', 'posts')
        .in('slug', categorySlugs)
        .limit(1);
      const row = (data as Array<{ id: string; slug: string }> | null)?.[0];
      if (row) { setCategoryId(row.id); setPostType(row.slug); }
    }
    loadCategory();
  }, [categorySlugs.join(',')]);

  async function fetchTagged() {
    const { data: tagRows } = await supabase
      .from('post_subjects')
      .select('post_id')
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId);
    const postIds = ((tagRows as Array<{ post_id: string }> | null) ?? []).map(row => row.post_id);
    if (postIds.length === 0) {
      setPosts([]); setReplyCounts({}); setRepliersMap({}); setLikes([]);
      return;
    }
    const [postRes, replyRes, likeRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories!inner(id, slug, name)')
        .in('id', postIds)
        .eq('status', 'published')
        .in('categories.slug', categorySlugs)
        .order('created_at', { ascending: false }),
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
    ]);
    setPosts((postRes.data as SocialPost[] | null) ?? []);
    const replies = (replyRes.data as ReplyEngagerRow[] | null) ?? [];
    setReplyCounts(countById(replies, 'post_id'));
    setRepliersMap(repliersByPost(replies));
    setLikes((likeRes.data as LikeRow[] | null) ?? []);
  }

  useEffect(() => {
    fetchTagged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectType, subjectId, categorySlugs.join(',')]);

  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap: LikersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);

  const canInteract = hasCommunityIdentity(profile);

  async function submitInline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    if (!canInteract) { setError(communityIdentityMessage()); return; }
    if (!title.trim() || !body.trim()) { setError('Add a headline and a message.'); return; }
    if (!categoryId) { setError('Category not loaded yet — try again.'); return; }

    setSaving(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category_id: categoryId,
        slug: buildSlug(title),
        title: title.trim(),
        body: body.trim(),
        post_type: postType,
        status: 'published',
      })
      .select('id')
      .single();

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const created = data as { id: string } | null;
    if (created) {
      const { error: tagError } = await supabase.from('post_subjects').insert({
        post_id: created.id,
        subject_type: subjectType,
        subject_id: subjectId,
      });
      if (tagError) {
        setSaving(false);
        setError(`Post saved, but tagging failed: ${tagError.message}`);
        return;
      }
    }

    setSaving(false);
    setTitle('');
    setBody('');
    fetchTagged();
  }

  async function toggleLike(post: SocialPost) {
    if (!user) return;
    const liked = likedIds.has(post.id);
    if (liked) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('profile_id', user.id);
      if (deleteError) { setError(deleteError.message); return; }
      setLikes(current => current.filter(row => !(row.post_id === post.id && row.profile_id === user.id)));
    } else {
      const { error: insertError } = await supabase.from('post_likes').insert({ post_id: post.id, profile_id: user.id });
      if (insertError) { setError(insertError.message); return; }
      setLikes(current => [...current, { post_id: post.id, profile_id: user.id, profiles: null }]);
    }
  }

  async function deletePost(post: SocialPost) {
    if (!user || post.author_id !== user.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
    if (deleteError) { setError(deleteError.message); return; }
    setPosts(current => current.filter(p => p.id !== post.id));
  }

  const composerVisible = showAction && canPost && user;

  return (
    <div className="view-section">
      <h2 className="view-section-title" style={{ marginBottom: 16 }}>{sectionTitle}</h2>

      {composerVisible && (
        <form className="item-community-composer" onSubmit={submitInline}>
          <input
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={titlePlaceholder}
            className="item-community-composer-title"
            disabled={!canInteract || saving}
          />
          <textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            placeholder={composerPlaceholder}
            className="item-community-composer-body"
            rows={3}
            disabled={!canInteract || saving}
          />
          <div className="item-community-composer-actions">
            <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
              {canInteract ? 'Posts here also show on the community feed.' : 'Finish your community profile to post.'}
            </div>
            <button
              type="submit"
              className="os-button os-button-primary os-button-compact"
              disabled={!canInteract || saving || !title.trim() || !body.trim()}
            >
              {saving ? 'Posting…' : actionLabel}
            </button>
          </div>
        </form>
      )}

      {error && <div className="dashboard-status dashboard-status-error" style={{ marginTop: 12 }}>{error}</div>}

      {posts.length === 0 ? (
        <div className="app-empty-text" style={{ marginTop: 12 }}>{emptyMessage}</div>
      ) : (
        <div className="social-feed" style={{ marginTop: composerVisible ? 20 : 0 }}>
          {posts.map(post => (
            <SocialPostRow
              key={post.id}
              post={post}
              replyCount={replyCounts[post.id] ?? 0}
              likeCount={likeCounts[post.id] ?? 0}
              likers={likersMap[post.id] ?? []}
              repliers={repliersMap[post.id] ?? []}
              liked={likedIds.has(post.id)}
              onLike={() => toggleLike(post)}
              onDelete={() => deletePost(post)}
              canDelete={Boolean(user && post.author_id === user.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
