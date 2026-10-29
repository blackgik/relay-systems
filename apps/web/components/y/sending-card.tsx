'use client';

import React from 'react';
import clsx from 'clsx';
import { CircleAlert, MapPin, Package } from 'lucide-react';
import { formatMinors } from '@/lib/money';
import { STATUS_LABEL, groupOf, journeyProgress, shortId, type TrackLeg } from '@/lib/tracking';
import { HandleAvatar, ModeIcon } from '@/components/dashboard/widgets';

export interface ListShipment {
  id: string;
  originCity: string;
  destCity: string;
  category: string;
  weightKg: number;
  status: string;
  createdAt: string;
  legs: TrackLeg[];
  lastEvent: { type: string; occurredAt: string } | null;
}

const TONE: Record<string, { text: string; dot: string }> = {
  action: { text: 'text-warning-text', dot: 'bg-accent-signal' },
  moving: { text: 'text-info-text', dot: 'bg-info' },
  pickup: { text: 'text-text-tertiary', dot: 'bg-text-tertiary' },
  delivered: { text: 'text-success-text', dot: 'bg-success' },
  closed: { text: 'text-text-tertiary', dot: 'bg-border-strong' },
};

/**
 * One package you are sending, in the same card language as carry requests
 * and trips: meta row, courier avatar and shipment code, a dotted line whose
 * dot sits at the real journey progress, then route and price.
 */
export function SendingCard({ s, active }: { s: ListShipment & { totalPrice?: number | null; currency?: string }; active: boolean }) {
  const group = groupOf(s.status);
  const tone = TONE[group];
  const leg = s.legs.find((l) => l.status === 'IN_CUSTODY') ?? s.legs[0];
  const courier = leg?.trip.carrier?.handle ?? null;
  const pct = journeyProgress(s.status, s.legs) * 100;
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
        <span className={clsx('truncate border-r pr-1', divider)}>{leg?.trip.mode ?? '—'}</span>
        <span className={clsx('truncate border-r px-1', divider)}>{s.category}</span>
        <span className={clsx('truncate border-r px-1', divider)}>{s.weightKg} kg</span>
        <span className="truncate pl-1">{new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </span>

      <span className="mt-3 flex items-center gap-2.5">
        {courier ? (
          <HandleAvatar handle={courier} size={30} className="shrink-0 rounded-full" />
        ) : (
          <span className={clsx('flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full', active ? 'bg-white/10' : 'bg-muted text-icon-muted')}>
            <Package size={15} />
          </span>
        )}
        <span className="min-w-0 truncate text-[22px] font-light leading-none tracking-tight">{shortId(s.id)}</span>
        <span className="relative mx-1 flex h-3 min-w-[28px] flex-1 items-center" aria-hidden>
          <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-white' : 'bg-text-primary')} />
          <span className={clsx('h-0 flex-1 border-t-2 border-dotted', active ? 'border-white/40' : 'border-border-strong')} />
          <span
            className={clsx('absolute h-2 w-2 -translate-x-1/2 rounded-full transition-[left] duration-700', tone.dot, group === 'moving' && 'tr-pulse-dot')}
            style={{ left: `${Math.min(96, Math.max(4, pct))}%` }}
          />
        </span>
        {leg ? <ModeIcon mode={leg.trip.mode} size={16} /> : <Package size={16} />}
      </span>

      <span className="mt-2.5 flex items-center justify-between gap-2 text-body-s">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{s.originCity} → {s.destCity}</span>
        </span>
        {s.totalPrice ? <span className="shrink-0 font-semi-bold">{formatMinors(s.totalPrice, s.currency ?? 'NGN').replace(/\.00$/, '')}</span> : null}
      </span>

      <span className="mt-2 flex items-center justify-between gap-2">
        <span className={clsx('truncate text-[11px]', active ? 'text-white/60' : 'text-text-tertiary')}>{courier ? `@${courier}` : 'No courier yet'}</span>
        <span className={clsx('flex shrink-0 items-center gap-1 text-[11px] font-semi-bold uppercase tracking-wide', active ? (group === 'action' ? 'text-accent-signal' : 'text-white/70') : tone.text)}>
          {group === 'action' && <CircleAlert size={12} />}
          {STATUS_LABEL[s.status] ?? s.status}
        </span>
      </span>
    </span>
  );
}
