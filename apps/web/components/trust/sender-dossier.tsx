'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Ban, CalendarClock, Gavel, PackageCheck, Send } from 'lucide-react';
import { api } from '@/lib/api';
import type { SenderDossier as Dossier } from '@/lib/types';
import { HandleLink, VerifiedBadge, monthLabel } from '@/components/dashboard/widgets';
import { FiveStars } from '@/components/carrier/trip-card';
import { IdentityCard, IdentityLocked } from './identity-card';
import { ReviewForm, ReviewList } from './reviews';

/**
 * Everything a courier knows about a sender: their record and what other
 * couriers said, before deciding; their verified identity after accepting;
 * and, once the trip ends or is terminated, a place to review them.
 */
export function SenderDossier({ legId, token, refreshKey }: { legId: string; token: string | null; refreshKey?: unknown }) {
  const [d, setD] = useState<Dossier | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    api<Dossier>(`/legs/${legId}/sender`, { token })
      .then(setD)
      .catch(() => setError(true));
  }, [legId, token]);

  useEffect(load, [load, refreshKey]);

  if (error) return <p className="text-body-s text-text-tertiary">Sender history is unavailable right now.</p>;
  if (!d) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-label="Loading sender history" />;

  const stats = [
    { icon: Send, label: 'Sent', value: d.history.sent },
    { icon: PackageCheck, label: 'Delivered', value: d.history.delivered },
    { icon: Ban, label: 'Cancelled', value: d.history.cancelled },
    { icon: Gavel, label: 'Disputes', value: d.history.disputes },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-body-s">
          <HandleLink handle={d.handle} />
          <VerifiedBadge tier={d.tier} />
          <span className="flex items-center gap-1 text-text-tertiary">
            <CalendarClock size={13} /> Since {monthLabel(d.memberSince, 'long')} {d.memberSince.slice(0, 4)}
          </span>
        </div>
        <FiveStars rating={d.rating} count={d.count} />
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface px-3 py-2">
            <dt className="flex items-center gap-1 text-[11px] text-text-tertiary"><s.icon size={12} /> {s.label}</dt>
            <dd className="text-title-m font-semi-bold text-text-primary">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-2 text-body-s font-semi-bold text-text-primary">What couriers said</p>
        <ReviewList reviews={d.reviews} limit={3} empty="No courier has reviewed this sender yet." />
      </div>

      {d.unlocked && d.identity ? <IdentityCard identity={d.identity} role="sender" /> : <IdentityLocked role="sender" />}

      {d.canReview && (
        <ReviewForm
          path={`/legs/${legId}/review`}
          token={token}
          title="Rate this sender"
          sub="Was the package as declared, ready on time, and the receiver reachable?"
          onDone={load}
        />
      )}
      {d.myReview && (
        <p className="flex flex-wrap items-center gap-2 text-body-s text-text-secondary">
          You rated this sender <FiveStars rating={d.myReview.rating} size={12} />
          {d.myReview.comment && <span className="text-text-tertiary">“{d.myReview.comment}”</span>}
        </p>
      )}
    </div>
  );
}
