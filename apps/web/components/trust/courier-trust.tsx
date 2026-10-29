'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CourierOnShipment } from '@/lib/types';
import { HandleLink, VerifiedBadge } from '@/components/dashboard/widgets';
import { FiveStars } from '@/components/carrier/trip-card';
import { IdentityCard, IdentityLocked } from './identity-card';
import { ReviewForm } from './reviews';

/**
 * The sender's view of each courier on their shipment: verified identity once
 * a courier accepts, and a rating + comment once the trip ends or is cut short.
 */
export function CourierTrust({ shipmentId, token, refreshKey }: { shipmentId: string; token: string; refreshKey?: unknown }) {
  const [couriers, setCouriers] = useState<CourierOnShipment[] | null>(null);

  const load = useCallback(() => {
    api<CourierOnShipment[]>(`/shipments/${shipmentId}/couriers`, { token })
      .then(setCouriers)
      .catch(() => setCouriers([]));
  }, [shipmentId, token]);

  useEffect(load, [load, refreshKey]);

  if (!couriers) return <div className="h-32 animate-pulse rounded-2xl bg-muted" aria-label="Loading couriers" />;
  if (couriers.length === 0) return <p className="text-body-s text-text-tertiary">No courier on this shipment yet.</p>;

  const reviewable = couriers.some((c) => c.outcome && !c.myReview);
  const terminated = couriers.some((c) => c.outcome === 'TERMINATED');

  return (
    <div className="flex flex-col gap-4">
      {couriers.map((c) => (
        <div key={c.legId} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2 text-body-s">
              {couriers.length > 1 && <span className="font-semi-bold text-text-tertiary">Leg {c.sequence + 1}</span>}
              <HandleLink handle={c.handle} />
              <VerifiedBadge tier={c.tier} />
              <span className="text-text-tertiary">{c.route}</span>
            </span>
            <FiveStars rating={c.rating} count={c.count} />
          </div>
          {c.unlocked && c.identity ? <IdentityCard identity={c.identity} role="courier" /> : <IdentityLocked role="courier" />}
          {c.myReview && (
            <p className="flex flex-wrap items-center gap-2 text-body-s text-text-secondary">
              You rated this courier <FiveStars rating={c.myReview.rating} size={12} />
              {c.myReview.comment && <span className="text-text-tertiary">“{c.myReview.comment}”</span>}
            </p>
          )}
        </div>
      ))}
      {reviewable && (
        <ReviewForm
          path={`/shipments/${shipmentId}/rate`}
          token={token}
          title={terminated ? 'This trip was cut short. How did your courier handle it?' : 'How was this delivery? Rate your courier'}
          sub="Your rating and comment appear on their profile under your username."
          onDone={load}
        />
      )}
    </div>
  );
}
