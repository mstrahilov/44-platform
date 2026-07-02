'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { CommunityPost, CommunityReply } from '@/lib/platform';
import { PageShell, DetailLayout, DetailRow, CenteredMessage } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';

type ThreadLike = {
  post_id: string;
  profile_id: string;
};

export default function CommunityThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  useTopbarBack({ href: '/community', label: 'Community' });
  const [thread, setThread] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [likes, setLikes] = useState<ThreadLike[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadThread() {
      setLoading(true);

      const selectClause =
        '*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)';
      let post: CommunityPost | null = null;

      const { data: slugMatch } = await supabase
        .from('posts')
        .select(selectClause)
        .eq('slug', id)
        .eq('status', 'published')
        .maybeSingle();

      post = (slugMatch as CommunityPost | null) ?? null;

      if (!post) {
        const { data: idMatch } = await supabase
          .from('posts')
          .select(selectClause)
          .eq('id', id)
          .eq('status', 'published')
          .maybeSingle();

        post = (idMatch as CommunityPost | null) ?? null;
      }

      if (!post) {
        setThread(null);
        setReplies([]);
        setLikes([]);
        setLoading(false);
        return;
      }

      const [{ data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('post_replies')
          .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
          .eq('post_id', post.id)
          .eq('status', 'published')
          .order('created_at', { ascending: true }),
        supabase.from('post_likes').select('post_id, profile_id').eq('post_id', post.id),
      ]);

      setThread(post);
      setReplies((replyRows as CommunityReply[] | null) ?? []);
      setLikes((likeRows as ThreadLike[] | null) ?? []);
      setLoading(false);
    }

    loadThread();
  }, [id]);

  const likedByUser = useMemo(() => {
    if (!user) return false;
    return likes.some(like => like.profile_id === user.id);
  }, [likes, user]);

  async function toggleLike() {
    if (!thread || !user || liking) return;

    setLiking(true);
    setError('');

    if (likedByUser) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', thread.id)
        .eq('profile_id', user.id);

      if (deleteError) {
        setError(deleteError.message);
      } else {
        setLikes(current => current.filter(entry => !(entry.post_id === thread.id && entry.profile_id === user.id)));
      }
    } else {
      const nextLike = { post_id: thread.id, profile_id: user.id };
      const { error: insertError } = await supabase.from('post_likes').insert(nextLike);

      if (insertError) {
        setError(insertError.message);
      } else {
        setLikes(current => [...current, nextLike]);
      }
    }

    setLiking(false);
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread || !user || !replyBody.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    const payload = {
      post_id: thread.id,
      author_id: user.id,
      parent_reply_id: null,
      body: replyBody.trim(),
      status: 'published',
    };

    const { data, error: insertError } = await supabase
      .from('post_replies')
      .insert(payload)
      .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setReplies(current => [...current, data as CommunityReply]);
      setReplyBody('');
    }

    setSubmitting(false);
  }

  if (loading || authLoading) {
    return <PageShell><CenteredMessage>Loading thread…</CenteredMessage></PageShell>;
  }

  if (!thread) {
    return <PageShell><CenteredMessage>Thread not found.</CenteredMessage></PageShell>;
  }

  const author = thread.creators?.name ?? '44 Community';

  return (
    <PageShell>
      <DetailLayout
        inspector={
          <>
            <div>
              <span className="os-pill os-type-pill">{thread.categories?.name ?? thread.post_type ?? 'Discussion'}</span>
            </div>
            <DetailRow label="Author" value={author} />
            <DetailRow
              label="Posted"
              value={new Date(thread.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            />
            <DetailRow label="Replies" value={replies.length} />
            <DetailRow label="Likes" value={likes.length} />
            <hr className="app-detail-divider" />
            <Link className="os-button os-button-secondary os-button-compact" href="/community/browse">
              Back to Community
            </Link>
          </>
        }
      >
        <div className="app-panel" style={{ padding: 'var(--os-space-6, 28px)', display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span className="os-pill os-type-pill">{thread.categories?.name ?? thread.post_type ?? 'Discussion'}</span>
            <span className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
              by {author}
            </span>
            <span className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
              {new Date(thread.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

          <h1 className="os-type-page-title">{thread.title}</h1>

          <div className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {thread.body}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={likedByUser ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-secondary os-button-compact'}
              onClick={toggleLike}
              type="button"
              disabled={!user || liking}
            >
              {likedByUser ? 'Liked' : 'Like'} ({likes.length})
            </button>
            <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
              {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </div>

        <div className="app-panel" style={{ padding: 'var(--os-space-6, 28px)', display: 'grid', gap: 16 }}>
          <div className="app-panel-title os-type-eyebrow">Replies</div>

          {user ? (
            <form onSubmit={submitReply} style={{ display: 'grid', gap: 12 }}>
              <textarea
                className="os-input-textarea"
                rows={5}
                value={replyBody}
                onChange={event => setReplyBody(event.target.value)}
                placeholder="Write your reply…"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
                  Public replies help keep the conversation visible for everyone.
                </div>
                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={submitting || !replyBody.trim()}>
                  {submitting ? 'Posting…' : 'Post Reply'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)' }}>
                Sign in to join the thread.
              </div>
              <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
            </div>
          )}

          {error && (
            <div className="os-type-body-small" style={{ color: 'var(--os-color-error, #ff6b6b)', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {replies.length === 0 ? (
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>No replies yet.</div>
            ) : (
              replies.map(reply => (
                <article key={reply.id} className="app-panel" style={{ padding: '18px 20px', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="os-type-card-title">
                      {reply.authors?.display_name ?? reply.authors?.username ?? 'Member'}
                    </div>
                    <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
                      {new Date(reply.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                    {reply.body}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </DetailLayout>
    </PageShell>
  );
}
