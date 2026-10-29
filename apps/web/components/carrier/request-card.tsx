'use client';

import React from 'react';
import clsx from 'clsx';
import { Hourglass, MapPin } from 'lucide-react';
import { formatMinors } from '@/lib/money';
import { PACKAGE_STATUS, answerWindow, requestBucket } from '@/lib/trip-form';
import { shortId } from '@/lib/tracking';
import { HandleAvatar, ModeIcon } from '@/components/dashboard/widgets';

export interface RequestCardLeg {
  id: string;
  status: string;
  fee: number;
  currency: string;
  acceptDeadline: string;
  acceptedAt?: string | null;
  trip: { originCity: string; destCity: string; departAt: string; mode: string };
  shipment: { id: string; category: string; weightKg: number; sender: { handle: string | null } };
}

const STATUS_TONE: Record<string, { text: string; dot: string }> = {
  waiting: { text: 'text-warning-text', dot: 'bg-accent-signal' },
  active: { text: 'text-info-text', dot: 'bg-info' },
  past: { text: 'text-success-text', dot: 'bg-success' },
  declined: { text: 'text-destructive', dot: 'bg-destructive' },
};

export function requestLabel(leg: { status: string; acceptedAt?: string | null }) {
  if (leg.status === 'EXPIRED') return leg.acceptedAt ? 'Cut short' : 'Lapsed';
  if (leg.status === 'REJECTED') return 'Declined';
  return PACKAGE_STATUS[leg.status] ?? leg.status;
}

/**
 * One carry request on the list, in the My trips card language: meta row,
 * big shipment code with the sender's avatar, a dotted line that drains as the
 * 48-hour answer clock runs out, then route and fee.
 */
export function RequestCard({ leg, active }: { leg: RequestCardLeg; active: boolean }) {
  const bucket = requestBucket(leg);
  const tone = STATUS_TONE[bucket];
  const handle = leg.shipment.sender.handle ?? 'sender';
  const clock = bucket === 'waiting' ? answerWindow(leg.acceptDeadline) : null;
  const divider = active ? 'border-white/10' : 'border-border';

  return (
    <span
      className={clsx(
        'block w-full rounded-[20px] p-4 text-left transition-colors duration-300',
        active
          ? 'bg-gradient-to-br from-harbor-900 to-harbor-800 text-white shadow-lg dark:from-harbor-800 dark:to-[#03161b] dark:ring-1 dark:ring-harbor-400/40'
          : 'bg-surface text-text-primary hover:bg-surface-hover'
      )}
    >
      <span className={clsx('grid grid-cols-4 text-center text-[11px] uppercase tracking-wide', active ? 'text-white/60' : 'text-text-tertiary')}>
        <span className={clsx('truncate border-r pr-1', divider)}>{leg.trip.mode}</span>
        <span className={clsx('truncate border-r px-1', divider)}>{leg.shipment.category}</span>
        <span className={clsx('truncate border-r px-1', divider)}>{leg.shipment.weightKg} kg</span>
        <span className="truncate pl-1">{new Date(leg.trip.departAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </span>

      <span className="mt-3 flex items-center gap-2.5">
        <HandleAvatar handle={handle} size={30} className="shrink-0 rounded-full" />
        <span className="min-w-0 truncate text-[22px] font-light leading-none tracking-tight">{shortId(leg.shipment.id)}</span>
        <span className="relative mx-1 flex h-3 min-w-[28px] flex-1 items-center" aria-hidden>
          <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-white' : 'bg-text-primary')} />
          <span className={clsx('h-0 flex-1 border-t-2 border-dotted', active ? 'border-white/40' : 'border-border-strong')} />
          <span
            className={clsx('absolute h-2 w-2 -translate-x-1/2 rounded-full transition-[left] duration-700', tone.dot, bucket === 'waiting' && 'tr-pulse-dot')}
            style={{ left: `${clock ? Math.max(4, clock.share * 100) : bucket === 'declined' ? 4 : 96}%` }}
          />
        </span>
        <ModeIcon mode={leg.trip.mode} size={16} />
      </span>

      <span className="mt-2.5 flex items-center justify-between gap-2 text-body-s">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{leg.trip.originCity} → {leg.trip.destCity}</span>
        </span>
        <span className="shrink-0 font-semi-bold">{formatMinors(leg.fee, leg.currency).replace(/\.00$/, '')}</span>
      </span>

      <span className="mt-2 flex items-center justify-between gap-2">
        <span className={clsx('truncate text-[11px]', active ? 'text-white/60' : 'text-text-tertiary')}>@{handle}</span>
        {clock ? (
          <span className={clsx('flex shrink-0 items-center gap-1 text-[11px] font-semi-bold uppercase tracking-wide', clock.urgent ? (active ? 'text-accent-signal' : 'text-destructive') : active ? 'text-accent-signal' : 'text-warning-text')}>
            <Hourglass size={11} /> {clock.label}
          </span>
        ) : (
          <span className={clsx('shrink-0 text-[11px] font-semi-bold uppercase tracking-wide', active ? 'text-white/70' : tone.text)}>{requestLabel(leg)}</span>
        )}
      </span>
    </span>
  );
}
