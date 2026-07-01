'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SystemPanel } from '@/components/SystemPanel';
import { useAuth } from '@/lib/useAuth';
import type { StudioProfile } from '@/lib/studioProfiles';
import { isCreatorProfile } from '@/lib/studioProfiles';

const MEMBER_TABS = [
  { id: 'about', label: 'About' },
  { id: 'posts', label: 'Posts' },
];

const CREATOR_TABS = [
  { id: 'about', label: 'About' },
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'resources', label: 'Resources' },
  { id: 'posts', label: 'Posts' },
];

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, role, slug, avatar_url, bio, creator_type')
        .eq('username', username)
        .maybeSingle();

      setProfile((data as StudioProfile | null) ?? null);
      setLoading(false);
    }

    loadProfile();
  }, [username]);

  if (loading) return <div className="panel-scroll" />;
  if (!profile) {
    return (
      <div className="panel-scroll">
        <div style={{ padding: 40 }}>
          <h2 className="os-type-panel-title">User not found</h2>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
            No profile matches the username &ldquo;{username}&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  const isOwn = user?.id === profile.id;
  const isCreator = isCreatorProfile(profile);
  const baseTabs = isCreator ? CREATOR_TABS : MEMBER_TABS;
  const tabs = isOwn ? [...baseTabs, { id: 'edit', label: 'Edit Profile' }] : baseTabs;
  const displayName = profile.display_name || profile.username || 'Member';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={tabs} avatar={initials}>
        {tab => (
          <>
            {tab === 'about' && (
              <div className="settings-section">
                <div className="settings-block">
                  <h2 className="os-type-panel-title">{displayName}</h2>
                  <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                    @{profile.username}
                    {isCreator && (
                      <span style={{ marginLeft: 10 }} className="os-pill os-type-pill">Creator</span>
                    )}
                  </p>
                </div>

                {profile.bio && (
                  <div className="settings-block">
                    <div className="os-type-card-title">Bio</div>
                    <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 6 }}>
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="settings-block">
                  <div className="os-type-card-title">Member Info</div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
                      Role: {profile.role}
                    </div>
                    {profile.creator_type && (
                      <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
                        Creator type: {profile.creator_type}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {tab === 'products' && (
              <Placeholder title="Products" body="Products by this creator will appear here." />
            )}
            {tab === 'services' && (
              <Placeholder title="Services" body="Services offered by this creator will appear here." />
            )}
            {tab === 'resources' && (
              <Placeholder title="Resources" body="Resources shared by this creator will appear here." />
            )}
            {tab === 'posts' && (
              <Placeholder title="Posts" body="Community posts by this user will appear here." />
            )}
            {tab === 'edit' && isOwn && (
              <Placeholder title="Edit Profile" body="Profile editing will be available here." />
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>{title}</h2>
      <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>{body}</p>
    </div>
  );
}
