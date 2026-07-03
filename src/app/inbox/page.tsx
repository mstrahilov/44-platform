'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
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

export default function InboxPage() {
  return (
    <Suspense fallback={<PageShell><div style={{ minHeight: '40vh' }} /></PageShell>}>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState('');
  const [body, setBody] = useState('');
  const [schemaReady, setSchemaReady] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    const userId = user.id;

    const { data: ownMemberships, error: membershipError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', userId);

    if (isMissingRelationError(membershipError)) {
      setSchemaReady(false);
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
    if (requested && rows.some(row => row.id === requested)) setActiveId(requested);
    else if (!activeId && rows[0]) setActiveId(rows[0].id);
  }, [activeId, searchParams, user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const withProfile = searchParams.get('with');
    if (!withProfile) {
      loadInbox();
      return;
    }
    const targetProfileId = withProfile;

    async function openRequestedConversation() {
      const result = await createOrOpenConversation(userId, targetProfileId);
      if (result.error && isMissingRelationError(result.error)) {
        setSchemaReady(false);
        return;
      }
      router.replace(result.href);
      await loadInbox();
    }

    openRequestedConversation();
  }, [loadInbox, router, searchParams, user]);

  const canInteract = hasCommunityIdentity(profile);
  const activeConversation = conversations.find(row => row.id === activeId) ?? conversations[0] ?? null;
  const activeMessages = activeConversation ? messages.filter(message => message.conversation_id === activeConversation.id) : [];
  const activeMembers = activeConversation ? members.filter(member => member.conversation_id === activeConversation.id) : [];
  const otherMember = activeMembers.find(member => member.profile_id !== user?.id)?.profiles ?? null;

  const conversationSummaries = useMemo(() => {
    return conversations.map(conversation => {
      const other = members.find(member => member.conversation_id === conversation.id && member.profile_id !== user?.id)?.profiles ?? null;
      const last = [...messages].reverse().find(message => message.conversation_id === conversation.id);
      return { conversation, other, last };
    });
  }, [conversations, members, messages, user]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
              <h1 className="os-type-display">Inbox</h1>
              <p className="social-title-copy os-type-body">
                Direct conversations with 44 members you connect with.
              </p>
            </div>
          </div>
        </header>

        {!canInteract && (
          <div className="dashboard-status dashboard-status-error">
            {communityIdentityMessage()}
          </div>
        )}

        {!schemaReady ? (
          <div className="app-empty-text">Messages are ready in the app. Run the social SQL to enable conversations in Supabase.</div>
        ) : (
          <section className="social-inbox" aria-label="Inbox">
            <aside className="social-inbox-list">
              {conversationSummaries.length === 0 ? (
                <div className="app-empty-text">No messages yet.</div>
              ) : (
                conversationSummaries.map(({ conversation, other, last }) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="social-action"
                    onClick={() => setActiveId(conversation.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', color: 'inherit' }}
                  >
                    <SocialProfileRow
                      profile={other ?? { display_name: '44 Member' }}
                      subtitle={last ? `${compactDate(last.created_at)} · ${last.body}` : 'No messages yet'}
                      aside={conversation.id === activeConversation?.id ? <span className="os-pill os-type-pill">Open</span> : null}
                    />
                  </button>
                ))
              )}
            </aside>

            <div className="social-inbox-thread">
              {activeConversation ? (
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
        )}
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
