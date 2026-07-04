'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/Ui';
import { SocialProfileRow } from '@/components/Social';
import { useCommunityTopbarTabs } from '@/components/CommunityTopbarTabs';
import { useAuth } from '@/lib/useAuth';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { isMissingRelationError } from '@/lib/schemaCompat';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  loadFriendRequests,
  otherFriendProfile,
  removeFriend,
  type FriendRequestRow,
} from '@/lib/friends';

type FriendsTab = 'friends' | 'requests' | 'sent';

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [requests, setRequests] = useState<FriendRequestRow[]>([]);
  const [tab, setTab] = useState<FriendsTab>('friends');
  const [schemaReady, setSchemaReady] = useState(true);
  const [busyId, setBusyId] = useState('');

  useCommunityTopbarTabs('friends');

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
      const result = await loadFriendRequests(userId);
      if (!result.schemaReady || isMissingRelationError(result.error)) {
        setSchemaReady(false);
        return;
      }

      setRequests(result.rows);
      setSchemaReady(true);
    }
    loadFriends();
  }, [user]);

  const friends = useMemo(() => requests.filter(row => row.status === 'accepted'), [requests]);
  const incoming = useMemo(() => requests.filter(row => row.status === 'pending' && row.addressee_id === user?.id), [requests, user]);
  const sent = useMemo(() => requests.filter(row => row.status === 'pending' && row.requester_id === user?.id), [requests, user]);

  async function acceptRequest(row: FriendRequestRow) {
    setBusyId(row.id);
    const { data } = await acceptFriendRequest(row.id);
    setRequests(current => current.map(item => item.id === row.id ? { ...item, ...((data as FriendRequestRow | null) ?? {}), status: 'accepted' } : item));
    setBusyId('');
  }

  async function cancelRequest(row: FriendRequestRow) {
    setBusyId(row.id);
    await cancelFriendRequest(row.id);
    setRequests(current => current.filter(item => item.id !== row.id));
    setBusyId('');
  }

  async function removeRequest(row: FriendRequestRow) {
    setBusyId(row.id);
    await removeFriend(row.id);
    setRequests(current => current.filter(item => item.id !== row.id));
    setBusyId('');
  }

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
            Sign in to see friends and friend requests.
            <div style={{ marginTop: 18 }}>
              <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  const tabs = [
    { id: 'friends' as const, label: 'Friends', count: friends.length },
    { id: 'requests' as const, label: 'Requests', count: incoming.length },
    { id: 'sent' as const, label: 'Sent', count: sent.length },
  ];
  const visible = tab === 'friends' ? friends : tab === 'requests' ? incoming : sent;

  return (
    <PageShell>
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">Friends</h1>
              <p className="social-title-copy os-type-body">
                Manage private 44 friendships and requests.
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
          <div className="app-empty-text">Friends are ready in the app. Run the social SQL to enable friend requests in Supabase.</div>
        ) : (
          <section className="social-feed" aria-label={tab}>
            {visible.length === 0 ? (
              <div className="app-empty-text">No {tab === 'friends' ? 'friends' : tab === 'requests' ? 'friend requests' : 'sent requests'} yet.</div>
            ) : (
              visible.map(row => {
                const person = otherFriendProfile(row, user.id);
                if (!person) return null;
                return (
                  <SocialProfileRow
                    key={row.id}
                    profile={person}
                    subtitle={tab === 'friends' ? 'Friend' : tab === 'requests' ? 'Wants to be friends' : 'Request sent'}
                    aside={
                      tab === 'requests' ? (
                        <div className="social-inline-actions">
                          <button className="os-button os-button-primary os-button-compact" type="button" onClick={() => acceptRequest(row)} disabled={busyId === row.id}>Accept</button>
                          <button className="os-button os-button-secondary os-button-compact" type="button" onClick={() => cancelRequest(row)} disabled={busyId === row.id}>Dismiss</button>
                        </div>
                      ) : tab === 'sent' ? (
                        <button className="os-button os-button-secondary os-button-compact" type="button" onClick={() => cancelRequest(row)} disabled={busyId === row.id}>Cancel</button>
                      ) : (
                        <button className="os-button os-button-secondary os-button-compact" type="button" onClick={() => removeRequest(row)} disabled={busyId === row.id}>Remove</button>
                      )
                    }
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
