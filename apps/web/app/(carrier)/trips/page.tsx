'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowLeft, BadgeCheck, Ban, CalendarClock, Coins, PackageCheck, Plus, Scale, Star } from 'lucide-react';
import { Badge, Button, Modal, ModalHeader, toast } from '@/ui/elements';
import { EmptyState } from '@/components/empty-state';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import type { Trip } from '@/lib/types';
import { formatMinors } from '@/lib/money';
import { type TripFilter, modeReferenceLabel, totalsByCurrency, tripBucket } from '@/lib/trip-form';
import { TripCreatePanel } from '@/components/carrier/trip-create-panel';
import { CargoHold, PackageGrid } from '@/components/carrier/cargo-hold';
import { FiveStars, TripCard, stageLabel, tripCode } from '@/components/carrier/trip-card';
import { JourneyTracker } from '@/components/carrier/journey-tracker';
import { RouteArc } from '@/components/carrier/route-arc';
import { Card, LoadBar, ModeIcon, formatDay, formatTime } from '@/components/dashboard/widgets';

const FILTERS: { value: TripFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'road', label: 'On the road' },
  { value: 'past', label: 'Past' },
];

const money = (rows: { currency: string; value: number }[]) =>
  rows.length ? rows.map((r) => formatMinors(r.value, r.currency).replace(/\.00$/, '')).join(' + ') : formatMinors(0, 'NGN').replace(/\.00$/, '');

function Tile({ icon: Icon, label, value, sub, className }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 shadow-light', className)}>
      <p className="flex items-center gap-1.5 text-body-s text-text-tertiary"><Icon size={13} /> {label}</p>
      <p className="mt-1 truncate text-title-m font-semi-bold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-text-tertiary">{sub}</p>}
    </div>
  );
}

