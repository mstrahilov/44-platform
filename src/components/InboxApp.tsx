'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import { SocialAvatar, SocialProfileRow } from '@/components/Social';
import { useTopbarBack, useTopbarOverflow, useTopbarTitle, type TopbarOverflowAction } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import {
  createOrOpenConversation,
  directMessageError,
  archiveConversation,
  loadConversationMessages,
  loadInboxConversation,
  loadInboxData,
  markConversationRead,
  searchMessageRecipients,
  sendDirectMessage,
  type InboxConversation,
  type InboxConversationMember,
  type InboxMessage,
  type MessagePageCursor,
  type MessageRecipient,
} from '@/lib/messages';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { authorDisplayName, compactDate } from '@/lib/social';
import { OS44Button } from '@/components/OS44Button';

type Conversation = InboxConversation;
type ConversationMember = InboxConversationMember;
type Message = InboxMessage;
type MessageProfile = MessageRecipient;
type InboxProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

function MessageSendGlyph() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 12V4.5M4.75 7.5 8 4.25l3.25 3.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MessagesPage({ conversationId }: { conversationId?: string }) {
  return (
    <Suspense fallback={<PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>}>
      <MessagesContent conversationId={conversationId} />
    </Suspense>
  );
}

function MessagesContent({ conversationId: routeConversationId }: { conversationId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [profileState, setProfileState] = useState<InboxProfileState | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadConversationId, setThreadConversationId] = useState('');
  const [activeId, setActiveId] = useState('');
  const [inboxNextCursor, setInboxNextCursor] = useState<MessagePageCursor | null>(null);
  const [loadingMoreInbox, setLoadingMoreInbox] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [threadNextCursor, setThreadNextCursor] = useState<MessagePageCursor | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [body, setBody] = useState('');
  const [schemaReady, setSchemaReady] = useState(true);
  const [sending, setSending] = useState(false);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [archivingConversation, setArchivingConversation] = useState(false);
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const composeRoute = routeConversationId === 'new';
  const [composing, setComposing] = useState(composeRoute);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientProfiles, setRecipientProfiles] = useState<MessageProfile[]>([]);
  const [recipientSearchState, setRecipientSearchState] = useState<'idle' | 'searching' | 'results' | 'failed'>('idle');
  const [selectedRecipient, setSelectedRecipient] = useState<MessageProfile | null>(null);
  const [inboxError, setInboxError] = useState('');
  const [mobileListOpen, setMobileListOpen] = useState(!routeConversationId);
  const messageListRef = useRef<HTMLDivElement>(null);
  const standaloneConversation = Boolean(routeConversationId);

  useTopbarBack(standaloneConversation || !mobileListOpen ? { href: '/inbox', label: 'Messages' } : undefined);

  useEffect(() => {
    const conversation = searchParams.get('conversation');
    const withProfile = searchParams.get('with');
    const compose = searchParams.get('compose');
    Promise.resolve().then(() => {
      if (routeConversationId) {
        setComposing(composeRoute);
        setMobileListOpen(false);
        return;
      }

      if (conversation) {
        router.replace(`/conversation/${conversation}`);
        return;
      }

      if (compose === 'new') {
        router.replace('/conversation/new');
        return;
      }

      if (!conversation && !withProfile) {
        setComposing(false);
        setMobileListOpen(true);
      }
    });
  }, [composeRoute, routeConversationId, router, searchParams]);

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
    setInboxLoading(true);

    let result;
    try {
      result = await loadInboxData(userId);
    } catch (loadError) {
      if (isMissingRelationError(loadError as { message?: string | null; code?: string | null })) setSchemaReady(false);
      setInboxError(directMessageError(loadError as { message?: string }));
      setInboxLoading(false);
      return;
    }
    const rows = result.conversations;
    setConversations(rows);
    setMembers(result.members);
    setMessages(result.messages);
    setInboxNextCursor(result.nextCursor);
    setSchemaReady(true);
    setInboxError('');

    const requested = routeConversationId ?? searchParams.get('conversation');
    if (requested && rows.some(row => row.id === requested)) {
      setActiveId(requested);
      setMobileListOpen(false);
    } else if (requested && requested !== 'new') {
      try {
        const direct = await loadInboxConversation(userId, requested);
        if (direct) {
          setConversations(current => current.some(row => row.id === direct.conversation.id) ? current : [direct.conversation, ...current]);
          setMembers(current => [...current.filter(member => member.conversation_id !== requested), ...direct.members]);
          setMessages(current => [...current.filter(message => message.conversation_id !== requested), ...direct.messages]);
          setActiveId(requested);
          setMobileListOpen(false);
        } else {
          setInboxError('Conversation unavailable. It may have been archived or removed.');
        }
      } catch (loadError) {
        setInboxError(directMessageError(loadError as { message?: string }));
      }
    } else if (!activeId || !rows.some(row => row.id === activeId)) {
      setActiveId(rows[0]?.id ?? '');
    }
    setInboxLoading(false);
  }, [activeId, routeConversationId, searchParams, user]);

  const loadMoreInbox = useCallback(async () => {
    if (!user || inboxNextCursor === null || loadingMoreInbox) return;
    setLoadingMoreInbox(true);
    setInboxError('');
    try {
      const page = await loadInboxData(user.id, inboxNextCursor);
      setConversations(current => [...current, ...page.conversations.filter(row => !current.some(existing => existing.id === row.id))]);
      setMembers(current => [...current.filter(member => !page.members.some(next => next.conversation_id === member.conversation_id && next.profile_id === member.profile_id)), ...page.members]);
      setMessages(current => [...current.filter(message => !page.messages.some(next => next.conversation_id === message.conversation_id)), ...page.messages]);
      setInboxNextCursor(page.nextCursor);
    } catch (loadError) {
      setInboxError(directMessageError(loadError as { message?: string }));
    } finally {
      setLoadingMoreInbox(false);
    }
  }, [inboxNextCursor, loadingMoreInbox, user]);

  useEffect(() => {
    if (!user) return;

    function refreshInbox() {
      if (document.visibilityState === 'visible') void loadInbox();
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
      if (result.error) {
        if (isMissingRelationError(result.error)) setSchemaReady(false);
        setInboxError(directMessageError(result.error));
        return;
      }
      setMobileListOpen(false);
      router.replace(result.href);
      await loadInbox();
    }

    openRequestedConversation();
  }, [loadInbox, router, searchParams, user]);

  useEffect(() => {
    const query = recipientQuery.trim();
    if (!user || !composing || !query) {
      setRecipientProfiles([]);
      setRecipientSearchState('idle');
      return;
    }

    let alive = true;
    setRecipientProfiles([]);
    setRecipientSearchState('searching');
    const timeout = window.setTimeout(async () => {
      try {
        const rows = await searchMessageRecipients(user.id, query);
        if (alive) {
          setRecipientProfiles(rows);
          setRecipientSearchState('results');
        }
      } catch (recipientError) {
        if (alive) {
          setInboxError(directMessageError(recipientError as { message?: string }));
          setRecipientSearchState('failed');
        }
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timeout);
    };
  }, [composing, recipientQuery, user]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const visibleRecipientProfiles = user && composing && recipientQuery.trim() ? recipientProfiles : [];
  const canInteract = hasCommunityIdentity(profile);
  const activeConversation = routeConversationId
    ? conversations.find(row => row.id === routeConversationId) ?? null
    : conversations.find(row => row.id === activeId) ?? conversations[0] ?? null;
  const activeMessages = threadConversationId === activeConversation?.id ? threadMessages : [];
  const activeConversationId = activeConversation?.id ?? '';
  const latestActiveMessageAt = activeMessages.at(-1)?.created_at ?? '';
  const activeMembers = activeConversation ? members.filter(member => member.conversation_id === activeConversation.id) : [];
  const otherMember = activeMembers.find(member => member.profile_id !== user?.id)?.profiles ?? null;

  useTopbarTitle(composing
    ? 'New Message'
    : standaloneConversation
      ? otherMember ? authorDisplayName(otherMember) : 'Conversation'
      : undefined);
  const conversationOverflowActions = useMemo<TopbarOverflowAction[] | undefined>(() => (
    standaloneConversation && !composing && activeConversation
      ? [{ id: 'archive-conversation', label: 'Archive Conversation', onSelect: () => setArchiveConfirmationOpen(true) }]
      : undefined
  ), [activeConversation, composing, standaloneConversation]);
  useTopbarOverflow(conversationOverflowActions);

  const conversationSummaries = useMemo(() => {
    return conversations.map(conversation => {
      const other = members.find(member => member.conversation_id === conversation.id && member.profile_id !== user?.id)?.profiles ?? null;
      const last = [...messages].reverse().find(message => message.conversation_id === conversation.id);
      const lastReadAt = members.find(member => member.conversation_id === conversation.id && member.profile_id === user?.id)?.last_read_at;
      const unread = Boolean(last && last.sender_id !== user?.id && (!lastReadAt || new Date(last.created_at).getTime() > new Date(lastReadAt).getTime()));
      return { conversation, other, last, unread };
    });
  }, [conversations, members, messages, user]);

  useEffect(() => {
    if (!activeConversationId) return;
    let alive = true;
    void loadConversationMessages(activeConversationId).then(async page => {
      if (!alive) return;
      setThreadMessages(page.messages);
      setThreadConversationId(activeConversationId);
      setThreadNextCursor(page.nextCursor);
      const latest = page.messages.at(-1)?.created_at;
      if (latest && user?.id) {
        try {
          await markConversationRead(activeConversationId, user.id, latest);
          if (alive) setMembers(current => current.map(member => (
            member.conversation_id === activeConversationId && member.profile_id === user.id
              ? { ...member, last_read_at: latest }
              : member
          )));
        } catch (readError) {
          if (alive) setInboxError(directMessageError(readError as { message?: string }));
        }
      }
    }).catch(threadError => {
      if (alive) setInboxError(directMessageError(threadError as { message?: string }));
    });
    return () => { alive = false; };
  }, [activeConversationId, user?.id]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || threadNextCursor === null || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    setInboxError('');
    try {
      const page = await loadConversationMessages(activeConversationId, threadNextCursor);
      setThreadMessages(current => [...page.messages, ...current.filter(message => !page.messages.some(older => older.id === message.id))]);
      setThreadNextCursor(page.nextCursor);
    } catch (threadError) {
      setInboxError(directMessageError(threadError as { message?: string }));
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [activeConversationId, loadingOlderMessages, threadNextCursor]);

  useEffect(() => {
    if (!standaloneConversation || !messageListRef.current) return;
    const messageList = messageListRef.current;
    const frame = window.requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestActiveMessageAt, standaloneConversation]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composing && selectedRecipient && user && body.trim() && !sending) {
      if (!canInteract) {
        setSetupGateOpen(true);
        return;
      }
      setSending(true);
      setInboxError('');
      const result = await createOrOpenConversation(user.id, selectedRecipient.id);
      if (result.error) {
        if (isMissingRelationError(result.error)) setSchemaReady(false);
        setInboxError(directMessageError(result.error));
        setSending(false);
        return;
      }
      const conversationId = result.conversationId;
      if (conversationId) {
        const { error: insertError } = await sendDirectMessage(conversationId, body);
        if (insertError) {
          setInboxError(directMessageError(insertError));
          setSending(false);
          return;
        }
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
    setInboxError('');
    const { data, error: insertError } = await sendDirectMessage(activeConversation.id, body);

    if (isMissingRelationError(insertError)) {
      setSchemaReady(false);
    } else if (insertError) {
      setInboxError(directMessageError(insertError));
    } else if (data) {
        const sentMessage = data as unknown as Message;
        setThreadMessages(current => [...current, sentMessage]);
        setMessages(current => [...current.filter(message => message.conversation_id !== activeConversation.id), sentMessage]);
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
    }
    setSending(false);
  }

  async function archiveActiveConversation() {
    if (!activeConversation || !user || archivingConversation) return;
    setArchivingConversation(true);
    setInboxError('');
    try {
      await archiveConversation(activeConversation.id, user.id);
      setConversations(current => current.filter(conversation => conversation.id !== activeConversation.id));
      setMembers(current => current.filter(member => member.conversation_id !== activeConversation.id));
      setMessages(current => current.filter(message => message.conversation_id !== activeConversation.id));
      setThreadMessages([]);
      setThreadConversationId('');
      setActiveId('');
      setArchiveConfirmationOpen(false);
      setMobileListOpen(true);
      router.replace('/inbox');
    } catch (archiveError) {
      setArchiveConfirmationOpen(false);
      setInboxError(directMessageError(archiveError as { message?: string }));
    } finally {
      setArchivingConversation(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <main className="social-shell">
          <div className="app-empty-text ui44-state ui44-state-loading" role="status" aria-live="polite">Loading messages...</div>
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
            <div className="social-inbox-results-offset">
              <OS44Button href="/login" className="os-button os-button-primary os-button-compact">Sign In</OS44Button>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className={`social-shell social-shell-wide social-messages-shell${standaloneConversation ? ' social-conversation-page' : ''}${composing ? ' social-messages-composing' : ''}${mobileListOpen ? '' : ' social-messages-thread-open'}`}>
        {!standaloneConversation && <header className="social-header social-inbox-mobile-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display ui44-type ui44-type-page-title">Messages</h1>
            </div>
            <button type="button" className="ui44-symbol-button ui44-symbol-button-add page-compose-button" aria-label="New Message" onClick={() => {
              setInboxError('');
              router.push('/conversation/new');
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 5H5.5A2.5 2.5 0 0 0 3 7.5v11A2.5 2.5 0 0 0 5.5 21h11a2.5 2.5 0 0 0 2.5-2.5V11" />
                <path d="m10 14 1-4 8.8-8.8a1.8 1.8 0 0 1 2.5 2.5L13.5 12.5 10 14Z" />
              </svg>
            </button>
          </div>
        </header>}

        {!canInteract && <div className="app-empty-text">{communityIdentityMessage()}</div>}
        {inboxError && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{inboxError}</div>}

          <section className={standaloneConversation
            ? 'social-inbox social-inbox-conversation-route'
            : composing
              ? 'social-inbox social-inbox-mobile-thread'
              : 'social-inbox social-inbox-mobile-list social-inbox-index'} aria-label={standaloneConversation ? 'Conversation' : 'Messages'}>
            {!standaloneConversation && (
            <aside className="social-inbox-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {composing && (
                <button
                  type="button"
                  className="social-action social-inbox-draft ui44-list-row ui44-list-row-inbox ui44-list-row-interactive"
                  onClick={() => setComposing(true)}
                >
                  <SocialProfileRow
                    profile={selectedRecipient ?? { display_name: 'New Message' }}
                    subtitle={selectedRecipient ? undefined : 'Choose a recipient'}
                  />
                </button>
              )}
              {conversationSummaries.length === 0 ? (
                !composing ? <div className="app-empty-text" role={inboxLoading ? 'status' : undefined}>{inboxLoading ? 'Loading messages…' : 'No messages yet.'}</div> : null
              ) : (
                conversationSummaries.map(({ conversation, other, last, unread }) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={unread
                      ? 'social-action social-inbox-conversation-row social-inbox-unread ui44-list-row ui44-list-row-interactive ui44-list-row-selected'
                      : 'social-action social-inbox-conversation-row ui44-list-row ui44-list-row-interactive'}
                    aria-label={`Open conversation with ${authorDisplayName(other)}`}
                    onClick={() => {
                      setActiveId(conversation.id);
                      setMobileListOpen(false);
                      router.push(`/conversation/${conversation.id}`);
                    }}
                  >
                    <SocialAvatar profile={other} />
                    <span className="social-inbox-row-copy">
                      <strong>{authorDisplayName(other)}</strong>
                      <span>{last?.body || 'No messages yet'}</span>
                    </span>
                    <span className="social-inbox-chevron" aria-hidden="true">›</span>
                  </button>
                ))
              )}
              {inboxNextCursor !== null && <OS44Button type="button" className="os-button os-button-secondary os-button-compact social-inbox-load-more" onClick={() => { void loadMoreInbox(); }} disabled={loadingMoreInbox}>{loadingMoreInbox ? 'Loading…' : 'Load more conversations'}</OS44Button>}
            </aside>
            )}

            {(standaloneConversation || composing) && <div className="social-inbox-thread">
              {composing ? (
                <div className="social-compose-panel">
                  <div className="social-compose-to-row ui44-composed-field ui44-composed-field-search">
                    <span className="social-compose-to-label">To:</span>
                    {selectedRecipient ? (
                      <button type="button" className="social-compose-recipient" onClick={() => setSelectedRecipient(null)}>
                        {authorDisplayName(selectedRecipient)} ×
                      </button>
                    ) : (
                      <Ui44TextInput
                        surface="bare"
                        className="social-compose-to-input"
                        value={recipientQuery}
                        onChange={event => setRecipientQuery(event.target.value)}
                        placeholder="Name or username"
                        autoFocus
                      />
                    )}
                  </div>
                  {!selectedRecipient && (
                    <div className="social-compose-results">
                      {recipientSearchState === 'idle' ? (
                        <div className="social-compose-empty">
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="13" cy="10" r="5" />
                            <path d="M3.5 26c.8-5 4.3-8 9.5-8 2.2 0 4 .6 5.4 1.7M24 17v10m-5-5h10" />
                          </svg>
                          <strong>Find a member</strong>
                          <span>Search by display name or username.</span>
                        </div>
                      ) : recipientSearchState === 'searching' ? (
                        <div className="social-compose-empty" role="status">Searching…</div>
                      ) : recipientSearchState === 'failed' ? (
                        <div className="social-compose-empty" role="status">Search unavailable</div>
                      ) : visibleRecipientProfiles.length === 0 ? (
                        <div className="social-compose-empty" role="status">No matching people.</div>
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
                          >
                            <SocialAvatar profile={result} />
                            <span className="social-compose-result-copy">
                              <strong>{authorDisplayName(result)}</strong>
                              {result.username && <span>@{result.username}</span>}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <form className="social-message-form social-message-form-compose" onSubmit={sendMessage}>
                    <Ui44Textarea
                      className="os-input-textarea ui44-composer-input"
                      rows={1}
                      value={body}
                      onChange={event => setBody(event.target.value)}
                      placeholder="Message"
                      disabled={sending || !selectedRecipient}
                      maxLength={4000}
                    />
                    {selectedRecipient && body.trim() && !sending && (
                      <button className="social-message-send" type="submit" aria-label="Send message">
                        <MessageSendGlyph />
                      </button>
                    )}
                  </form>
                </div>
              ) : activeConversation ? (
                <>
                  <div className="social-message-list" ref={messageListRef}>
                    {threadConversationId === activeConversation.id && threadNextCursor !== null && <OS44Button type="button" className="os-button os-button-secondary os-button-compact social-message-load-older" onClick={() => { void loadOlderMessages(); }} disabled={loadingOlderMessages}>{loadingOlderMessages ? 'Loading…' : 'Load older messages'}</OS44Button>}
                    {threadConversationId !== activeConversation.id ? (
                      <div className="app-empty-text" role="status">Loading conversation…</div>
                    ) : activeMessages.length === 0 ? (
                      <div className="app-empty-text">Start the conversation.</div>
                    ) : (
                      activeMessages.map(message => (
                        <div key={message.id} className={message.sender_id === user.id ? 'social-message social-message-own' : 'social-message'}>
                          <div>{message.body}</div>
                          <div className="os-type-meta social-message-time">{compactDate(message.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <form className="social-message-form" onSubmit={sendMessage}>
                    <Ui44Textarea
                      className="os-input-textarea ui44-composer-input"
                      rows={1}
                      value={body}
                      onChange={event => setBody(event.target.value)}
                      placeholder="Message"
                      disabled={sending}
                    />
                    {body.trim() && !sending && (
                      <button className="social-message-send" type="submit" aria-label="Send message">
                        <MessageSendGlyph />
                      </button>
                    )}
                  </form>
                </>
              ) : (
                <div className="app-empty-text">{schemaReady ? 'Conversation unavailable.' : 'Messages are not available yet.'}</div>
              )}
            </div>}
          </section>
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
      <ConfirmDialog
        open={archiveConfirmationOpen}
        title="Archive this conversation?"
        description="This removes the conversation from your inbox."
        confirmLabel="Archive Conversation"
        cancelLabel="Cancel"
        destructive
        busy={archivingConversation}
        onConfirm={() => { void archiveActiveConversation(); }}
        onCancel={() => { if (!archivingConversation) setArchiveConfirmationOpen(false); }}
      />
    </PageShell>
  );
}
