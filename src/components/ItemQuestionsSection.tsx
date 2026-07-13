'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SectionHeader } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { createItemQuestion, listItemQuestions, type ItemQuestion } from '@/lib/domain/itemCommunity';

export function ItemQuestionsSection({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ItemQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listItemQuestions(itemId)
      .then(setQuestions)
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Could not load questions.'))
      .finally(() => setLoading(false));
  }, [itemId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setError('');
    try {
      await createItemQuestion(itemId, title, body);
      setQuestions(await listItemQuestions(itemId));
      setTitle('');
      setBody('');
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not ask this question.');
    }
  }

  return (
    <div className="view-section">
      <SectionHeader
        title="Questions"
        description="Questions about this item stay attached to its permanent Library and Store identity."
        action={user ? <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setOpen(value => !value)}>Ask</button> : undefined}
      />
      {error && <div className="dashboard-status dashboard-status-error">{error}</div>}
      {open && (
        <form className="social-composer social-composer-inline-surface" onSubmit={submit}>
          <input className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} placeholder="Question title" maxLength={160} />
          <textarea className="os-input-textarea" value={body} onChange={event => setBody(event.target.value)} placeholder="What would you like to know?" maxLength={5000} />
          <div className="social-composer-actions"><button className="os-button os-button-primary os-button-compact" type="submit">Post Question</button></div>
        </form>
      )}
      <div className="dashboard-list-surface">
        {loading ? <div className="dashboard-empty">Loading questions…</div> : questions.length === 0 ? (
          <div className="dashboard-empty">No questions about this item yet.</div>
        ) : questions.map(question => (
          <Link href="/community/questions" className="dashboard-list-row" key={question.id}>
            <span className="dashboard-row-copy">
              <span className="dashboard-row-title">{question.title}</span>
              <span className="dashboard-row-subtitle">{question.answer_count ?? 0} answers</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
