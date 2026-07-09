'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import type { ProjectMessage, Service, ServiceRequest } from '@/lib/platform';
import { formatServicePrice } from '@/lib/platform';
import {
  formatBriefBudget,
  isOpenProjectStatus,
  projectStatusLabel,
} from '@/lib/projects';
import { isMissingColumnError, isMissingRelationError } from '@/lib/schemaCompat';
import { SocialAvatar } from '@/components/Social';
import { useTopbarBack } from '@/components/TopbarContext';

type Row = ServiceRequest & { services: (Service & { author_id?: string | null }) | null };

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
}

function formatCents(cents: number | null | undefined, currency = 'USD') {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [row, setRow] = useState<Row | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [messagesUnavailable, setMessagesUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useTopbarBack({ href: '/services/projects', label: 'Projects' });

  const loadRow = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*, services(*, creators:profiles!author_id(*, name:display_name))')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setRow(data as Row);
    setLoading(false);

    const { data: msgs, error: msgError } = await supabase
      .from('project_messages')
      .select('*, authors:profiles!author_id(id, display_name, username, avatar_url)')
      .eq('request_id', id)
      .order('created_at', { ascending: true });

    if (msgError && isMissingRelationError(msgError)) {
      setMessagesUnavailable(true);
      setMessages([]);
    } else {
      setMessages(((msgs ?? []) as ProjectMessage[]) ?? []);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    Promise.resolve().then(() => loadRow());
  }, [authLoading, loadRow, user]);

  const isCreator = Boolean(
    user && row?.services?.author_id && row.services.author_id === user.id,
  );
  const isClient = Boolean(user && row?.user_id === user.id);

  const briefTitle =
    row?.brief_title || (row?.message ? row.message.split('\n')[0] : null) || (row?.services?.title ?? 'Project');
  const briefBody = row?.brief_body ?? row?.message ?? '';
  const briefBudget = row?.budget_cents ?? null;
  const briefTimeline = row?.timeline ?? '';
  const agreedPriceLabel = formatCents(row?.agreed_price_cents, row?.agreed_currency ?? 'USD');

  const status = row?.status ?? 'pending';
  const statusLabelText = projectStatusLabel(status);

  const availableActions = useMemo(() => {
    if (!row) return [] as Array<{ id: string; label: string; kind: 'primary' | 'secondary' | 'danger' }>;
    const actions: Array<{ id: string; label: string; kind: 'primary' | 'secondary' | 'danger' }> = [];
    if (isCreator) {
      if (status === 'pending' || status === 'inquiry') {
        actions.push({ id: 'accept', label: 'Accept & Send Quote', kind: 'primary' });
        actions.push({ id: 'decline', label: 'Decline', kind: 'danger' });
      }
      if (status === 'accepted') {
        actions.push({ id: 'quote', label: 'Send Quote', kind: 'primary' });
      }
      if (status === 'in_progress') {
        actions.push({ id: 'complete', label: 'Mark Complete', kind: 'primary' });
      }
    }
    if (isClient) {
      if (status === 'awaiting_payment') {
        actions.push({ id: 'pay', label: `Pay ${agreedPriceLabel ?? 'Now'}`, kind: 'primary' });
      }
      if (isOpenProjectStatus(status) && status !== 'in_progress' && status !== 'awaiting_payment') {
        actions.push({ id: 'withdraw', label: 'Withdraw Request', kind: 'secondary' });
      }
    }
    return actions;
  }, [agreedPriceLabel, isClient, isCreator, row, status]);

  async function patchRequest(patch: Record<string, unknown>) {
    if (!row) return false;
    const attempt = await supabase
      .from('service_requests')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (attempt.error && isMissingColumnError(attempt.error)) {
      // Retry without extended columns.
      const { updated_at: _updated, ...rest } = patch as Record<string, unknown>;
      void _updated;
      const safePatch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (['status', 'message'].includes(k)) safePatch[k] = v;
      }
      const retry = await supabase.from('service_requests').update(safePatch).eq('id', row.id);
      return !retry.error;
    }
    return !attempt.error;
  }

  async function runAction(actionId: string) {
    if (!row || !user) return;
    setActionBusy(actionId);
    setStatusMessage(null);

    if (actionId === 'accept') {
      const priceCents = priceInput ? Math.round(parseFloat(priceInput) * 100) : null;
      const ok = await patchRequest({
        status: priceCents ? 'awaiting_payment' : 'accepted',
        responded_at: new Date().toISOString(),
        agreed_price_cents: priceCents,
        agreed_currency: 'USD',
      });
      if (ok) setStatusMessage({ kind: 'success', text: priceCents ? 'Quote sent. Client can now pay to start.' : 'Request accepted. Send a quote to move forward.' });
      else setStatusMessage({ kind: 'error', text: 'Could not update the request.' });
    } else if (actionId === 'quote') {
      const priceCents = priceInput ? Math.round(parseFloat(priceInput) * 100) : null;
      if (!priceCents) {
        setStatusMessage({ kind: 'error', text: 'Enter an agreed price before sending the quote.' });
      } else {
        const ok = await patchRequest({
          status: 'awaiting_payment',
          agreed_price_cents: priceCents,
          agreed_currency: 'USD',
        });
        if (ok) setStatusMessage({ kind: 'success', text: 'Quote sent. Client can now pay to start.' });
        else setStatusMessage({ kind: 'error', text: 'Could not send the quote.' });
      }
    } else if (actionId === 'decline') {
      const ok = await patchRequest({ status: 'declined', responded_at: new Date().toISOString() });
      if (ok) setStatusMessage({ kind: 'success', text: 'Request declined.' });
    } else if (actionId === 'complete') {
      const ok = await patchRequest({ status: 'completed', completed_at: new Date().toISOString() });
      if (ok) setStatusMessage({ kind: 'success', text: 'Project marked complete.' });
    } else if (actionId === 'withdraw') {
      const ok = await patchRequest({ status: 'canceled' });
      if (ok) setStatusMessage({ kind: 'success', text: 'Request withdrawn.' });
    } else if (actionId === 'pay') {
      const ok = await patchRequest({ status: 'in_progress', paid_at: new Date().toISOString() });
      if (ok) setStatusMessage({ kind: 'success', text: 'Payment recorded. Project started.' });
    }

    await loadRow();
    setActionBusy(null);
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!row || !user || !messageBody.trim() || messagesUnavailable) return;
    setSending(true);
    const { error } = await supabase.from('project_messages').insert({
      request_id: row.id,
      author_id: user.id,
      body: messageBody.trim(),
    });
    if (error) {
      if (isMissingRelationError(error)) {
        setMessagesUnavailable(true);
      }
    } else {
      setMessageBody('');
      await loadRow();
    }
    setSending(false);
  }

  if (authLoading) {
    return <PageShell><CenteredMessage>Loading project…</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Project" copy="Sign in to view this project." />
          <div>
            <Link className="os-button os-button-primary" href="/login">Log In</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  if (loading) {
    return <PageShell><CenteredMessage>Loading project…</CenteredMessage></PageShell>;
  }

  if (notFound || !row) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Project not found" copy="This request may have been removed, or you may not have access." />
          <div>
            <Link className="os-button os-button-primary" href="/services/projects">Back to Projects</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  const service = row.services;
  const creatorName = service?.creators?.name ?? '44 Creator';
  const startingPriceLabel = service ? formatServicePrice(service) : null;

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero
          title={briefTitle}
          copy={`${service?.title ?? 'Service'} · ${creatorName}`}
          actions={<span className="project-status-pill" data-status={status}>{statusLabelText}</span>}
        />

        <div className="project-grid">
          <section className="project-thread">
            <div className="dashboard-list-surface project-thread-surface">
              <article className="project-brief">
                <div className="project-brief-head">
                  <span className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)' }}>Project Brief</span>
                  <span className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>{timeAgo(row.created_at)}</span>
                </div>
                <h2 className="os-type-field-title">{briefTitle}</h2>
                {briefBody && (
                  <p className="os-type-body" style={{ whiteSpace: 'pre-wrap', color: 'var(--os-color-ink-secondary)' }}>
                    {briefBody}
                  </p>
                )}
                <div className="project-brief-meta">
                  <span><strong>Budget:</strong> {formatBriefBudget(briefBudget)}</span>
                  {briefTimeline && <span><strong>Timeline:</strong> {briefTimeline}</span>}
                  {startingPriceLabel && <span><strong>Starting price:</strong> {startingPriceLabel}</span>}
                </div>
              </article>

              {messages.map(msg => (
                <article key={msg.id} className="project-message">
                  <SocialAvatar
                    profile={
                      msg.authors
                        ? {
                            id: msg.authors.id,
                            display_name: msg.authors.display_name ?? null,
                            username: msg.authors.username ?? null,
                            slug: null,
                            avatar_url: msg.authors.avatar_url ?? null,
                            role: null,
                            creator_type: null,
                          }
                        : null
                    }
                  />
                  <div className="project-message-body">
                    <div className="project-message-meta">
                      <span className="social-author-name">{msg.authors?.display_name || msg.authors?.username || 'Member'}</span>
                      <span className="social-time">{timeAgo(msg.created_at)}</span>
                    </div>
                    <p className="os-type-body" style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</p>
                  </div>
                </article>
              ))}

              {messagesUnavailable ? (
                <div className="dashboard-empty">Messaging will turn on once the project schema migration has been applied.</div>
              ) : messages.length === 0 ? (
                <div className="dashboard-empty">No messages yet. Say hi below to get the conversation started.</div>
              ) : null}
            </div>

            {!messagesUnavailable && (
              <form className="project-composer" onSubmit={sendMessage}>
                <textarea
                  className="os-input-textarea"
                  placeholder={isCreator ? 'Reply to the client…' : 'Write a message to the creator…'}
                  value={messageBody}
                  onChange={event => setMessageBody(event.target.value)}
                  rows={3}
                />
                <div className="cart-summary-actions">
                  <button className="os-button os-button-primary" type="submit" disabled={sending || !messageBody.trim()}>
                    {sending ? 'Sending…' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <aside className="project-sidebar">
            <div className="dashboard-list-surface project-sidebar-card">
              <div className="project-sidebar-section">
                <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)' }}>Status</div>
                <div className="os-type-field-title">{statusLabelText}</div>
                {agreedPriceLabel && (
                  <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                    Agreed price: {agreedPriceLabel}
                  </div>
                )}
                {row.responded_at && (
                  <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                    Responded {timeAgo(row.responded_at)}
                  </div>
                )}
                {row.paid_at && (
                  <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                    Paid {timeAgo(row.paid_at)}
                  </div>
                )}
                {row.completed_at && (
                  <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                    Completed {timeAgo(row.completed_at)}
                  </div>
                )}
              </div>

              {isCreator && (status === 'pending' || status === 'inquiry' || status === 'accepted') && (
                <div className="project-sidebar-section">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Agreed Price (USD)</div>
                    <input
                      className="os-input-field"
                      value={priceInput}
                      onChange={event => setPriceInput(event.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                      placeholder="500"
                      inputMode="decimal"
                    />
                    <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
                      Leave blank to accept without a price — you can send a quote later.
                    </p>
                  </label>
                </div>
              )}

              {availableActions.length > 0 && (
                <div className="project-sidebar-section project-actions">
                  {availableActions.map(action => (
                    <button
                      key={action.id}
                      type="button"
                      className={`os-button ${
                        action.kind === 'primary'
                          ? 'os-button-primary'
                          : action.kind === 'danger'
                            ? 'os-button-danger'
                            : 'os-button-secondary'
                      }`}
                      onClick={() => runAction(action.id)}
                      disabled={actionBusy !== null}
                    >
                      {actionBusy === action.id ? 'Working…' : action.label}
                    </button>
                  ))}
                </div>
              )}

              {statusMessage && (
                <div
                  className={
                    statusMessage.kind === 'success'
                      ? 'dashboard-status dashboard-status-success'
                      : 'dashboard-status dashboard-status-error'
                  }
                >
                  {statusMessage.text}
                </div>
              )}

              {!isClient && !isCreator && (
                <div className="dashboard-empty">You&rsquo;re viewing this project as an outsider. Only the client and creator can act on it.</div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
