'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/Ui';
import { SocialProfileRow } from '@/components/Social';
import { useAuth } from '@/lib/useAuth';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { supabase } from '@/lib/supabase';
import type { SocialAuthor } from '@/lib/social';

type FollowWithProfiles = {
  follower_id: string;
  following_id: string;
  follower?: SocialAuthor | null;
  following?: SocialAuthor | null;
};

type FriendsTab = 'mutuals' | 'following' | 'followers';

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [following, setFollowing] = useState<FollowWithProfiles[]>([]);
  const [followers, setFollowers] = useState<FollowWithProfiles[]>([]);
  const [tab, setTab] = useState<FriendsTab>('mutuals');
  const [schemaReady, setSchemaReady] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function loadFriends() {
      const [followingResult, followerResult] = await Promise.all([
        supabase
          .from('profile_follows')
          .select('follower_id, following_id, following:profiles!profile_follows_following_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)')
          .eq('follower_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('profile_follows')
          .select('follower_id, following_id, follower:profiles!profile_follows_follower_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)')
          .eq('following_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (isMissingRelationError(followingResult.error) || isMissingRelationError(followerResult.error)) {
        setSchemaReady(false);
        return;
      }

      setFollowing((followingResult.data as FollowWithProfiles[] | null) ?? []);
      setFollowers((followerResult.data as FollowWithProfiles[] | null) ?? []);
      setSchemaReady(true);
    }
    loadFriends();
  }, [user]);

  const mutuals = useMemo(() => {
    const followingIds = new Set(following.map(row => row.following_id));
    return followers.filter(row => followingIds.has(row.follower_id));
  }, [followers, following]);

  if (loading) {
    return (
      <PageShell>
        <main className="social-shell">
          <div className="app-empty-text">Loading friends...</div>
        </main>
      </PageShell>
    );
  }
  if (!user) {
    return (
      <PageShell>
        <main className="social-shell">
          <div className="app-empty-text">
            Sign in to see friends, followers, and mutual connections.
            <div style={{ marginTop: 18 }}>
              <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  const tabs = [
    { id: 'mutuals' as const, label: 'Friends', count: mutuals.length },
    { id: 'following' as const, label: 'Following', count: following.length },
    { id: 'followers' as const, label: 'Followers', count: followers.length },
  ];
  const visible = tab === 'mutuals' ? mutuals : tab === 'following' ? following : followers;

  return (
    <PageShell>
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">Friends</h1>
              <p className="social-title-copy os-type-body">
                Follow members, build mutual connections, and keep your 44 social graph close.
              </p>
            </div>
          </div>
          <nav className="social-tabs" aria-label="Friends sections">
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-ghost os-button-compact'}
                onClick={() => setTab(item.id)}
              >
                {item.label} · {item.count}
              </button>
            ))}
          </nav>
        </header>

        {!hasCommunityIdentity(profile) && (
          <div className="dashboard-status dashboard-status-error">
            {communityIdentityMessage()}
          </div>
        )}

        {!schemaReady ? (
          <div className="app-empty-text">Friends are ready in the app. Run the social SQL to enable follows in Supabase.</div>
        ) : (
          <section className="social-feed" aria-label={tab}>
            {visible.length === 0 ? (
              <div className="app-empty-text">No {tab === 'mutuals' ? 'friends' : tab} yet.</div>
            ) : (
              visible.map(row => {
                const person = tab === 'following' ? row.following : row.follower;
                if (!person) return null;
                return (
                  <SocialProfileRow
                    key={`${row.follower_id}-${row.following_id}`}
                    profile={person}
                    subtitle={tab === 'mutuals' ? 'Mutual connection' : tab === 'following' ? 'You follow this member' : 'Follows you'}
                  />
                );
              })
            )}
          </section>
        )}
      </main>
    </PageShell>
  );
}
