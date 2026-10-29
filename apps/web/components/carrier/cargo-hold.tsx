'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { FileText, Plus } from 'lucide-react';
import type { TripPackage } from '@/lib/types';
import { formatMinors } from '@/lib/money';
import { PACKAGE_STATUS } from '@/lib/trip-form';
import { declarationPath } from '@/lib/declaration';
import { shortId } from '@/lib/tracking';
import { Stars } from '@/components/dashboard/widgets';

// The reference's aircraft cargo plan, for any vehicle: a top-down hull with
// one bay per package (taller = heavier), requests as dashed bays and the
// space still for sale hatched. Keyframes: `tr-rise` in globals.css.

const HATCH = 'repeating-linear-gradient(135deg, hsl(var(--border) / 0.9) 0 1px, transparent 1px 9px)';

/** Hull outline per mode: a plane's rounded nose, a bus's flat windscreen, a train's tapered cab. */
const HULL: Record<string, { shape: string; nose: React.ReactNode }> = {
  AIR: {
    shape: 'rounded-t-[50%_120px] rounded-b-[36px]',
    nose: (
      <div aria-hidden className="mx-auto mb-4 mt-9 flex w-[58%] justify-center gap-1.5">
        {[-14, -6, 0, 6, 14].map((r, i) => (
          <span key={i} className="h-4 w-5 rounded-[5px] bg-border" style={{ transform: `rotate(${r}deg) translateY(${Math.abs(r) / 2}px)` }} />
        ))}
      </div>
    ),
  },
  ROAD: {
    shape: 'rounded-t-[40px] rounded-b-[22px]',
    nose: (
      <div aria-hidden className="mx-auto mb-4 mt-4 h-7 w-[78%] rounded-t-[22px] rounded-b-md bg-border" />
    ),
  },
  RAIL: {
    shape: 'rounded-t-[50%_70px] rounded-b-[14px]',
    nose: (
      <div aria-hidden className="mx-auto mb-4 mt-7 flex w-[62%] justify-center gap-2">
        <span className="h-5 w-[45%] rounded-md bg-border" />
        <span className="h-5 w-[45%] rounded-md bg-border" />
      </div>
    ),
  },
};

export function bayLabel(index: number) {
  return `BAY-${String(index + 1).padStart(2, '0')}`;
}

export function CargoHold({
  mode,
  capacityKg,
  remainingKg,
  packages,
  selected,
  onSelect,
}: {
  mode: string;
  capacityKg: number;
  remainingKg: number;
  packages: TripPackage[];
  selected: string | null;
  onSelect: (legId: string) => void;
}) {
  const hull = HULL[mode] ?? HULL.ROAD;
  // Bay height follows weight, inside a hold that always has room to read.
  const px = (kg: number) => Math.max(62, Math.min(150, (kg / Math.max(capacityKg, 1)) * 420));

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* wings / mirrors, behind the hull */}
      {mode === 'AIR' && (
        <div aria-hidden className="absolute inset-x-[-34%] top-[38%] h-24 rounded-[50%] bg-surface [clip-path:polygon(0_70%,50%_0,100%_70%,100%_100%,0_100%)]" />
      )}
      <div className={clsx('relative border-2 border-border bg-card px-4 pb-5 shadow-sm', hull.shape)}>
        {hull.nose}
        <ol className="flex flex-col gap-2" aria-label="Bag hold">
          {packages.map((p, i) => {
            const active = selected === p.legId;
            const request = p.status === 'PROPOSED';
            return (
              <li key={p.legId} className="tr-rise" style={{ animationDelay: `${i * 70}ms` }}>
                <button
                  type="button"
                  onClick={() => onSelect(p.legId)}
                  aria-pressed={active}
                  aria-label={`${bayLabel(i)}: ${p.category}, ${p.weightKg} kg, ${PACKAGE_STATUS[p.status] ?? p.status}`}
                  className={clsx(
                    'relative flex w-full flex-col items-center justify-center rounded-xl border text-center transition-all',
                    active
                      ? 'border-harbor-900 bg-gradient-to-br from-harbor-900 to-harbor-800 text-white shadow-lg dark:border-harbor-300'
                      : request
                        ? 'border-dashed border-border-strong bg-card text-text-secondary hover:border-text-tertiary'
                        : 'border-border bg-surface text-text-primary hover:border-border-strong'
                  )}
                  style={{ height: px(p.weightKg) }}
                >
                  <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semi-bold uppercase tracking-wider', active ? 'bg-white/10' : 'bg-card')}>
                    {bayLabel(i)}
                  </span>
                  <span className="mt-1 text-body-s font-semi-bold">
                    <span className="capitalize">{p.category}</span> · {p.weightKg} kg
                  </span>
                  <span className={clsx('text-[11px]', active ? 'text-white/70' : 'text-text-tertiary')}>{PACKAGE_STATUS[p.status] ?? p.status}</span>
                </button>
              </li>
            );
          })}
          {remainingKg > 0 && (
            <li className="tr-rise" style={{ animationDelay: `${packages.length * 70}ms` }}>
              <div
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border text-center"
                style={{ height: px(remainingKg), backgroundImage: HATCH }}
              >
                <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-semi-bold uppercase tracking-wider text-text-secondary">
                  Free · {remainingKg} kg
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-text-secondary">
                  <Plus size={14} />
                </span>
              </div>
            </li>
          )}
          {packages.length === 0 && remainingKg <= 0 && (
            <li className="rounded-xl border border-dashed border-border py-8 text-center text-body-s text-text-tertiary">Nothing booked on this trip.</li>
          )}
        </ol>
      </div>
    </div>
  );
}

