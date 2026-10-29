'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Ban, Check, Coins, FileText, Hourglass, Inbox as InboxIcon, PackageCheck, Percent, Truck, XCircle } from 'lucide-react';
import { Badge, Button, toast } from '@/ui/elements';
import { EmptyState } from '@/components/empty-state';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import type { Leg, Trip, TripPackage } from '@/lib/types';
import { formatMinors } from '@/lib/money';
import { declarationPath } from '@/lib/declaration';
import { orderRequests } from '@/lib/deliveries';
import { type RequestFilter, answerWindow, modeReferenceLabel, requestBucket, totalsByCurrency } from '@/lib/trip-form';
import { shortId } from '@/lib/tracking';
import { Card, LoadBar, ModeIcon, formatDay, formatTime } from '@/components/dashboard/widgets';
import { CargoHold } from '@/components/carrier/cargo-hold';
import { RouteArc } from '@/components/carrier/route-arc';
import { RequestCard, requestLabel } from '@/components/carrier/request-card';
import { AcceptRequestModal } from '@/components/carrier/accept-request-modal';
import { RejectRequestModal } from '@/components/carrier/reject-request-modal';
import { SenderDossier } from '@/components/trust/sender-dossier';
import { DetailPanel, Inbox } from './inbox';
import { JobPanel } from './job-panel';

export interface IncomingLeg extends Leg {
  acceptedAt: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  shipment: {
    id: string;
    status: string;
    originCity: string;
    destCity: string;
    category: string;
    weightKg: number;
    photos: string[];
    sender: { handle: string | null; rating: number; kycTier: string };
    attestation: { reference: string; signedAt: string } | null;
  };
}

type Filter = RequestFilter | 'all';

const FILTER_LABEL: Record<Filter, string> = { waiting: 'Waiting', active: 'In progress', past: 'Past', declined: 'Declined', all: 'All' };
function Tile({ icon: Icon, label, value, sub, className }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 shadow-light', className)}>
      <p className="flex items-center gap-1.5 text-body-s text-text-tertiary"><Icon size={13} /> {label}</p>
      <p className="mt-1 truncate text-title-m font-semi-bold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{sub}</p>}
    </div>
  );
}

