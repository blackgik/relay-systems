'use client';

import React from 'react';
import type { Trip } from '@/lib/types';
import { formatDuration } from '@/lib/tracking';
import { formatDay, formatTime } from '@/components/dashboard/widgets';

/** Departure and arrival chips over a dotted arc between the two cities, after the reference's flight header. */
export function RouteArc({ trip }: { trip: Pick<Trip, 'originCity' | 'destCity' | 'departAt' | 'arriveAt'> }) {
  const hours = new Date(trip.arriveAt).getTime() - new Date(trip.departAt).getTime();
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border border-border px-3 py-1 text-body-s font-semi-bold text-text-primary">{formatTime(trip.departAt)}</span>
        <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semi-bold uppercase tracking-wide text-text-tertiary">{formatDuration(hours)}</span>
        <span className="rounded-full border border-border px-3 py-1 text-body-s font-semi-bold text-text-primary">{formatTime(trip.arriveAt)}</span>
      </div>
      <div className="relative mt-1 h-12" aria-hidden>
        <svg viewBox="0 0 400 56" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M6 50 C 110 -6, 290 -6, 394 50" fill="none" stroke="hsl(var(--border-strong))" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="tr-route-draw" />
        </svg>
        <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full bg-[var(--tr-ink)]" />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--tr-ink)]" />
      </div>
      <div className="-mt-1 flex items-start justify-between gap-2">
        <span>
          <span className="block text-title-m text-text-primary">{trip.originCity}</span>
          <span className="text-body-s text-text-tertiary">{formatDay(trip.departAt)}</span>
        </span>
        <span className="text-right">
          <span className="block text-title-m text-text-primary">{trip.destCity}</span>
          <span className="text-body-s text-text-tertiary">{formatDay(trip.arriveAt)}</span>
        </span>
      </div>
    </div>
  );
}