/** The right-hand manifest: one cell per package, dark when picked, with its rating and declaration. */
export function PackageGrid({
  packages,
  currency,
  selected,
  onSelect,
}: {
  packages: TripPackage[];
  currency: string;
  selected: string | null;
  onSelect: (legId: string) => void;
}) {
  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-6 text-center text-body-s text-text-tertiary" style={{ backgroundImage: HATCH }}>
        <span className="rounded-full bg-card px-3 py-1">No packages yet. Requests land here as senders book.</span>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2">
      {packages.map((p, i) => {
        const active = selected === p.legId;
        return (
          <li key={p.legId} className="tr-rise min-w-0" style={{ animationDelay: `${i * 60}ms` }}>
            <div
              className={clsx(
                'flex h-full flex-col rounded-xl border p-3 transition-colors',
                active ? 'border-harbor-900 bg-gradient-to-br from-harbor-900 to-harbor-800 text-white dark:border-harbor-300' : 'border-border bg-card'
              )}
            >
              <button type="button" onClick={() => onSelect(p.legId)} aria-pressed={active} className="text-left">
                <span className="flex items-center justify-between gap-2 text-[11px] font-semi-bold uppercase tracking-wider">
                  <span className={active ? 'text-white/80' : p.status === 'PROPOSED' ? 'text-warning-text' : 'text-text-tertiary'}>{bayLabel(i)}</span>
                  <span className={active ? 'text-white/80' : 'text-text-tertiary'}>{p.weightKg} kg</span>
                </span>
                <span className="mt-1.5 block text-body-m font-semi-bold capitalize">{p.category}</span>
                <span className={clsx('block text-body-s', active ? 'text-white/70' : 'text-text-tertiary')}>
                  {PACKAGE_STATUS[p.status] ?? p.status} · {formatMinors(p.fee, currency)}
                </span>
              </button>
              <span className={clsx('mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px]', active ? 'border-white/10' : 'border-border')}>
                {p.rating ? (
                  <span className="flex items-center gap-1"><Stars rating={p.rating} onDark={active} /></span>
                ) : (
                  <span className={active ? 'text-white/60' : 'text-text-tertiary'}>{p.status === 'SETTLED' ? 'Not rated yet' : `#${shortId(p.shipmentId)}`}</span>
                )}
                {p.declaration && (
                  <Link
                    href={declarationPath(p.shipmentId)}
                    className={clsx('inline-flex items-center gap-1 font-semi-bold hover:underline', active ? 'text-accent-signal' : 'text-text-link dark:text-harbor-200')}
                  >
                    <FileText size={12} /> Declaration
                  </Link>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
