'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import type { Service } from '@/lib/platform';
import { formatServicePrice } from '@/lib/platform';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { useTopbarBack } from '@/components/TopbarContext';

type Submission = 'idle' | 'submitting' | 'error';

export default function ServiceRequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  const [briefTitle, setBriefTitle] = useState('');
  const [briefBody, setBriefBody] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [state, setState] = useState<Submission>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useTopbarBack({ href: `/service/${id}`, label: 'Service' });

  useEffect(() => {
    async function fetchService() {
      const { data } = await supabase
        .from('services')
        .select('*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name)')
        .eq('slug', id)
        .maybeSingle();
      setService((data as Service | null) ?? null);
      setLoading(false);
    }
    fetchService();
  }, [id]);

  useEffect(() => {
    if (service && !briefTitle) setBriefTitle(`Request: ${service.title}`);
  }, [service, briefTitle]);

  if (loading || authLoading) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Request Service" copy="Sign in to send a project brief to this creator." />
          <div style={{ display: 'flex', gap: 12 }}>
            <Link className="os-button os-button-primary" href="/login">Log In</Link>
            <Link className="os-button os-button-secondary" href={`/service/${id}`}>Back to Service</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  if (!service) {
    return <PageShell><CenteredMessage>Service not found.</CenteredMessage></PageShell>;
  }

  async function submitBrief(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !service) return;
    if (!briefTitle.trim() || !briefBody.trim()) {
      setErrorMessage('Add a title and a short description before submitting.');
      setState('error');
      return;
    }

    setState('submitting');
    setErrorMessage('');

    const budgetCents = budget.trim() ? Math.round(parseFloat(budget) * 100) : null;

    async function attempt(payload: Record<string, unknown>) {
      return supabase
        .from('service_requests')
        .insert(payload)
        .select('id')
        .single();
    }

    let insertRes = await attempt({
      user_id: user.id,
      service_id: service.id,
      status: 'pending',
      message: briefBody,
      brief_title: briefTitle,
      brief_body: briefBody,
      budget_cents: budgetCents,
      timeline: timeline.trim() || null,
    });

    // Graceful fallback if migration hasn't been run — retry with only the
    // legacy columns.
    if (insertRes.error && isMissingColumnError(insertRes.error)) {
      insertRes = await attempt({
        user_id: user.id,
        service_id: service.id,
        status: 'pending',
        message: [
          briefTitle,
          '',
          briefBody,
          budget.trim() ? `Budget: ${budget}` : '',
          timeline.trim() ? `Timeline: ${timeline}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }

    if (insertRes.error || !insertRes.data?.id) {
      setErrorMessage(insertRes.error?.message ?? 'Could not send the request.');
      setState('error');
      return;
    }

    router.push(`/projects/${insertRes.data.id}`);
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero
          title="Request Service"
          copy={`Send a brief to ${service.creators?.name ?? 'the creator'} about "${service.title}". They will review and respond in a shared project workspace.`}
        />

        <form className="settings-section" onSubmit={submitBrief}>
          <div className="settings-field">
            <div className="settings-field-head">
              <div className="os-type-field-title">Project Title</div>
              <p className="os-type-body-small">A short line the creator will see first.</p>
            </div>
            <input
              className="os-input-field"
              value={briefTitle}
              onChange={event => setBriefTitle(event.target.value)}
              placeholder="Example: Mixing a 4-track EP"
            />
          </div>

          <div className="settings-field">
            <div className="settings-field-head">
              <div className="os-type-field-title">What do you need?</div>
              <p className="os-type-body-small">Describe the project, your goals, and any references. Files and further details can be shared in the project workspace after acceptance.</p>
            </div>
            <textarea
              className="os-input-textarea"
              value={briefBody}
              onChange={event => setBriefBody(event.target.value)}
              rows={8}
              placeholder="Share as much or as little as you like — the creator can ask follow-up questions in the project workspace."
            />
          </div>

          <div className="settings-field">
            <div className="settings-field-head">
              <div className="os-type-field-title">Budget</div>
              <p className="os-type-body-small">Optional. The starting price for this service is {formatServicePrice(service)}. The final agreed price is set inside the project.</p>
            </div>
            <input
              className="os-input-field"
              value={budget}
              onChange={event => setBudget(event.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              placeholder="500"
              inputMode="decimal"
            />
          </div>

          <div className="settings-field">
            <div className="settings-field-head">
              <div className="os-type-field-title">Timeline</div>
              <p className="os-type-body-small">Optional. When do you want this delivered?</p>
            </div>
            <input
              className="os-input-field"
              value={timeline}
              onChange={event => setTimeline(event.target.value)}
              placeholder="Example: within 2 weeks"
            />
          </div>

          {errorMessage && (
            <div className="dashboard-status dashboard-status-error">{errorMessage}</div>
          )}

          <div className="cart-summary-actions">
            <Link className="os-button os-button-secondary" href={`/service/${id}`}>
              Cancel
            </Link>
            <button className="os-button os-button-primary" type="submit" disabled={state === 'submitting'}>
              {state === 'submitting' ? 'Sending…' : 'Send Brief'}
            </button>
          </div>
        </form>
      </main>
    </PageShell>
  );
}
