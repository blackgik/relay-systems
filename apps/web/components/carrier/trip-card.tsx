'use client';

import React from 'react';
import clsx from 'clsx';
import { MapPin, Star } from 'lucide-react';
import type { Trip } from '@/lib/types';
import { formatMinors } from '@/lib/money';
import { JOURNEY_STAGES, journeyStageIndex } from '@/lib/trip-form';
import { shortId } from '@/lib/tracking';
import { ModeIcon } from '@/components/dashboard/widgets';

export function tripCode(trip: Pick<Trip, 'id' | 'flightNumber'>) {
  return trip.flightNumber?.trim() || `TRP-${shortId(trip.id)}`;
}

export function stageLabel(trip: Pick<Trip, 'status' | 'journeyStage'>) {
  if (trip.status === 'CANCELLED') return 'Cancelled';
  if (trip.status === 'COMPLETED') return JOURNEY_STAGES[JOURNEY_STAGES.length - 1].label;
  return JOURNEY_STAGES[journeyStageIndex(trip.journeyStage)].label;
}

/** Five stars filled to the average, with the count of ratings behind it. */
export function FiveStars({ rating, count, onDark = false, size = 13 }: { rating: number | null; count?: number; onDark?: boolean; size?: number }) {
  if (rating === null) {
    return <span className={clsx('text-[11px]', onDark ? 'text-white/50' : 'text-text-tertiary')}>No delivery ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${rating} out of 5${count ? ` from ${count} deliveries` : ''}`}>
      <span className="relative inline-flex" aria-hidden>
        <span className="flex">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} className={onDark ? 'text-white/25' : 'text-border-strong'} />)}</span>
        <span className="absolute inset-0 flex overflow-hidden" style={{ width: `${(rating / 5) * 100}%` }}>
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} className="shrink-0 fill-accent-signal text-accent-signal" />)}
        </span>
      </span>
      <span className={clsx('text-[11px] font-semi-bold', onDark ? 'text-white' : 'text-text-primary')}>
        {rating.toFixed(1)}
        {count ? <span className={onDark ? 'font-normal text-white/50' : 'font-normal text-text-tertiary'}> ({count})</span> : null}
      </span>
    </span>
  );
}

/** One trip on the list, after the reference's flight cards: meta row, big code, dotted route, earnings. */
export function TripCard({ trip, active, onSelect }: { trip: Trip; active: boolean; onSelect: () => void }) {
  const stage = journeyStageIndex(trip.journeyStage);
  const cancelled = trip.status === 'CANCELLED';
  const done = stage === JOURNEY_STAGES.length - 1;
  const moving = !cancelled && stage > 0 && !done;
  const pct = cancelled ? 0 : (stage / (JOURNEY_STAGES.length - 1)) * 100;
  const packages = trip.packages?.filter((p) => p.status !== 'PROPOSED').length ?? trip.stats?.packagesCarried ?? 0;
  const money = trip.stats?.earned || trip.stats?.bookedFees || 0;
  const dot = cancelled ? 'bg-destructive' : done ? 'bg-success' : moving ? 'bg-accent-signal' : active ? 'bg-white/50' : 'bg-border-strong';

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={clsx(
        'group w-full rounded-[20px] p-4 text-left transition-all duration-300',
        active
          ? 'bg-gradient-to-br from-harbor-900 to-harbor-800 text-white shadow-lg dark:from-harbor-800 dark:to-[#03161b] dark:ring-1 dark:ring-harbor-400/40'
          : 'bg-surface text-text-primary hover:bg-surface-hover'
      )}
    >
      <span className={clsx('grid grid-cols-4 text-center text-[11px] uppercase tracking-wide', active ? 'text-white/60' : 'text-text-tertiary')}>
        <span className={clsx('truncate border-r pr-1', active ? 'border-white/10' : 'border-border')}>{trip.mode}</span>
        <span className={clsx('truncate border-r px-1', active ? 'border-white/10' : 'border-border')}>{trip.international ? 'Intl' : 'Local'}</span>
        <span className={clsx('truncate border-r px-1', active ? 'border-white/10' : 'border-border')}>{trip.capacityKg} kg</span>
        <span className="truncate pl-1">{new Date(trip.departAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </span>

      <span className="mt-3 flex items-center gap-2.5">
        <span className="truncate text-[22px] font-light leading-none tracking-tight" title={tripCode(trip)}>{trip.flightNumber?.trim() || shortId(trip.id)}</span>
        <span
          className={clsx('flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full border-2 px-1 text-[11px] font-semi-bold', active ? 'border-white/80' : 'border-text-primary')}
          title={`${packages} package${packages === 1 ? '' : 's'} carried`}
        >
          {packages}
        </span>
        <span className="relative mx-1 flex h-3 min-w-[32px] flex-1 items-center" aria-hidden>
          <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-white' : 'bg-text-primary')} />
          <span className={clsx('h-0 flex-1 border-t-2 border-dotted', active ? 'border-white/40' : 'border-border-strong')} />
          <span
            className={clsx('absolute h-2 w-2 -translate-x-1/2 rounded-full transition-[left] duration-700', dot, moving && 'tr-pulse-dot')}
            style={{ left: `${Math.max(4, pct)}%` }}
          />
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-body-s font-semi-bold">
          <ModeIcon mode={trip.mode} size={16} /> {trip.stats?.kgCarried ?? 0} kg
        </span>
      </span>

      <span className="mt-2.5 flex items-center justify-between gap-2 text-body-s">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{trip.originCity} → {trip.destCity}</span>
        </span>
        <span className="shrink-0 font-semi-bold">{formatMinors(money, trip.currency).replace(/\.00$/, '')}</span>
      </span>

      <span className="mt-2 flex items-center justify-between gap-2">
        <FiveStars rating={trip.stats?.rating ?? null} count={trip.stats?.ratings} onDark={active} size={12} />
        <span className={clsx('text-[11px] font-semi-bold uppercase tracking-wide', cancelled ? 'text-destructive' : done ? (active ? 'text-white/70' : 'text-success-text') : moving ? 'text-accent-signal' : active ? 'text-white/60' : 'text-text-tertiary')}>
          {stageLabel(trip)}
        </span>
      </span>
    </button>
  );
}
