'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Luggage, Plane, Search, Truck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import type { BoardItem } from '@/lib/dashboard-types';
import { formatMinors } from '@/lib/money';
import { CourierCard } from '@/components/dashboard/courier-card';
import {
  Card,
  EmptyState,
  HandleAvatar,
  ModeIcon,
  PhasePill,
  RouteStrip,
  Segmented,
  Stars,
  StatStrip,
  VerifiedBadge,
  formatDay,
} from '@/components/dashboard/widgets';

type Phase = 'all' | 'accepting' | 'in_transit';
type View = 'grid' | 'list';

export default function CourierBoard() {
  const { user, token, loading } = useRequireAuth();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('all');
  const [view, setView] = useState<View>('grid');
  const [items, setItems] = useState<BoardItem[] | null>(null);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q') ?? '';
    setQ(initial);
    setQuery(initial);
    try {
      const v = localStorage.getItem('relay-board-view');
      if (v === 'grid' || v === 'list') setView(v);
    } catch {
      /* ignore */
    }
  }, []);

  // Debounce typing so the board doesn't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams({ take: '60' });
    if (query) params.set('q', query.replace(/^@/, ''));
    if (phase !== 'all') params.set('phase', phase);
    setItems(null);
    api<BoardItem[]>(`/couriers/board?${params}`, { token })
      .then(setItems)
      .catch(() => setItems([]));
  }, [token, query, phase]);

  const totals = useMemo(() => {
    const list = items ?? [];
    return {
      couriers: new Set(list.map((t) => t.handle)).size,
      freeKg: list.reduce((s, t) => s + (t.phase === 'IN_TRANSIT' ? 0 : t.remainingKg), 0),
      moving: list.filter((t) => t.phase === 'IN_TRANSIT').length,
      air: list.filter((t) => t.mode === 'AIR').length,
    };
  }, [items]);

  if (!loading && !user) return null;

  const setViewSaved = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('relay-board-view', v);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5">
      <Card title="Network right now" sub="Open and moving trips from verified travellers">
        <StatStrip
          items={[
            { icon: Users, label: 'Couriers listed', value: totals.couriers, sub: 'Shown by username only' },
            { icon: Luggage, label: 'Space to book', value: `${totals.freeKg} kg`, sub: 'Across trips accepting parcels' },
            { icon: Truck, label: 'On the road', value: totals.moving, sub: 'Trips already started' },
            { icon: Plane, label: 'International', value: totals.air, sub: 'Air legs listed' },
          ]}
        />
      </Card>

      <Card
        title="Couriers currently accepting"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
              <Search size={14} className="text-icon-muted" />
              <span className="sr-only">Search by city or username</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="City or @username"
                className="w-40 border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0 sm:w-52"
              />
            </label>
            <Segmented<Phase>
              label="Trip status"
              value={phase}
              onChange={setPhase}
              options={[
                { value: 'all', label: 'All' },
                { value: 'accepting', label: 'Accepting' },
                { value: 'in_transit', label: 'On the road' },
              ]}
            />
            <Segmented<View>
              label="Layout"
              value={view}
              onChange={setViewSaved}
              options={[
                { value: 'grid', label: <><LayoutGrid size={14} /> Grid</> },
                { value: 'list', label: <><List size={14} /> List</> },
              ]}
            />
          </div>
        }
      >
        {!items ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-[22px] bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No couriers match"
            body={query ? `Nobody is listed for “${query}” right now.` : 'No open trips yet.'}
            cta={{ href: '/trips/new', label: 'Post your own trip' }}
          />
        ) : view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((t) => (
              <CourierCard key={t.tripId} trip={t} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-body-s">
              <thead className="text-text-tertiary">
                <tr className="border-b border-border">
                  <th className="py-2.5 font-medium">Courier</th>
                  <th className="py-2.5 font-medium">Route</th>
                  <th className="py-2.5 font-medium">Status</th>
                  <th className="py-2.5 font-medium">On hand</th>
                  <th className="py-2.5 font-medium">Can collect</th>
                  <th className="py-2.5 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((t) => (
                  <tr key={t.tripId} className="hover:bg-surface-hover">
                    <td className="py-3">
                      <Link href={`/dashboard/people/${t.handle}`} className="flex items-center gap-2.5">
                        <HandleAvatar handle={t.handle ?? 'courier'} size={30} />
                        <span>
                          <span className="block font-semi-bold text-text-primary">@{t.handle}</span>
                          <span className="flex items-center gap-1.5"><Stars rating={t.rating} /> <VerifiedBadge tier={t.tier} /></span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3">
                      <RouteStrip from={t.originCity} to={t.destCity} size="sm" />
                      <span className="mt-0.5 flex items-center gap-1 text-[12px] text-text-tertiary">
                        <ModeIcon mode={t.mode} size={12} /> {formatDay(t.departAt)}
                      </span>
                    </td>
                    <td className="py-3"><PhasePill phase={t.phase} mode={t.mode} /></td>
                    <td className="py-3 text-text-primary">{t.packagesOnHand} pkg · {t.kgOnHand} kg</td>
                    <td className="py-3 text-text-primary">{t.phase === 'IN_TRANSIT' ? '—' : `${t.remainingKg} kg`}</td>
                    <td className="py-3 text-right font-semi-bold text-text-primary">{formatMinors(t.pricePerKg, t.currency).replace(/\.00$/, '')}/kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
