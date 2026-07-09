'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { useCommunityTopbarTabs } from '@/components/CommunityTopbarTabs';
import { OnboardingTip } from '@/components/OnboardingTip';
import { SocialAvatar, SocialProfileRow } from '@/components/Social';
import { useAuth } from '@/lib/useAuth';
import { createOrOpenConversation } from '@/lib/messages';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { authorDisplayName, compactDate, type SocialAuthor } from '@/lib/social';
import { supabase } from '@/lib/supabase';

type Conversation = {
  id: string;
  conversation_key: string;
  updated_at: string;
};

type ConversationMember = {
  conversation_id: string;
  profile_id: string;
  profiles?: SocialAuthor | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  status: string;
  created_at: string;
};

type MessageProfile = Pick<SocialAuthor, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'role' | 'creator_type'>;
type InboxProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

const INBOX_READ_STORAGE_KEY = '44-inbox-read-at';

function getReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(INBOX_READ_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    return {};
  }
}

function setConversationReadAt(conversationId: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INBOX_READ_STORAGE_KEY, JSON.stringify({
    ...getReadMap(),
    [conversationId]: value,
  }));
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageShell><div style={{ minHeight: '40vh' }} /></PageShell>}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [profileState, setProfileState] = useState<InboxProfileState | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState('');
  const [body, setBody] = useState('');
  const [schemaReady, setSchemaReady] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const [readMap, setReadMap] = useState<Record<string, string>>(() => getReadMap());
  const [composing, setComposing] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientProfiles, setRecipientProfiles] = useState<MessageProfile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<MessageProfile | null>(null);

  useCommunityTopbarTabs('messages');

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    loadStudioProfile(activeUserId).then(result => {
      if (alive) setProfileState({ userId: activeUserId, profile: result.profile });
    });
    return () => { alive = false; };
  }, [userId]);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    const userId = user.id;

    const { data: ownMemberships, error: membershipError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', userId);

    if (isMissingRelationError(membershipError)) {
      setSchemaReady(false);
      setConversations([]);
      setMembers([]);
      setMessages([]);
      return;
    }

    const ids = Array.from(new Set(((ownMemberships as Array<{ conversation_id: string }> | null) ?? []).map(row => row.conversation_id)));
    if (ids.length === 0) {
      setConversations([]);
      setMembers([]);
      setMessages([]);
      setSchemaReady(true);
      return;
    }

    const [conversationResult, memberResult, messageResult] = await Promise.all([
      supabase.from('conversations').select('*').in('id', ids).order('updated_at', { ascending: false }),
      supabase
        .from('conversation_members')
        .select('conversation_id, profile_id, profiles:profiles!conversation_members_profile_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)')
        .in('conversation_id', ids),
      supabase.from('messages').select('*').in('conversation_id', ids).order('created_at', { ascending: true }),
    ]);

    if (
      isMissingRelationError(conversationResult.error) ||
      isMissingRelationError(memberResult.error) ||
      isMissingRelationError(messageResult.error)
    ) {
      setSchemaReady(false);
      return;
    }

    const rows = (conversationResult.data as Conversation[] | null) ?? [];
    setConversations(rows);
    setMembers((memberResult.data as ConversationMember[] | null) ?? []);
    setMessages((messageResult.data as Message[] | null) ?? []);
    setSchemaReady(true);

    const requested = searchParams.get('conversation');
    if (requested && rows.some(row => row.id === requested)) {
      setActiveId(requested);
    } else if (!activeId || !rows.some(row => row.id === activeId)) {
      setActiveId(rows[0]?.id ?? '');
    }
  }, [activeId, searchParams, user]);

  useEffect(() => {
    if (!user) return;

    function refreshInbox() {
      loadInbox();
    }

    window.addEventListener('focus', refreshInbox);
    document.addEventListener('visibilitychange', refreshInbox);
    return () => {
      window.removeEventListener('focus', refreshInbox);
      document.removeEventListener('visibilitychange', refreshInbox);
    };
  }, [loadInbox, user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const withProfile = searchParams.get('with');
    if (!withProfile) {
      Promise.resolve().then(() => loadInbox());
      return;
    }
    const targetProfileId = withProfile;

    async function openRequestedConversation() {
      const result = await createOrOpenConversation(userId, targetProfileId);
      if (result.error && isMissingRelationError(result.error)) {
        setSchemaReady(false);
        setComposing(true);
        return;
      }
      router.replace(result.href);
      await loadInbox();
    }

    openRequestedConversation();
  }, [loadInbox, router, searchParams, user]);

  useEffect(() => {
    if (!user || !composing || !recipientQuery.trim()) return;

    let alive = true;
    async function loadRecipients() {
      const query = recipientQuery.trim();
      let request = supabase
        .from('profiles')
        .select('id, slug, username, display_name, avatar_url, role, creator_type')
        .neq('id', user!.id)
        .order('display_name', { ascending: true })
        .limit(12);

      if (query) {
        request = request.or(`display_name.ilike.%${query}%,username.ilike.%${query}%,slug.ilike.%${query}%`);
      }

      const { data } = await request;
      if (alive) setRecipientProfiles((data as MessageProfile[] | null) ?? []);
    }

    loadRecipients();
    return () => { alive = false; };
  }, [composing, recipientQuery, user]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const visibleRecipientProfiles = user && composing && recipientQuery.trim() ? recipientProfiles : [];
  const canInteract = hasCommunityIdentity(profile);
  const activeConversation = conversations.find(row => row.id === activeId) ?? conversations[0] ?? null;
  const activeMessages = activeConversation ? messages.filter(message => message.conversation_id === activeConversation.id) : [];
  const activeConversationId = activeConversation?.id ?? '';
  const latestActiveMessageAt = activeMessages.at(-1)?.created_at ?? '';
  const activeMembers = activeConversation ? members.filter(member => member.conversation_id === activeConversation.id) : [];
  const otherMember = activeMembers.find(member => member.profile_id !== user?.id)?.profiles ?? null;

  const conversationSummaries = useMemo(() => {
    return conversations.map(conversation => {
      const other = members.find(member => member.conversation_id === conversation.id && member.profile_id !== user?.id)?.profiles ?? null;
      const last = [...messages].reverse().find(message => message.conversation_id === conversation.id);
      const readAt = readMap[conversation.id] ? new Date(readMap[conversation.id]).getTime() : 0;
      const unread = messages.some(message => (
        message.conversation_id === conversation.id &&
        message.sender_id !== user?.id &&
        new Date(message.created_at).getTime() > readAt
      ));
      return { conversation, other, last, unread };
    });
  }, [conversations, members, messages, readMap, user]);

  useEffect(() => {
    if (!activeConversationId) return;
    const latest = latestActiveMessageAt || new Date().toISOString();
    setConversationReadAt(activeConversationId, latest);
    Promise.resolve().then(() => setReadMap(getReadMap()));
  }, [activeConversationId, latestActiveMessageAt]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composing && selectedRecipient && user && body.trim() && !sending) {
      if (!canInteract) {
        setSetupGateOpen(true);
        return;
      }
      setSending(true);
      setError('');
      const result = await createOrOpenConversation(user.id, selectedRecipient.id);
      if (result.error && isMissingRelationError(result.error)) {
        setSchemaReady(false);
        setError('Messages need the social SQL enabled in Supabase before conversations can be created.');
        setSending(false);
        return;
      }
      const conversationId = new URL(result.href, window.location.origin).searchParams.get('conversation');
      if (conversationId) {
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            body: body.trim(),
            status: 'sent',
          });
        if (insertError) {
          setError(insertError.message);
          setSending(false);
          return;
        }
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      }
      router.replace(result.href);
      await loadInbox();
      setComposing(false);
      setRecipientQuery('');
      setSelectedRecipient(null);
      setBody('');
      setSending(false);
      return;
    }
    if (!activeConversation || !user || !body.trim() || sending) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setSending(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        body: body.trim(),
        status: 'sent',
      })
      .select('*')
      .single();

    if (isMissingRelationError(insertError)) {
      setSchemaReady(false);
    } else if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setMessages(current => [...current, data as Message]);
      setConversations(current => {
        const updatedAt = new Date().toISOString();
        const next = current.map(conversation => (
          conversation.id === activeConversation.id
            ? { ...conversation, updated_at: updatedAt }
            : conversation
        ));
        next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return next;
      });
      setBody('');
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation.id);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <PageShell>
        <main className="social-shell">
          <div className="app-empty-text">Loading messages...</div>
        </main>
      </PageShell>
    );
  }
  if (!user) {
    return (
      <PageShell>
        <main className="social-shell">
          <div className="app-empty-text">
            Sign in to read and send direct messages.
            <div style={{ marginTop: 18 }}>
              <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="social-shell social-shell-wide">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">Messages</h1>
              <p className="social-title-copy os-type-body">
                Direct conversations with 44 members.
              </p>
            </div>
            <button type="button" className="os-button os-button-primary" onClick={() => setComposing(true)}>
              New Message
            </button>
          </div>
        </header>

        {!canInteract && (
          <div className="dashboard-status dashboard-status-error">
            {communityIdentityMessage()}
          </div>
        )}

        {!schemaReady && (
          <div className="dashboard-status dashboard-status-error">
            Messages need the social SQL enabled in Supabase before live conversations can be created.
          </div>
        )}

          <section className="social-inbox" aria-label="Messages">
            <aside className="social-inbox-list">
              <OnboardingTip id="messages-refresh">
                Messages refresh when you return to this window. Open a profile to start a new conversation.
              </OnboardingTip>
              {composing && (
                <button
                  type="button"
                  className="social-action social-inbox-draft"
                  onClick={() => setComposing(true)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', color: 'inherit' }}
                >
                  <SocialProfileRow
                    profile={selectedRecipient ?? { display_name: 'New Message' }}
                    subtitle={selectedRecipient ? undefined : 'Choose a recipient'}
                  />
                </button>
              )}
              {conversationSummaries.length === 0 ? (
                !composing ? <div className="app-empty-text">No messages yet.</div> : null
              ) : (
                conversationSummaries.map(({ conversation, other, last, unread }) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={unread ? 'social-action social-inbox-unread' : 'social-action'}
                    onClick={() => {
                      setActiveId(conversation.id);
                      if (last?.created_at) {
                        setConversationReadAt(conversation.id, last.created_at);
                        setReadMap(getReadMap());
                      }
                    }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', color: 'inherit' }}
                  >
                    <SocialProfileRow
                      profile={other ?? { display_name: '44 Member' }}
                      subtitle={last ? `${compactDate(last.created_at)} · ${last.body}` : 'No messages yet'}
                      aside={unread ? <span className="social-unread-dot" aria-label="Unread" /> : conversation.id === activeConversation?.id ? <span className="os-pill os-type-pill">Open</span> : null}
                    />
                  </button>
                ))
              )}
            </aside>

            <div className="social-inbox-thread">
              {composing ? (
                <div className="social-compose-panel">
                  <div className="social-compose-to-row">
                    <span className="social-compose-to-label">To:</span>
                    {selectedRecipient ? (
                      <button type="button" className="social-compose-recipient" onClick={() => setSelectedRecipient(null)}>
                        {authorDisplayName(selectedRecipient)} ×
                      </button>
                    ) : (
                      <input
                        className="social-compose-to-input"
                        value={recipientQuery}
                        onChange={event => setRecipientQuery(event.target.value)}
                        placeholder="Name or username"
                        autoFocus
                      />
                    )}
                    <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => {
                      setComposing(false);
                      setSelectedRecipient(null);
                      setRecipientQuery('');
                    }}>
                      Cancel
                    </button>
                  </div>
                  {!selectedRecipient && recipientQuery.trim() && (
                    <div className="social-compose-results">
                    {visibleRecipientProfiles.length === 0 ? (
                      <div className="app-empty-text">No matching people.</div>
                    ) : (
                      visibleRecipientProfiles.map(result => (
                        <button
                          key={result.id}
                          type="button"
                          className="social-compose-result"
                          onClick={() => {
                            setSelectedRecipient(result);
                            setRecipientQuery('');
                          }}
                          disabled={!schemaReady}
                        >
                          <SocialProfileRow
                            profile={result}
                            subtitle={result.creator_type || result.role || '44 member'}
                          />
                        </button>
                      ))
                    )}
                    </div>
                  )}
                  <form className="social-message-form social-message-form-compose" onSubmit={sendMessage}>
                    <textarea
                      className="os-input-textarea"
                      rows={2}
                      value={body}
                      onChange={event => setBody(event.target.value)}
                      placeholder={selectedRecipient ? 'Write a message...' : 'Choose someone to message.'}
                      disabled={sending || !selectedRecipient}
                      style={{ minHeight: 54, flex: 1 }}
                    />
                    <button className="os-button os-button-primary os-button-compact" type="submit" disabled={!body.trim() || sending || !selectedRecipient || !schemaReady}>
                      Send
                    </button>
                  </form>
                </div>
              ) : activeConversation ? (
                <>
                  <div className="social-row" style={{ paddingLeft: 18, paddingRight: 18 }}>
                    <SocialAvatar profile={otherMember} />
                    <div className="social-row-main">
                      <div className="social-author-name">{authorDisplayName(otherMember)}</div>
                      <div className="social-handle">{otherMember?.username ? `@${otherMember.username}` : 'Direct message'}</div>
                    </div>
                  </div>

                  <div className="social-message-list">
                    {activeMessages.length === 0 ? (
                      <div className="app-empty-text">Start the conversation.</div>
                    ) : (
                      activeMessages.map(message => (
                        <div key={message.id} className={message.sender_id === user.id ? 'social-message social-message-own' : 'social-message'}>
                          <div>{message.body}</div>
                          <div className="os-type-meta" style={{ opacity: 0.7, marginTop: 6 }}>{compactDate(message.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <form className="social-message-form" onSubmit={sendMessage}>
                    <textarea
                      className="os-input-textarea"
                      rows={2}
                      value={body}
                      onChange={event => setBody(event.target.value)}
                      placeholder={canInteract ? 'Write a message...' : 'Finish your profile to message.'}
                      disabled={sending}
                      style={{ minHeight: 54, flex: 1 }}
                    />
                    <button className="os-button os-button-primary os-button-compact" type="submit" disabled={!body.trim() || sending}>
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="app-empty-text">Select a conversation.</div>
              )}
              {error && <div className="dashboard-status dashboard-status-error" style={{ margin: 18 }}>{error}</div>}
            </div>
          </section>
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
