'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';

const ACCOUNT_KEYS = {
  replies: '44-setting-replies',
  likes: '44-setting-likes',
  releases: '44-setting-releases',
  orders: '44-setting-orders',
  emails: '44-setting-emails',
  publicProfile: '44-setting-public-profile',
  publicLibrary: '44-setting-public-library',
  directMessages: '44-setting-direct-messages',
  recommendations: '44-setting-recommendations',
} as const;

type AccountTabId = 'account' | 'privacy' | 'orders' | 'notifications';

const ACCOUNT_TABS: Array<{ id: AccountTabId; label: string; copy: string }> = [
  { id: 'account', label: 'Account', copy: 'Manage your profile, email, password, and account access.' },
  { id: 'privacy', label: 'Privacy & Security', copy: 'Control visibility, messaging, and account protection.' },
  { id: 'orders', label: 'Orders', copy: 'Purchase history, billing records, albums, books, assets, and merch orders.' },
  { id: 'notifications', label: 'Notifications', copy: 'Choose which account activity should reach you.' },
];

function getStoredToggle(key: string, fallback = false) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
}

function setStoredToggle(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, String(value));
}

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export default function AccountPage() {
  return (
    <Suspense fallback={<PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as AccountTabId | null;
  const initialTab = ACCOUNT_TABS.some(tab => tab.id === requestedTab) ? requestedTab! : 'account';
  const [activeTab, setActiveTab] = useState<AccountTabId>(initialTab);
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (ACCOUNT_TABS.some(tab => tab.id === requestedTab)) {
      setActiveTab(requestedTab!);
    } else {
      setActiveTab('account');
    }
  }, [requestedTab]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    async function loadAccount(userId: string) {
      setProfileLoading(true);
      const { profile: nextProfile } = await loadStudioProfile(userId);
      setProfile(nextProfile);
      setUsername(nextProfile?.username ?? '');
      setAvatarUrl(nextProfile?.avatar_url ?? '');
      setBio(nextProfile?.bio ?? '');
      setProfileLoading(false);
    }

    loadAccount(user.id);
  }, [loading, router, user]);

  useTopbarTabs(
    ACCOUNT_TABS.map(tab => ({
      id: tab.id,
      label: tab.label,
      href: tab.id === 'account' ? '/account' : `/account?tab=${tab.id}`,
      active: tab.id === activeTab,
    })),
  );

  if (loading || profileLoading) {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
  }

  if (!user) {
    return <PageShell><CenteredMessage>Opening login...</CenteredMessage></PageShell>;
  }

  const activeMeta = ACCOUNT_TABS.find(tab => tab.id === activeTab) ?? ACCOUNT_TABS[0];

  async function saveCommunityProfile() {
    if (!user || saving) return;
    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername) {
      setStatus('Choose a username with letters or numbers.');
      return;
    }
    if (!avatarUrl.trim()) {
      setStatus('Add a profile photo before joining community conversations.');
      return;
    }

    setSaving(true);
    setStatus('');
    const displayName = profile?.display_name || cleanUsername;
    const { error } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        slug: slugify(profile?.slug || cleanUsername) || cleanUsername.replace(/_/g, '-'),
        display_name: displayName,
        avatar_url: avatarUrl.trim(),
        bio: bio.trim() || null,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setStatus(error.message.includes('duplicate') ? 'That username is already taken.' : error.message);
      return;
    }

    const { profile: nextProfile } = await loadStudioProfile(user.id);
    setProfile(nextProfile);
    setStatus('Account profile saved.');
  }

  async function sendPasswordReset() {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/account`,
    });
    setSendingReset(false);
    setStatus(error ? error.message : 'Password reset email sent.');
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Account" copy={activeMeta.copy} />

        {activeTab === 'account' && (
          <div className="settings-section">
            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-field-title">Profile</div>
                <p className="os-type-body-small">Your account identity across 44OS.</p>
              </div>
              <UploadField
                label="Profile Photo"
                folder="profiles/avatars"
                userId={user.id}
                value={avatarUrl}
                accept="image/*"
                buttonLabel="Upload photo"
                onChange={setAvatarUrl}
              />
              <label className="dashboard-field">
                <div className="dashboard-field-label">Username</div>
                <input className="os-input-field" value={username} onChange={event => setUsername(normalizeUsername(event.target.value))} placeholder="username" />
              </label>
              <label className="dashboard-field">
                <div className="dashboard-field-label">Bio</div>
                <textarea className="os-input-textarea" rows={4} value={bio} onChange={event => setBio(event.target.value)} placeholder="A short note for your profile." />
              </label>
              <div>
                <button className="os-button os-button-primary" type="button" onClick={() => void saveCommunityProfile()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-field-title">Email</div>
                <p className="os-type-body-small">Your login and account recovery email.</p>
              </div>
              <span className="os-type-body">{user.email ?? 'No email on file.'}</span>
            </div>

            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-field-title">Password</div>
                <p className="os-type-body-small">Send yourself a password reset email.</p>
              </div>
              <button className="os-button os-button-secondary" type="button" onClick={sendPasswordReset} disabled={sendingReset}>
                {sendingReset ? 'Sending...' : 'Send Password Reset'}
              </button>
            </div>

            {status && (
              <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                {status}
              </span>
            )}
          </div>
        )}

        {activeTab === 'privacy' && <PrivacySecuritySettings />}
        {activeTab === 'orders' && <OrdersSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
      </main>
    </PageShell>
  );
}

function ToggleRow({
  title,
  desc,
  storageKey,
  defaultOn = false,
}: {
  title: string;
  desc: string;
  storageKey: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    Promise.resolve().then(() => setOn(getStoredToggle(storageKey, defaultOn)));
  }, [storageKey, defaultOn]);

  function toggle() {
    setOn(current => {
      const next = !current;
      setStoredToggle(storageKey, next);
      return next;
    });
  }

  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <div className="os-type-card-title">{title}</div>
        <p className="os-type-body-small">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        className={on ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
        onClick={toggle}
      />
    </div>
  );
}

function PrivacySecuritySettings() {
  return (
    <div className="settings-section settings-section-wide">
      <div>
        <ToggleRow storageKey={ACCOUNT_KEYS.publicProfile} title="Public profile" desc="Let others view your profile and activity." defaultOn />
        <ToggleRow storageKey={ACCOUNT_KEYS.publicLibrary} title="Show library publicly" desc="Display items you own on your profile." />
        <ToggleRow storageKey={ACCOUNT_KEYS.directMessages} title="Allow direct messages" desc="Let members message you directly." defaultOn />
        <ToggleRow storageKey={ACCOUNT_KEYS.recommendations} title="Personalized recommendations" desc="Use your activity to tailor what you see." defaultOn />
        <ToggleRow storageKey="44-setting-2fa" title="Two-factor authentication" desc="Add an extra layer of security with a verification code." />
        <ToggleRow storageKey="44-setting-sessions" title="Active sessions" desc="Manage devices that are currently signed in." />
        <ToggleRow storageKey="44-setting-trusted" title="Trusted devices" desc="Skip 2FA on devices you trust." />
      </div>
    </div>
  );
}

function OrdersSettings() {
  return (
    <div className="settings-section">
      <section className="dashboard-list-surface" style={{ padding: 'var(--os-space-6)' }}>
        <div className="app-empty-text">Order and billing history will appear here.</div>
      </section>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="settings-section settings-section-wide">
      <div>
        <ToggleRow storageKey={ACCOUNT_KEYS.replies} title="Replies to your posts" desc="When someone replies in the community." defaultOn />
        <ToggleRow storageKey={ACCOUNT_KEYS.likes} title="Likes" desc="When someone likes your post or reply." defaultOn />
        <ToggleRow storageKey={ACCOUNT_KEYS.releases} title="New releases from creators you follow" desc="Music, books, assets, resources, and merch drops." defaultOn />
        <ToggleRow storageKey={ACCOUNT_KEYS.orders} title="Order updates" desc="Receipts, downloads, and delivery status." defaultOn />
        <ToggleRow storageKey={ACCOUNT_KEYS.emails} title="44 emails" desc="Occasional news about 44." />
      </div>
    </div>
  );
}