export default function MyTrips() {
  const { user, token, loading } = useRequireAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [filter, setFilter] = useState<TripFilter>('all');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async (t: string) => {
    const data = await api<Trip[]>('/trips?mine=true', { token: t });
    setTrips(data);
    setReady(true);
    return data;
  };

  // `/trips?new=1` (and the old /trips/new) opens the create modal straight away.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('new') === '1') {
      setCreating(true);
      q.delete('new');
      window.history.replaceState(null, '', `${window.location.pathname}${q.size ? `?${q}` : ''}`);
    }
  }, []);

  useEffect(() => {
    if (loading || !user || !token) return;
    load(token)
      .then((data) => {
        // Open on the trip that needs attention: on the road, else the next one, else the latest.
        const now = Date.now();
        const pick =
          data.find((t) => tripBucket(t, now) === 'road') ??
          data.find((t) => tripBucket(t, now) === 'upcoming') ??
          [...data].sort((a, b) => b.departAt.localeCompare(a.departAt))[0];
        if (pick) setSelectedId(pick.id);
      })
      .catch((err) => toast.error({ title: 'Load failed', description: err instanceof ApiError ? err.message : '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, token]);

  const sorted = useMemo(() => [...trips].sort((a, b) => b.departAt.localeCompare(a.departAt)), [trips]);
  const counts = useMemo(() => {
    const now = Date.now();
    const c: Record<TripFilter, number> = { all: trips.length, upcoming: 0, road: 0, past: 0 };
    for (const t of trips) c[tripBucket(t, now)] += 1;
    return c;
  }, [trips]);
  const visible = filter === 'all' ? sorted : sorted.filter((t) => tripBucket(t) === filter);

  const totals = useMemo(() => {
    const rated = trips.flatMap((t) => t.packages?.filter((p) => p.rating) ?? []);
    return {
      kg: Math.round(trips.reduce((s, t) => s + (t.stats?.kgCarried ?? 0), 0) * 10) / 10,
      packages: trips.reduce((s, t) => s + (t.stats?.packagesCarried ?? 0), 0),
      earned: totalsByCurrency(trips, (t) => t.stats?.earned ?? 0, (t) => t.currency),
      rating: rated.length ? rated.reduce((s, p) => s + p.rating!, 0) / rated.length : null,
      ratings: rated.length,
    };
  }, [trips]);

  const selected = trips.find((t) => t.id === selectedId) ?? sorted[0] ?? null;
  const packages = selected?.packages ?? [];
  const activePkg = packages.find((p) => p.legId === selectedPkg)?.legId ?? packages[0]?.legId ?? null;

  if (!loading && !user) return null;

  const select = (id: string) => {
    setSelectedId(id);
    setSelectedPkg(null);
  };

  const onCreated = (t: Trip) => {
    setTrips((prev) => [...prev, { ...t, stats: { packagesCarried: 0, kgCarried: 0, earned: 0, bookedFees: 0, delivered: 0, rating: null, ratings: 0 }, packages: [] }]);
    select(t.id);
    setFilter('all');
    setCreating(false);
  };

  const patch = async (id: string, body: Record<string, string>, ok: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api(`/trips/${id}`, { method: 'PATCH', token, body });
      toast.success({ title: ok });
      await load(token);
    } catch (err) {
      toast.error({ title: 'Update failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const verifyTravel = async (trip: Trip) => {
    if (!token) return;
    setBusy(true);
    try {
      await api(`/trips/${trip.id}/travel-proof`, { method: 'POST', token, body: { reference: trip.flightNumber ?? `manual-${trip.id.slice(0, 8)}` } });
      toast.success({ title: 'Travel verified' });
      await load(token);
    } catch (err) {
      toast.error({ title: 'Verification failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const createPanel = <TripCreatePanel token={token} onCreated={onCreated} showHeading={false} />;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard" aria-label="Back to dashboard" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-surface-hover">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] font-light leading-tight tracking-tight text-text-primary sm:text-[44px]">My trips</h1>
          <p className="text-body-s text-text-tertiary">Every trip you have listed: what it carried, what it earned, how senders rated it, and where it is now.</p>
        </div>
        {trips.length > 0 && <Button label="Start a new trip" fit iconLeading={<Plus size={16} />} onClick={() => setCreating(true)} />}
      </header>

      {!ready ? (
        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="h-[520px] animate-pulse rounded-[22px] bg-muted" />
          <div className="h-[520px] animate-pulse rounded-[22px] bg-muted" aria-label="Loading trips" />
        </div>
      ) : trips.length === 0 ? (
        <Card>
          <EmptyState
            art="route"
            title="No trips posted yet"
            body="Going somewhere? List the route, the date and your spare kilos. Senders on your way will find you."
            cta={{ onClick: () => setCreating(true), label: 'Start a new trip' }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile icon={CalendarClock} label="Trips listed" value={trips.length} sub={`${counts.road} on the road · ${counts.upcoming} upcoming`} />
            <Tile icon={Scale} label="Kg carried" value={`${totals.kg} kg`} sub="Across all trips" />
            <Tile icon={PackageCheck} label="Packages carried" value={totals.packages} />
            <Tile icon={Coins} label="Earned" value={money(totals.earned)} sub="Released from escrow" />
            <Tile className="col-span-2 lg:col-span-1" icon={Star} label="Delivery rating" value={totals.rating ? `${totals.rating.toFixed(1)} / 5` : '—'} sub={totals.ratings ? `From ${totals.ratings} rated deliveries` : 'No ratings yet'} />
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            {/* ── Trip list ─────────────────────────────── */}
            <Card bodyClassName="p-3" className="lg:sticky lg:top-4">
              <div className="px-2 pb-3 pt-2">
                <p className="text-body-s text-text-tertiary">Former & upcoming</p>
                <p className="text-title-base text-text-primary">Your trips</p>
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter trips">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      aria-pressed={filter === f.value}
                      onClick={() => setFilter(f.value)}
                      className={clsx(
                        'whitespace-nowrap rounded-full px-3 py-1.5 text-body-s font-semi-bold transition-colors',
                        filter === f.value ? 'bg-brand text-brand-foreground' : 'bg-surface text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {f.label} <span className="opacity-60">{counts[f.value]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex max-h-[760px] flex-col gap-2 overflow-y-auto pr-0.5" role="listbox" aria-label="Your trips">
                {visible.map((t) => (
                  <TripCard key={t.id} trip={t} active={selected?.id === t.id} onSelect={() => select(t.id)} />
                ))}
                {visible.length === 0 && (
                  <EmptyState art="route" size="sm" title="Nothing here" body="No trips match this filter." cta={{ onClick: () => setFilter('all'), label: 'Show all trips' }} />
                )}
              </div>
            </Card>

            {/* ── Selected trip ─────────────────────────── */}
            {selected && (
              <Card bodyClassName="p-5 sm:p-6" key={selected.id} className="tr-fade">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-s text-text-tertiary">{selected.originCity} – {selected.destCity}</p>
                    <h2 className="truncate text-[30px] font-light leading-tight tracking-tight text-text-primary">№ {tripCode(selected)}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-body-s text-text-tertiary">
                      <ModeIcon mode={selected.mode} size={13} />
                      {selected.flightNumber ? `${modeReferenceLabel(selected.mode).label}: ${selected.flightNumber}` : modeReferenceLabel(selected.mode).label + ' not added'}
                      {' · '}{selected.international ? 'International' : 'Local'} · {formatMinors(selected.pricePerKg, selected.currency).replace(/\.00$/, '')}/kg
                    </p>
                  </div>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge label={stageLabel(selected)} color={selected.status === 'CANCELLED' ? 'error' : selected.journeyStage === 'DELIVERED' ? 'success' : 'harbor'} />
                    {selected.travelVerified && <Badge label="Travel verified" color="success" />}
                  </span>
                </div>

                <div className="mt-5">
                  <RouteArc trip={selected} />
                </div>

                {/* Bag hold + manifest */}
                <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,270px)_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[minmax(0,270px)_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-[22px] bg-surface px-6 py-6">
                    <CargoHold
                      mode={selected.mode}
                      capacityKg={selected.capacityKg}
                      remainingKg={selected.status === 'CANCELLED' ? 0 : selected.remainingKg}
                      packages={packages}
                      selected={activePkg}
                      onSelect={setSelectedPkg}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-body-s text-text-tertiary">Bag hold · {selected.capacityKg} kg</p>
                        <p className="text-title-base text-text-primary">{packages.length} package{packages.length === 1 ? '' : 's'} on this trip</p>
                      </div>
                      <FiveStars rating={selected.stats?.rating ?? null} count={selected.stats?.ratings} />
                    </div>
                    <div className="mt-3">
                      <LoadBar
                        pct={selected.capacityKg ? ((selected.capacityKg - selected.remainingKg) / selected.capacityKg) * 100 : 0}
                        label="Booked"
                        right={`${Math.round((selected.capacityKg - selected.remainingKg) * 10) / 10} of ${selected.capacityKg} kg · ${selected.remainingKg} kg free`}
                      />
                    </div>
                    <div className="mt-4">
                      <PackageGrid packages={packages} currency={selected.currency} selected={activePkg} onSelect={setSelectedPkg} />
                    </div>
                  </div>
                </div>

                {/* Money */}
                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Tile icon={Coins} label="Made on this trip" value={formatMinors(selected.stats?.earned ?? 0, selected.currency).replace(/\.00$/, '')} sub="Released to your wallet" />
                  <Tile icon={Coins} label="Booked fees" value={formatMinors(selected.stats?.bookedFees ?? 0, selected.currency).replace(/\.00$/, '')} sub="Accepted packages" />
                  <Tile icon={Scale} label="Kg carried" value={`${selected.stats?.kgCarried ?? 0} kg`} sub={`${selected.stats?.packagesCarried ?? 0} packages`} />
                  <Tile icon={PackageCheck} label="Delivered" value={selected.stats?.delivered ?? 0} sub={selected.stats?.ratings ? `${selected.stats.ratings} rated` : 'Not rated yet'} />
                </div>

                {/* Journey status */}
                <div className="mt-6 rounded-[22px] border border-border p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-title-base text-text-primary">Journey status</p>
                    <p className="text-body-s text-text-tertiary">
                      Departs {formatDay(selected.departAt)}, {formatTime(selected.departAt)} · arrives {formatDay(selected.arriveAt)}, {formatTime(selected.arriveAt)}
                    </p>
                  </div>
                  <JourneyTracker
                    stage={selected.journeyStage}
                    mode={selected.mode}
                    cancelled={selected.status === 'CANCELLED'}
                    busy={busy}
                    onAdvance={(next, label) => patch(selected.id, { journeyStage: next }, `Marked: ${label}`)}
                  />
                </div>

                {/* Terms of this trip */}
                <dl className="mt-6 grid gap-4 text-body-s sm:grid-cols-2">
                  <div>
                    <dt className="text-text-tertiary">You accept</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {selected.categories.map((c) => <span key={c} className="rounded-full bg-surface px-2.5 py-1 font-semi-bold capitalize text-text-primary">{c}</span>)}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-text-tertiary"><Ban size={13} /> You will not carry</dt>
                    <dd className="mt-1">
                      {(selected.excludedItems?.length ?? 0) === 0 ? (
                        <span className="text-text-secondary">Nothing listed</span>
                      ) : (
                        <>
                          <span className="flex flex-wrap gap-1.5">
                            {selected.excludedItems!.map((c) => <span key={c} className="rounded-full bg-destructive-subtle px-2.5 py-1 font-semi-bold capitalize text-destructive">{c}</span>)}
                          </span>
                          <span className="mt-1.5 block text-text-tertiary">
                            {selected.excludedFeePerKg
                              ? `Could be convinced for +${formatMinors(selected.excludedFeePerKg, selected.currency).replace(/\.00$/, '')}/kg`
                              : 'No fee would change your mind'}
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                  {!selected.travelVerified && selected.status !== 'CANCELLED' && (
                    <Button label="Verify travel" variant="secondary" size="sm" fit iconLeading={<BadgeCheck size={15} />} disabled={busy} onClick={() => verifyTravel(selected)} />
                  )}
                  {selected.status === 'OPEN' && (selected.journeyStage ?? 'NOT_STARTED') === 'NOT_STARTED' && (
                    <Button label="Cancel trip" variant="text" size="sm" fit disabled={busy} onClick={() => patch(selected.id, { status: 'CANCELLED' }, 'Trip cancelled')} />
                  )}
                </div>
              </Card>
            )}

          </div>
        </>
      )}

      <Modal isOpen={creating} closeModal={() => setCreating(false)}>
        <div className="w-full text-left md:w-[640px] md:max-w-[calc(100vw-2rem)]">
          <ModalHeader title="Start a new trip" subtitle="List spare bag space on a journey you are already taking" onClose={() => setCreating(false)} />
          <div className="px-5 py-5 md:px-6">{creating && createPanel}</div>
        </div>
      </Modal>
    </div>
  );
}