/** Carrying: requests to answer, jobs in progress, and everything you have carried. */
export function CarryingView() {
  const params = useParams<{ id?: string }>();
  // What you just accepted or declined stays selected even before the URL catches up.
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const selectedId = params?.id ?? pinnedId;
  useEffect(() => {
    if (params?.id) setPinnedId(null);
  }, [params?.id]);
  const router = useRouter();
  const { user, token, loading } = useRequireAuth();
  const [legs, setLegs] = useState<IncomingLeg[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [accepting, setAccepting] = useState<IncomingLeg | null>(null);
  const [rejecting, setRejecting] = useState<IncomingLeg | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useState<{ kind: 'accepted' | 'declined'; id: string } | null>(null);

  const load = useCallback(async () => {
    if (!token) return null;
    // Trips give each request its bag: the other packages and the space left.
    const [l, tr] = await Promise.all([api<IncomingLeg[]>('/legs/mine', { token }), api<Trip[]>('/trips?mine=true', { token })]);
    setLegs(l);
    setTrips(tr);
    return l;
  }, [token]);

  useEffect(() => {
    if (loading || !user || !token) return;
    load().catch((err) => {
      setLegs([]);
      toast.error({ title: 'Load failed', description: err instanceof ApiError ? err.message : '' });
    });
  }, [loading, user, token, load]);

  const ordered = useMemo(() => (legs ? orderRequests(legs) : null), [legs]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: legs?.length ?? 0, waiting: 0, active: 0, past: 0, declined: 0 };
    for (const l of legs ?? []) c[requestBucket(l)] += 1;
    return c;
  }, [legs]);

  // Open on what needs you: waiting, else in progress, else everything.
  const selectedLeg = legs?.find((l) => l.id === selectedId) ?? null;
  const effectiveFilter: Filter = filter ?? (selectedLeg ? requestBucket(selectedLeg) : counts.waiting ? 'waiting' : counts.active ? 'active' : 'all');
  const visible = ordered ? (effectiveFilter === 'all' ? ordered : ordered.filter((l) => requestBucket(l) === effectiveFilter)) : null;
  const selected = selectedLeg ?? visible?.[0] ?? null;
  const trip = selected ? trips.find((t) => t.id === selected.tripId) : undefined;

  const totals = useMemo(() => {
    const all = legs ?? [];
    const accepted = all.filter((l) => l.acceptedAt).length;
    const declined = all.filter((l) => l.status === 'REJECTED').length;
    const delivered = all.filter((l) => ['HANDED_OFF', 'SETTLED'].includes(l.status));
    return {
      delivered: delivered.length,
      earned: totalsByCurrency(delivered, (l) => l.fee, (l) => l.currency),
      rate: accepted + declined ? Math.round((accepted / (accepted + declined)) * 100) : null,
    };
  }, [legs]);

  if (!loading && !user) return null;

  const changed = () => {
    setVersion((v) => v + 1);
    window.dispatchEvent(new Event('relay:requests-changed'));
  };

  const showFlash = (kind: 'accepted' | 'declined', id: string) => {
    setFlash({ kind, id });
    window.setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 1800);
  };

  const accept = async (legId: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api(`/legs/${legId}/accept`, { method: 'POST', token });
      setAccepting(null);
      showFlash('accepted', legId);
      await load();
      changed();
      setFilter('active');
      setPinnedId(legId);
      router.replace(`/deliveries/carrying/${legId}`, { scroll: false });
      toast.success({ title: 'Request accepted', description: 'The sender’s verified identity is unlocked. You are bound by Part B of their declaration.' });
    } catch (err) {
      toast.error({ title: 'Accept failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const reject = async (legId: string, reason: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api(`/legs/${legId}/reject`, { method: 'POST', token, body: { reason } });
      setRejecting(null);
      showFlash('declined', legId);
      const data = (await load()) ?? [];
      changed();
      // Straight on to the next request still waiting, if any.
      const next = orderRequests(data).find((l) => requestBucket(l) === 'waiting');
      setFilter(next ? 'waiting' : 'declined');
      setPinnedId(next?.id ?? legId);
      router.replace(`/deliveries/carrying/${next?.id ?? legId}`, { scroll: false });
      toast.success({ title: 'Request declined', description: 'The sender sees your reason and can pick another route.' });
    } catch (err) {
      toast.error({ title: 'Decline failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  if (legs !== null && legs.length === 0) {
    return (
      <Card>
        <EmptyState
          art="inbox"
          title="Nothing to carry yet"
          body="When a sender picks one of your trips, their request lands here. You have 48 hours to accept or decline."
          cta={{ href: '/trips?new=1', label: 'Start a new trip' }}
          secondary={{ href: '/trips', label: 'My trips' }}
        />
      </Card>
    );
  }

  const filters = (['waiting', 'active', 'past', 'declined', 'all'] as Filter[]).map((f) => ({ value: f, label: FILTER_LABEL[f], count: counts[f] }));

  // The hold shows the trip's real bag, with this request highlighted in it.
  const holdPackages: TripPackage[] = selected
    ? trip?.packages?.some((p) => p.legId === selected.id)
      ? trip.packages
      : [
          ...(trip?.packages ?? []),
          {
            legId: selected.id,
            shipmentId: selected.shipment.id,
            status: selected.status,
            category: selected.shipment.category,
            weightKg: selected.shipment.weightKg,
            fee: selected.fee,
            rating: null,
            declaration: selected.shipment.attestation?.reference ?? null,
          },
        ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className={clsx('grid grid-cols-2 gap-3 lg:grid-cols-5', selectedId && 'hidden lg:grid')}>
        <Tile icon={InboxIcon} label="Waiting for you" value={counts.waiting} sub={counts.waiting ? 'Answer within 48 hours' : 'All caught up'} />
        <Tile icon={Truck} label="In progress" value={counts.active} sub="Accepted, not yet delivered" />
        <Tile icon={PackageCheck} label="Delivered" value={totals.delivered} />
        <Tile icon={Coins} label="Earned from carrying" value={totals.earned.length ? totals.earned.map((e) => formatMinors(e.value, e.currency).replace(/\.00$/, '')).join(' + ') : '—'} />
        <Tile className="col-span-2 lg:col-span-1" icon={Percent} label="Acceptance rate" value={totals.rate === null ? '—' : `${totals.rate}%`} sub={`${counts.declined} declined or lapsed`} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <Inbox<IncomingLeg, Filter>
          className={clsx(selectedId && 'hidden lg:block')}
          eyebrow="Most urgent first"
          title="Requests & jobs"
          filters={filters}
          filter={effectiveFilter}
          onFilter={setFilter}
          items={visible}
          selectedId={selected?.id ?? null}
          hrefFor={(l) => `/deliveries/carrying/${l.id}`}
          renderItem={(l, active) => <RequestCard leg={l} active={active} />}
          empty={
            <EmptyState
              art="inbox"
              size="sm"
              title={effectiveFilter === 'waiting' ? 'Nothing waiting' : 'Nothing here'}
              body={effectiveFilter === 'waiting' ? 'Every request has an answer. New ones land here.' : 'No requests match this filter.'}
              cta={{ onClick: () => setFilter('all'), label: 'Show everything' }}
            />
          }
        />

        <Card bodyClassName="p-5 sm:p-6" className={clsx('relative min-h-[480px] overflow-hidden', !selectedId && 'hidden lg:block')}>
          <AnimatePresence>
            {flash && (
              <motion.div
                key={flash.id + flash.kind}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-[2px]"
                aria-hidden
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  className="flex flex-col items-center gap-3"
                >
                  <span className={clsx('flex h-20 w-20 items-center justify-center rounded-full', flash.kind === 'accepted' ? 'bg-success text-white' : 'bg-destructive text-white')}>
                    {flash.kind === 'accepted' ? <Check size={40} strokeWidth={3} /> : <XCircle size={40} />}
                  </span>
                  <span className="text-title-l font-semi-bold text-text-primary">{flash.kind === 'accepted' ? 'Accepted. It’s your job now.' : 'Declined. Moving on.'}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {selected && token && user ? (
            <DetailPanel id={selected.id}>
              <RequestDetail
                leg={selected}
                trip={trip}
                holdPackages={holdPackages}
                token={token}
                userId={user.id}
                version={version}
                busy={busy}
                onAccept={() => setAccepting(selected)}
                onReject={() => setRejecting(selected)}
                onChanged={() => {
                  void load();
                  changed();
                }}
              />
            </DetailPanel>
          ) : (
            <div className="space-y-5" aria-label="Loading request">
              <div className="h-12 w-64 animate-pulse rounded-xl bg-muted" />
              <div className="h-40 animate-pulse rounded-[22px] bg-muted" />
              <div className="h-72 animate-pulse rounded-[22px] bg-muted" />
            </div>
          )}
        </Card>
      </div>

      <AcceptRequestModal leg={accepting} token={token} busy={busy} onClose={() => setAccepting(null)} onAccept={accept} />
      <RejectRequestModal leg={rejecting} busy={busy} onClose={() => setRejecting(null)} onReject={reject} />
    </div>
  );
}

function RequestDetail({
  leg,
  trip,
  holdPackages,
  token,
  userId,
  version,
  busy,
  onAccept,
  onReject,
  onChanged,
}: {
  leg: IncomingLeg;
  trip: Trip | undefined;
  holdPackages: TripPackage[];
  token: string;
  userId: string;
  version: number;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onChanged: () => void;
}) {
  const bucket = requestBucket(leg);
  const clock = bucket === 'waiting' ? answerWindow(leg.acceptDeadline) : null;
  const capacity = trip?.capacityKg ?? leg.trip.capacityKg;
  const remaining = trip?.remainingKg ?? leg.trip.remainingKg;
  const banned = leg.trip.excludedItems ?? [];
  const perKg = leg.shipment.weightKg ? Math.round(leg.fee / leg.shipment.weightKg) : leg.trip.pricePerKg;
  const showJob = bucket === 'active' || leg.status === 'HANDED_OFF';

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/deliveries/carrying" scroll={false} aria-label="Back to requests" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border lg:hidden">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <p className="text-body-s text-text-tertiary">{leg.trip.originCity} – {leg.trip.destCity}</p>
            <h2 className="truncate text-[30px] font-light leading-tight tracking-tight text-text-primary">№ {shortId(leg.shipment.id)}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-body-s text-text-tertiary">
              <ModeIcon mode={leg.trip.mode} size={13} />
              {leg.trip.flightNumber ? `${modeReferenceLabel(leg.trip.mode).label}: ${leg.trip.flightNumber}` : `${modeReferenceLabel(leg.trip.mode).label} not added`}
              {' · '}<span className="capitalize">{leg.shipment.category}</span> · {leg.shipment.weightKg} kg
            </p>
          </div>
        </div>
        <Badge label={requestLabel(leg)} color={bucket === 'waiting' ? 'warning' : bucket === 'declined' ? 'error' : bucket === 'past' ? 'success' : 'harbor'} />
      </div>

      {/* The decision, or the outcome of one */}
      {clock && (
        <div className={clsx('mt-5 rounded-[22px] border p-4', clock.urgent ? 'border-destructive/30 bg-destructive-subtle/40' : 'border-warning-text/20 bg-warning-subtle/60')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={clsx('flex items-center gap-1.5 text-body-m font-semi-bold', clock.urgent ? 'text-destructive' : 'text-warning-text')}>
              <Hourglass size={16} /> {clock.label} to answer
            </p>
            <p className="text-body-s text-text-tertiary">Closes {formatDay(leg.acceptDeadline)}, {formatTime(leg.acceptDeadline)}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card" aria-hidden>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clock.share * 100}%` }}
              transition={{ duration: 0.9, ease: [0.2, 0.7, 0.3, 1] }}
              className={clsx('h-full rounded-full', clock.urgent ? 'bg-destructive' : 'bg-accent-signal')}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button label="Accept request" fit iconLeading={<Check size={16} strokeWidth={2.6} />} disabled={busy} onClick={onAccept} />
            <Button label="Decline with a reason" variant="secondary" fit iconLeading={<XCircle size={16} />} disabled={busy} onClick={onReject} />
          </div>
          <p className="mt-2 text-[11px] text-text-tertiary">If you don’t answer in time, the request lapses and the sender is rerouted.</p>
        </div>
      )}
      {leg.status === 'REJECTED' && (
        <div className="mt-5 flex gap-3 rounded-[22px] border border-destructive/30 bg-destructive-subtle/40 p-4">
          <Ban size={18} className="mt-0.5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-body-m font-semi-bold text-text-primary">You declined this request{leg.rejectedAt ? ` on ${formatDay(leg.rejectedAt)}` : ''}</p>
            <p className="mt-0.5 break-words text-body-s text-text-secondary">
              Reason the sender sees: <span className="font-semi-bold text-text-primary">“{leg.rejectionReason ?? 'No reason recorded'}”</span>
            </p>
          </div>
        </div>
      )}
      {leg.status === 'EXPIRED' && !leg.acceptedAt && (
        <p className="mt-5 rounded-[22px] border border-border bg-surface p-4 text-body-s text-text-secondary">This request lapsed before you answered, so the sender was rerouted.</p>
      )}

      {showJob && (
        <div className="mt-5">
          <JobPanel legId={leg.id} token={token} userId={userId} onChanged={onChanged} />
        </div>
      )}

      <div className="mt-5">
        <RouteArc trip={leg.trip} />
      </div>

      {/* Bag hold + this package */}
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[22px] bg-surface px-6 py-6">
          <CargoHold mode={leg.trip.mode} capacityKg={capacity} remainingKg={leg.trip.status === 'CANCELLED' ? 0 : remaining} packages={holdPackages} selected={leg.id} onSelect={() => undefined} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-body-s text-text-tertiary">This package</p>
            <p className="text-title-base text-text-primary">
              <span className="capitalize">{leg.shipment.category}</span> · {leg.shipment.weightKg} kg for {formatMinors(leg.fee, leg.currency).replace(/\.00$/, '')}
            </p>
          </div>
          <div className="flex gap-3">
            {leg.shipment.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leg.shipment.photos[0]} alt={`Photo of the ${leg.shipment.category}`} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-center text-[11px] text-text-tertiary">No photo</span>
            )}
            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2.5 text-body-s">
              <div><dt className="text-text-tertiary">Your fee</dt><dd className="font-semi-bold text-text-primary">{formatMinors(leg.fee, leg.currency)}</dd></div>
              <div><dt className="text-text-tertiary">Works out at</dt><dd className="font-semi-bold text-text-primary">{formatMinors(perKg, leg.currency).replace(/\.00$/, '')}/kg</dd></div>
              <div><dt className="text-text-tertiary">Departs</dt><dd className="font-semi-bold text-text-primary">{formatDay(leg.trip.departAt)}, {formatTime(leg.trip.departAt)}</dd></div>
              <div><dt className="text-text-tertiary">Leg</dt><dd className="font-semi-bold text-text-primary">{leg.sequence + 1} of the route</dd></div>
            </dl>
          </div>
          <LoadBar pct={capacity ? ((capacity - remaining) / capacity) * 100 : 0} label="Your bag" right={`${Math.round((capacity - remaining) * 10) / 10} of ${capacity} kg booked · ${remaining} kg free`} />
          {banned.length > 0 && (
            <p className="rounded-xl bg-warning-subtle px-3.5 py-2.5 text-body-s text-warning-text">
              Your cannot-carry list for this trip: <span className="font-semi-bold">{banned.join(', ')}</span>. Check this item against it before accepting.
            </p>
          )}
          {leg.shipment.attestation ? (
            <Link href={declarationPath(leg.shipment.id)} className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-body-s font-semi-bold text-text-primary hover:bg-surface-hover">
              <FileText size={14} className="shrink-0" /> <span className="truncate">Sender’s signed declaration · {leg.shipment.attestation.reference}</span>
            </Link>
          ) : (
            <p className="text-body-s text-text-tertiary">No signed declaration on this request.</p>
          )}
        </div>
      </div>

      {/* The sender */}
      <section className="mt-6 rounded-[22px] border border-border p-4 sm:p-5">
        <p className="text-title-base text-text-primary">The sender</p>
        <p className="mb-4 text-body-s text-text-tertiary">Their record and what other couriers said. Their verified identity unlocks once you accept.</p>
        <SenderDossier legId={leg.id} token={token} refreshKey={`${leg.status}-${version}`} />
      </section>
    </>
  );
}
