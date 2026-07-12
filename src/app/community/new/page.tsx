'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

function buildPostTitle(body: string) {
  const cleanBody = body.trim().replace(/\s+/g, ' ');
  return cleanBody.slice(0, 72) || 'New post';
}

function buildSlug(body: string) {
  const base = normalizeTaxonomyValue(buildPostTitle(body)) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewCommunityThreadPage() {
  return (
    <Suspense fallback={<PageShell><div style={{ minHeight: '40vh' }} /></PageShell>}>
      <NewCommunityThreadContent />
    </Suspense>
  );
}

function NewCommunityThreadContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [body, setBody] = useState('');
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  const bodyHint = useMemo(
    () => 'Use @username in the message when you want to mention someone.',
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!hasCommunityIdentity(profile)) {
      setSetupGateOpen(true);
      return;
    }
    if (!body.trim()) {
      setError('Please add a message.');
      return;
    }

    setSaving(true);
    setError('');

    const slug = buildSlug(body);
    const { data, error: insertError } = await supabase.rpc('create_content_discussion', {
      discussion_title: buildPostTitle(body),
      discussion_body: body.trim(),
      discussion_slug: slug,
      target_item_id: undefined,
    });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setSaving(false);
    router.push(`/community/thread/${slug || data}`);
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">New Post</h1>
          </div>
          <Link href="/community" className="os-button os-button-secondary os-button-compact">Back</Link>
        </div>

        <div className="dashboard-list-surface" style={{ padding: 'var(--os-space-6, 28px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Message</div>
              <textarea
                className="os-input-textarea"
                rows={10}
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Share the thought, question, or idea."
                style={{ minHeight: 200 }}
              />
            </label>
            <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              {bodyHint}
            </div>

            {error && (
              <div className="dashboard-status dashboard-status-error">
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {saving ? 'Posting…' : 'Publish Post'}
              </button>
              <Link className="os-button os-button-ghost" href="/community">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
