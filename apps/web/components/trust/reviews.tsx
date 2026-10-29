'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { MessageSquareQuote, Star } from 'lucide-react';
import { Button, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import type { Review } from '@/lib/types';
import { formatDay } from '@/components/dashboard/widgets';
import { FiveStars } from '@/components/carrier/trip-card';

const MAX_COMMENT = 500;

/** 1-5 star picker; arrow keys work because it is a radiogroup. */
export function StarInput({ value, onChange, disabled, size = 26 }: { value: number; onChange: (n: number) => void; disabled?: boolean; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform enabled:hover:scale-110"
        >
          <Star size={size} className={n <= shown ? 'fill-accent-signal text-accent-signal' : 'text-border-strong'} />
        </button>
      ))}
    </div>
  );
}

const PROMPT: Record<number, string> = {
  1: 'What went wrong?',
  2: 'What could have been better?',
  3: 'Anything they should improve?',
  4: 'What went well?',
  5: 'What made it great?',
};

/**
 * Rate and comment on the other side once a trip has ended or been
 * terminated. `path` is the endpoint: the sender posts to
 * /shipments/:id/rate, the courier to /legs/:id/review.
 */
export function ReviewForm({
  path,
  token,
  title,
  sub,
  onDone,
}: {
  path: string;
  token: string | null;
  title: string;
  sub?: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api(path, { method: 'POST', token, body: { rating, comment: comment.trim() || undefined } });
      toast.success({ title: 'Review posted', description: 'Thanks. It is now part of their Relay record.' });
      onDone();
    } catch (err) {
      toast.error({ title: 'Could not post review', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-body-m font-semi-bold text-text-primary">{title}</p>
      {sub && <p className="mt-0.5 text-body-s text-text-tertiary">{sub}</p>}
      <div className="mt-3"><StarInput value={rating} onChange={setRating} disabled={busy} /></div>
      {rating > 0 && (
        <div className="tr-fade mt-3">
          <label htmlFor={`${path}-comment`} className="text-body-s font-medium text-text-secondary">{PROMPT[rating]} (optional)</label>
          <textarea
            id={`${path}-comment`}
            value={comment}
            maxLength={MAX_COMMENT}
            rows={3}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Your comment is shown under your username, never your name."
            className="mt-1 block w-full resize-y rounded-xl border border-input-border bg-card px-3 py-2 text-body-s text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-text-tertiary">{comment.length}/{MAX_COMMENT}</span>
            <Button label={busy ? 'Posting…' : 'Post review'} size="sm" fit disabled={busy} onClick={submit} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewList({ reviews, empty = 'No reviews yet.', limit }: { reviews: Review[]; empty?: string; limit?: number }) {
  const [all, setAll] = useState(false);
  if (reviews.length === 0) return <p className="text-body-s text-text-tertiary">{empty}</p>;
  const shown = all || !limit ? reviews : reviews.slice(0, limit);
  return (
    <div>
      <ul className="divide-y divide-border">
        {shown.map((r) => (
          <li key={r.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <FiveStars rating={r.rating} size={12} />
              <span className="text-[11px] text-text-tertiary">
                {r.author ? (
                  <Link href={`/dashboard/people/${r.author}`} className="font-semi-bold hover:underline">@{r.author}</Link>
                ) : 'Relay member'}{' '}
                · {r.route} · {formatDay(r.createdAt)}
              </span>
            </div>
            {r.comment ? (
              <p className="mt-1.5 flex gap-1.5 text-body-s text-text-primary">
                <MessageSquareQuote size={14} className="mt-0.5 shrink-0 text-icon-muted" aria-hidden />
                <span className="min-w-0 break-words">{r.comment}</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-text-tertiary">Rated without a comment</p>
            )}
            {r.outcome === 'TERMINATED' && (
              <span className={clsx('mt-1.5 inline-block rounded-full bg-warning-subtle px-2 py-0.5 text-[10px] font-semi-bold uppercase tracking-wide text-warning-text')}>Trip terminated</span>
            )}
          </li>
        ))}
      </ul>
      {limit && reviews.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
          {all ? 'Show fewer' : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </div>
  );
}
