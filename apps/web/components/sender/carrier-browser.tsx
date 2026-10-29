'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarClock, LayoutGrid, List, PackageCheck, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { BoardItem } from '@/lib/dashboard-types';
import { formatMinors } from '@/lib/money';
import {
  JOURNEY_LABEL,
  distinctCities,
  filterCarriers,
  isAccepting,
  journeyHours,
  notBookableReason,
  type CarrierSort,
  type JourneyBucket,
} from '@/lib/carrier-filters';
import {
  EmptyState,
  HandleAvatar,
  LoadBar,
  ModeIcon,
  PhasePill,
  RouteStrip,
  Segmented,
  Stars,
  VerifiedBadge,
  formatDay,
  formatTime,
} from '@/components/dashboard/widgets';

const selectClass =
  'rounded-full border border-border bg-card px-3 py-2 text-body-s text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring';

function CarrierCard({ trip, onRequest }: { trip: BoardItem; onRequest: (t: BoardItem) => void }) {
  const handle = trip.handle ?? 'courier';
  const hours = Math.round(journeyHours(trip) * 10) / 10;
  const loadPct = trip.capacityKg ? (trip.bookedKg / trip.capacityKg) * 100 : 0;
  const bookable = isAccepting(trip) && !trip.isMine;
  const blocked = notBookableReason(trip);
  return (
    <article className="flex h-full flex-1 flex-col rounded-[22px] border border-border/70 bg-card p-5 shadow-light">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/dashboard/people/${handle}`} className="flex min-w-0 items-center gap-3" aria-label={`View @${handle}'s profile`}>
          <HandleAvatar handle={handle} size={44} />
          <span className="min-w-0">
            <span className="block truncate text-title-s text-text-primary hover:underline">@{handle}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Stars rating={trip.rating} /> <VerifiedBadge tier={trip.tier} />
              {trip.travelVerified && <span className="text-[11px] font-semi-bold text-success-text">Travel verified</span>}
            </span>
          </span>
        </Link>
        <PhasePill phase={trip.phase} mode={trip.mode} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <RouteStrip from={trip.originCity} to={trip.destCity} />
        <span className="flex shrink-0 items-center gap-1.5 text-body-s text-text-secondary">
          <ModeIcon mode={trip.mode} size={14} /> {trip.flightNumber ?? (trip.mode === 'RAIL' ? 'Rail' : trip.mode === 'AIR' ? 'Air' : 'Road')}
        </span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-body-s text-text-tertiary">
        <CalendarClock size={13} /> Departs {formatDay(trip.departAt)}, {formatTime(trip.departAt)} · {hours}h journey
        {trip.international ? ' · International' : ''}
      </p>
      {trip.bookable && (
        <p className="mt-1 text-[12px] text-text-tertiary">
          Requests close {formatDay(trip.requestBy)}, {formatTime(trip.requestBy)} — the courier needs time to accept.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {trip.categories.map((c) => (
          <span key={c} className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium capitalize text-text-secondary">{c}</span>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-surface px-3 py-2.5 text-body-s">
        <div>
          <dt className="text-text-tertiary">Price</dt>
          <dd className="font-semi-bold text-text-primary">{formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}/kg</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Space left</dt>
          <dd className="font-semi-bold text-text-primary">{trip.remainingKg} kg</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">On hand</dt>
          <dd className="font-semi-bold text-text-primary">{trip.packagesOnHand} pkg · {trip.kgOnHand} kg</dd>
        </div>
      </dl>
      <div className="mt-3"><LoadBar pct={loadPct} label="Bag filled" right={`${trip.bookedKg}/${trip.capacityKg} kg`} /></div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link href={`/dashboard/people/${handle}`} className="rounded-full border border-border px-3.5 py-2 text-body-s font-semi-bold text-text-primary hover:bg-surface">
          View courier
        </Link>
        {trip.isMine ? (
          <span className="ml-auto text-body-s font-semi-bold text-text-tertiary">Your trip</span>
        ) : (
          <button type="button" disabled={!bookable} onClick={() => onRequest(trip)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus disabled:cursor-not-allowed disabled:opacity-50">
            <PackageCheck size={14} />
            {blocked ?? `Request · ${formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}/kg`}
          </button>
        )}
      </div>
    </article>
  );
}

export type BrowserPhase = 'accepting' | 'in_transit';

/** Compact row for the list layout. */
function CarrierRow({ trip, onRequest }: { trip: BoardItem; onRequest: (t: BoardItem) => void }) {
  const handle = trip.handle ?? 'courier';
  const bookable = isAccepting(trip) && !trip.isMine;
  const blocked = notBookableReason(trip);
  return (
    <article className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-light">
      <Link href={`/dashboard/people/${handle}`} className="flex min-w-0 items-center gap-2.5">
        <HandleAvatar handle={handle} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-body-m font-semi-bold text-text-primary">@{handle}</span>
          <span className="flex items-center gap-1.5"><Stars rating={trip.rating} /><VerifiedBadge tier={trip.tier} /></span>
        </span>
      </Link>
      <span className="flex min-w-0 flex-1 basis-48 items-center gap-2">
        <RouteStrip from={trip.originCity} to={trip.destCity} size="sm" />
        <ModeIcon mode={trip.mode} size={13} />
      </span>
      <span className="text-body-s text-text-tertiary">{formatDay(trip.departAt)}, {formatTime(trip.departAt)}</span>
      <span className="text-body-s font-semi-bold text-text-primary">{trip.remainingKg} kg free</span>
      {trip.isMine ? (
        <span className="ml-auto text-body-s font-semi-bold text-text-tertiary">Your trip</span>
      ) : (
        <button type="button" disabled={!bookable} onClick={() => onRequest(trip)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus disabled:cursor-not-allowed disabled:opacity-50">
          <PackageCheck size={14} />
          {blocked ?? `${formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}/kg`}
        </button>
      )}
    </article>
  );
}

export function CarrierBrowser({
  token,
  phase = 'accepting',
  initialOrigin = '',
  initialDestination = '',
  initialQuery = '',
  onRequest,
  refreshKey = 0,
}: {
  token: string | null;
  /** Couriers taking requests now, or couriers already on the road (shown for reference). */
  phase?: BrowserPhase;
  initialOrigin?: string;
  initialDestination?: string;
  /** Prefill from a `?q=` link, e.g. the sidebar search. */
  initialQuery?: string;
  onRequest: (trip: BoardItem) => void;
  /** Bump after a request is sent so space-left figures reload. */
  refreshKey?: number;
}) {
  const moving = phase === 'in_transit';
  const [all, setAll] = useState<BoardItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('all');
  const [destination, setDestination] = useState('all');
  const [journey, setJourney] = useState<JourneyBucket | 'all'>('all');
  const [sort, setSort] = useState<CarrierSort>('departSoon');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => { if (initialOrigin) setOrigin(initialOrigin); }, [initialOrigin]);
  useEffect(() => { if (initialDestination) setDestination(initialDestination); }, [initialDestination]);
  useEffect(() => { if (initialQuery) setQuery(initialQuery); }, [initialQuery]);
  useEffect(() => {
    try {
      const v = localStorage.getItem('relay-board-view');
      if (v === 'grid' || v === 'list') setView(v);
    } catch { /* private mode */ }
  }, []);
  const saveView = (v: 'grid' | 'list') => {
    setView(v);
    try { localStorage.setItem('relay-board-view', v); } catch { /* private mode */ }
  };

  useEffect(() => {
    if (!token) return;
    setAll(null);
    api<BoardItem[]>(`/couriers/board?take=60&phase=${phase}`, { token })
      .then(setAll)
      .catch(() => { setFailed(true); setAll([]); });
  }, [token, refreshKey, phase]);

  const pool = useMemo(() => (moving ? all ?? [] : (all ?? []).filter(isAccepting)), [all, moving]);
  const origins = useMemo(() => distinctCities(pool, 'originCity'), [pool]);
  const destinations = useMemo(() => distinctCities(pool, 'destCity'), [pool]);
  const shown = useMemo(
    () => filterCarriers(all ?? [], { query, origin, destination, journey, sort, acceptingOnly: !moving }),
    [all, query, origin, destination, journey, sort, moving],
  );
  const freeKg = pool.reduce((s, t) => s + t.remainingKg, 0);

  return (
    <section aria-label={moving ? 'Couriers on the road now' : 'Carriers currently accepting packages'} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-body-s text-text-tertiary">
          {all === null
            ? 'Loading trips…'
            : moving
              ? `${pool.length} courier${pool.length === 1 ? '' : 's'} travelling now. Book their next trip from their profile.`
              : `${pool.length} open trip${pool.length === 1 ? '' : 's'} · ${freeKg} kg of bag space available. Prices are per kg.`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!moving && (
            <Segmented<CarrierSort> label="Sort carriers" value={sort} onChange={setSort} options={[
              { value: 'departSoon', label: 'Departs soon' },
              { value: 'priceLow', label: 'Lowest price' },
              { value: 'rating', label: 'Top rated' },
              { value: 'journeyShort', label: 'Shortest' },
            ]} />
          )}
          <Segmented<'grid' | 'list'> label="Layout" value={view} onChange={saveView} options={[
            { value: 'grid', label: <><LayoutGrid size={14} /> <span className="sr-only sm:not-sr-only">Grid</span></> },
            { value: 'list', label: <><List size={14} /> <span className="sr-only sm:not-sr-only">List</span></> },
          ]} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border/70 bg-card p-3 shadow-light">
        <label className="flex min-w-0 flex-1 basis-56 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2">
          <Search size={14} className="shrink-0 text-icon-muted" />
          <span className="sr-only">Search by courier name or city</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@username or city"
            className="w-full min-w-0 border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0" />
        </label>
        <label className="flex items-center gap-2 text-body-s text-text-secondary">From
          <select aria-label="Filter by origin" value={origin} onChange={(e) => setOrigin(e.target.value)} className={selectClass}>
            <option value="all">All origins</option>{origins.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-body-s text-text-secondary">To
          <select aria-label="Filter by destination" value={destination} onChange={(e) => setDestination(e.target.value)} className={selectClass}>
            <option value="all">All destinations</option>{destinations.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {!moving && (
          <label className="flex items-center gap-2 text-body-s text-text-secondary">Length
            <select aria-label="Filter by journey length" value={journey} onChange={(e) => setJourney(e.target.value as JourneyBucket | 'all')} className={selectClass}>
              <option value="all">Any length</option>
              {(Object.keys(JOURNEY_LABEL) as JourneyBucket[]).map((b) => <option key={b} value={b}>{JOURNEY_LABEL[b]}</option>)}
            </select>
          </label>
        )}
        {(query || origin !== 'all' || destination !== 'all' || journey !== 'all') && (
          <button type="button" onClick={() => { setQuery(''); setOrigin('all'); setDestination('all'); setJourney('all'); }}
            className="rounded-full px-3 py-2 text-body-s font-semi-bold text-text-link hover:underline">Clear filters</button>
        )}
      </div>

      {all === null ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-[22px] bg-muted" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState art={failed ? 'error' : 'search'} title={failed ? 'Could not load couriers' : moving ? 'Nobody on the road here' : 'No carriers match'}
          body={failed ? 'Check your connection and refresh to try again.' : 'Try a different name, city or journey length.'} />
      ) : (
        <>
          <p className="text-body-s text-text-tertiary" role="status">{shown.length} {moving ? 'courier' : 'carrier trip'}{shown.length === 1 ? '' : 's'} shown</p>
          <motion.div layout className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 2xl:grid-cols-3' : 'flex flex-col gap-2'}>
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((t, i) => (
                <motion.div
                  key={t.tripId}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 9) * 0.035 } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  className="flex min-w-0 flex-col"
                >
                  {view === 'grid' ? <CarrierCard trip={t} onRequest={onRequest} /> : <CarrierRow trip={t} onRequest={onRequest} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          {!moving && (
            <p className="text-[11px] text-text-tertiary">Journey length is the scheduled travel time, departure to arrival. Trips don&apos;t publish road kilometres, so “shortest” stands in for shortest distance.</p>
          )}
        </>
      )}
    </section>
  );
}
