'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronDown, CircleAlert, Package, Plus, Search } from 'lucide-react';
import { GROUPS, STATUS_LABEL, groupOf, journeyProgress, type ShipmentGroup, type TrackLeg } from '@/lib/tracking';
import { HandleAvatar } from '@/components/dashboard/widgets';
import { EmptyState } from '@/components/empty-state';

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

const DOT: Record<ShipmentGroup, string> = {
  action: 'bg-accent-signal',
  moving: 'bg-info',
  pickup: 'bg-text-tertiary',
  delivered: 'bg-success',
  closed: 'bg-border-strong',
};

function Row({ s, active }: { s: ListShipment; active: boolean }) {
  const group = groupOf(s.status);
  const courier = (s.legs.find((l) => l.status === 'IN_CUSTODY') ?? s.legs[0])?.trip.carrier?.handle;
  const pct = Math.round(journeyProgress(s.status, s.legs) * 100);
  return (
    <Link
      href={`/shipments/${s.id}`}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'tr-row group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
        active ? 'bg-surface-selected' : 'hover:bg-surface-hover'
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-accent-signal tr-slide-in" aria-hidden />}
      <span className="relative">
        {courier ? (
          <HandleAvatar handle={courier} size={38} className="rounded-full" />
        ) : (
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-muted text-icon-muted">
            <Package size={17} />
          </span>
        )}
        <span
          className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card', DOT[group], group === 'moving' && 'tr-live')}
          aria-hidden
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-m font-semi-bold text-text-primary">
          {s.originCity} → {s.destCity}
        </span>
        <span className="block truncate text-[12px] text-text-tertiary">
          <span className="capitalize">{s.category}</span> · {s.weightKg} kg{courier ? ` · @${courier}` : ''}
        </span>
        {group === 'moving' && (
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-info transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-semi-bold uppercase tracking-wider text-text-tertiary">
        {group === 'action' && <CircleAlert size={13} className="text-accent-signal" />}
        {STATUS_LABEL[s.status] ?? s.status}
      </span>
    </Link>
  );
}

export function ShipmentList({ shipments, selectedId }: { shipments: ListShipment[] | null; selectedId: string | null }) {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Set<ShipmentGroup>>(new Set(['closed']));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^@/, '');
    if (!shipments) return [];
    if (!term) return shipments;
    return shipments.filter((s) =>
      [s.originCity, s.destCity, s.category, ...s.legs.map((l) => l.trip.carrier?.handle ?? '')].some((v) => v.toLowerCase().includes(term))
    );
  }, [shipments, q]);

  const toggle = (g: ShipmentGroup) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-3">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <Search size={15} className="text-icon-muted" />
          <span className="sr-only">Search shipments</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="City, item or @courier"
            className="w-full border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {shipments === null ? (
          <div className="space-y-2 px-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <EmptyState
            art="parcel"
            size="sm"
            tone="plain"
            title="No shipments yet"
            body="Packages you send show up here with live tracking."
            cta={{ href: '/search', label: 'Send a package' }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState art="search" size="sm" tone="plain" title="Nothing matches" body={`No shipment for “${q}”.`} />
        ) : (
          GROUPS.map(({ id, label }) => {
            const items = filtered.filter((s) => groupOf(s.status) === id);
            if (!items.length) return null;
            const isClosed = closed.has(id);
            return (
              <section key={id} className="mb-3">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-expanded={!isClosed}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] font-semi-bold uppercase tracking-[0.12em] text-text-tertiary hover:text-text-secondary"
                >
                  <span className={clsx('h-1.5 w-1.5 rounded-full', DOT[id])} />
                  {label}
                  <span className="text-text-tertiary/70">{items.length}</span>
                  <ChevronDown size={14} className={clsx('ml-auto transition-transform', isClosed && '-rotate-90')} />
                </button>
                {!isClosed && (
                  <div className="space-y-0.5">
                    {items.map((s) => (
                      <Row key={s.id} s={s} active={s.id === selectedId} />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3">
        <Link
          href="/search"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus"
        >
          <Plus size={16} className="text-accent-signal" /> Send a new package
        </Link>
      </div>
    </div>
  );
}
