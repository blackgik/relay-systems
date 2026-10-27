'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarClock, PackageCheck } from 'lucide-react';
import type { BoardItem } from '@/lib/dashboard-types';
import { formatMinors } from '@/lib/money';
import { VehicleArt } from './vehicle';
import { HandleAvatar, LoadBar, ModeIcon, PhasePill, RouteStrip, Stars, VerifiedBadge, formatDay, formatTime } from './widgets';

/** Board card: who's carrying, what's on hand, what's left, where they're going. */
export function CourierCard({ trip }: { trip: BoardItem }) {
  const loadPct = trip.capacityKg ? (trip.bookedKg / trip.capacityKg) * 100 : 0;
  const started = trip.phase === 'IN_TRANSIT';
  const handle = trip.handle ?? 'courier';

  return (
    <article className="group flex flex-col rounded-[22px] border border-border/70 bg-surface p-2 transition-shadow hover:shadow-2lg">
      <div className="relative flex min-h-[132px] gap-2 overflow-hidden rounded-[18px] px-3 pb-2 pt-3">
        <div className="relative z-10 flex flex-col">
          <PhasePill phase={trip.phase} mode={trip.mode} />
          <Link href={`/dashboard/people/${handle}`} className="mt-4 flex items-center gap-2" aria-label={`View @${handle}'s profile`}>
            <HandleAvatar handle={handle} size={30} />
            <span className="text-title-m text-text-primary group-hover:underline">@{handle}</span>
          </Link>
          <p className="mt-1.5 text-body-s text-text-secondary">
            {trip.bookedKg} kg booked · ({Math.round(loadPct)}%)
          </p>
        </div>
        <div className="pointer-events-none absolute -right-4 bottom-0 h-[92px] w-[190px] transition-transform duration-500 group-hover:-translate-x-1">
          <VehicleArt mode={trip.mode} weight={trip.capacityKg} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-[16px] border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <RouteStrip from={trip.originCity} to={trip.destCity} />
          <span className="flex shrink-0 items-center gap-1.5 text-body-s text-text-secondary">
            <ModeIcon mode={trip.mode} size={14} />
            {trip.flightNumber ?? (trip.mode === 'RAIL' ? 'Rail' : 'Road')}
          </span>
        </div>

        <p className="flex items-center gap-1.5 text-body-s text-text-tertiary">
          <CalendarClock size={13} />
          {started ? `Left ${formatTime(trip.departAt)} · lands ${formatTime(trip.arriveAt)}` : `Departs ${formatDay(trip.departAt)}, ${formatTime(trip.departAt)}`}
        </p>

        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface px-3 py-2.5 text-body-s">
          <div>
            <dt className="text-text-tertiary">Goods on hand</dt>
            <dd className="font-semi-bold text-text-primary">
              {trip.packagesOnHand} pkg{trip.packagesOnHand === 1 ? '' : 's'} · {trip.kgOnHand} kg
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Can still collect</dt>
            <dd className="font-semi-bold text-text-primary">{trip.remainingKg} kg</dd>
          </div>
        </dl>

        {started ? (
          <LoadBar pct={trip.progress * 100} label="Trip progress" />
        ) : (
          <LoadBar pct={loadPct} label="Load progress" />
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-2">
            <Stars rating={trip.rating} />
            <VerifiedBadge tier={trip.tier} />
          </span>
          {trip.isMine ? (
            <span className="text-body-s font-semi-bold text-text-tertiary">Your trip</span>
          ) : started || trip.remainingKg <= 0 ? (
            <span className="text-body-s text-text-tertiary">{started ? 'Not taking new parcels' : 'Full'}</span>
          ) : (
            <Link
              href={`/search?from=${encodeURIComponent(trip.originCity)}&to=${encodeURIComponent(trip.destCity)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus"
            >
              <PackageCheck size={14} /> {formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}/kg
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
