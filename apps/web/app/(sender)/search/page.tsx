'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Luggage, PackageSearch, Plane, Route, Truck, Users } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Badge, Button, ImageUploader, Input, Select, Stepper, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { RouteOption, Shipment } from '@/lib/types';
import type { BoardItem } from '@/lib/dashboard-types';
import { formatMinors, toMinors } from '@/lib/money';
import { declarationPath } from '@/lib/declaration';
import { CarrierBrowser } from '@/components/sender/carrier-browser';
import { RequestModal } from '@/components/sender/request-modal';
import { Card, ModeIcon } from '@/components/dashboard/widgets';
import { DeclarationModal, type SignedDeclaration } from '@/components/declaration/declaration-panel';

const CATEGORIES = ['fabric', 'fashion', 'electronics', 'documents', 'books', 'other'];
const CURRENCIES = ['NGN', 'USD'];

type Tab = 'couriers' | 'routes' | 'moving';
type Step = 'details' | 'routes' | 'review';

const TABS: { id: Tab; label: string; sub: string; icon: React.ElementType }[] = [
  { id: 'couriers', label: 'Couriers accepting', sub: 'Pick one, request directly', icon: Users },
  { id: 'routes', label: 'Routes for me', sub: 'Up to 3 legs, chained for you', icon: Route },
  { id: 'moving', label: 'On the road now', sub: 'Trips already travelling', icon: Truck },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 shadow-light">
      <p className="flex items-center gap-1.5 text-body-s text-text-tertiary"><Icon size={13} /> {label}</p>
      <p className="mt-1 truncate text-title-m font-semi-bold text-text-primary">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{sub}</p>
    </div>
  );
}

/**
 * Send a package — the courier board and the send flow in one place: see
 * who is accepting and request them directly, let Relay chain a route for
 * you, or look at who is already on the road.
 */
export default function SendAPackage() {
  const { user, token, loading } = useRequireAuth();
  const [tab, setTabState] = useState<Tab>('couriers');
  const [direction, setDirection] = useState(1);
  const [board, setBoard] = useState<BoardItem[] | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<BoardItem | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const [link, setLink] = useState({ from: '', to: '', q: '' });

  // Route finder
  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [signing, setSigning] = useState<RouteOption | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [form, setForm] = useState({
    originCity: 'Awka',
    destCity: 'Houston',
    category: 'fabric',
    weightKg: '5',
    declaredValue: '150000',
    currency: 'NGN',
    receiverName: '',
    receiverPhone: '',
  });
  const [photo, setPhoto] = useState<string>();

  // Links hand over ?tab=, ?from=&to= (landing search) and ?q= (sidebar search, old board links).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const from = p.get('from') ?? '';
    const to = p.get('to') ?? '';
    const q = p.get('q') ?? '';
    const t = p.get('tab');
    if (t === 'routes' || t === 'moving' || t === 'couriers') setTabState(t);
    setLink({ from, to, q });
    if (from || to) setForm((f) => ({ ...f, originCity: from || f.originCity, destCity: to || f.destCity }));
  }, []);

  const setTab = (t: Tab) => {
    setDirection(TABS.findIndex((x) => x.id === t) > TABS.findIndex((x) => x.id === tab) ? 1 : -1);
    setTabState(t);
    const p = new URLSearchParams(window.location.search);
    p.set('tab', t);
    window.history.replaceState(null, '', `/search?${p}`);
  };

  // Network numbers across every listed trip.
  useEffect(() => {
    if (!token) return;
    api<BoardItem[]>('/couriers/board?take=60', { token })
      .then(setBoard)
      .catch(() => setBoard([]));
  }, [token, boardVersion]);
  const stats = useMemo(() => {
    const list = board ?? [];
    const accepting = list.filter((t) => t.bookable);
    return {
      couriers: new Set(list.map((t) => t.handle)).size,
      accepting: accepting.length,
      freeKg: accepting.reduce((s, t) => s + t.remainingKg, 0),
      moving: list.filter((t) => t.phase === 'IN_TRANSIT').length,
      air: list.filter((t) => t.mode === 'AIR').length,
    };
  }, [board]);

  if (!loading && !user) return null;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const findRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const draft = await api<Shipment>('/shipments', {
        method: 'POST',
        token,
        body: { ...form, weightKg: Number(form.weightKg), declaredValue: toMinors(form.declaredValue), photos: photo ? [photo] : [] },
      });
      setShipment(draft);
      const found = await api<{ routes: RouteOption[] }>(`/shipments/${draft.id}/routes`, { token });
      setRoutes(found.routes);
      setStep('routes');
    } catch (err) {
      toast.error({ title: 'Search failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const selectRoute = async (route: RouteOption, attestation: SignedDeclaration) => {
    if (!shipment) return;
    setBusy(true);
    setSignError(null);
    try {
      const updated = await api<Shipment>(`/shipments/${shipment.id}/select-route`, {
        method: 'POST',
        token,
        body: { tripIds: route.legs.map((l) => l.trip.id), attestation },
      });
      setShipment(updated);
      setSigning(null);
      setStep('review');
      window.dispatchEvent(new Event('relay:requests-changed'));
      toast.success({ title: 'Route requested', description: 'Couriers have been notified.' });
    } catch (err) {
      setSignError(err instanceof ApiError ? err.message : 'Request failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const counts: Record<Tab, number | null> = { couriers: board ? stats.accepting : null, routes: null, moving: board ? stats.moving : null };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-[34px] font-light leading-tight tracking-tight text-text-primary sm:text-[44px]">Send a package</h1>
          <p className="text-body-s text-text-tertiary">Pick a verified courier already going your way, or let Relay chain a route for you.</p>
        </div>
        <Button label="Track your deliveries" variant="secondary" fit iconLeading={<PackageSearch size={16} />} href="/deliveries/sending" />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Couriers listed" value={board ? stats.couriers : '—'} sub="Shown by username only" />
        <Stat icon={Luggage} label="Space to book" value={board ? `${stats.freeKg} kg` : '—'} sub={`Across ${stats.accepting} accepting trips`} />
        <Stat icon={Truck} label="On the road" value={board ? stats.moving : '—'} sub="Trips already started" />
        <Stat icon={Plane} label="International" value={board ? stats.air : '—'} sub="Air trips listed" />
      </div>

      {/* Tabs: the highlight slides between them */}
      <nav aria-label="How to send" className="grid grid-cols-3 gap-1 rounded-[22px] border border-border/70 bg-card p-1.5 shadow-light">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={clsx('relative flex min-w-0 items-center justify-center gap-2.5 rounded-[16px] px-2 py-2.5 text-left transition-colors sm:justify-start sm:px-4', active ? 'text-white' : 'text-text-secondary hover:text-text-primary')}
            >
              {active && (
                <motion.span layoutId="send-tab" className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-harbor-900 to-harbor-800 shadow-lg dark:from-harbor-800 dark:to-[#03161b]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <span className={clsx('relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex', active ? 'bg-accent-signal text-harbor-900' : 'bg-surface')}>
                <Icon size={17} />
              </span>
              <span className="relative min-w-0">
                <span className="block text-body-s font-semi-bold sm:text-title-s">
                  {t.label}
                  {counts[t.id] !== null && <span className={clsx('ml-1.5 text-[11px]', active ? 'text-accent-signal' : 'text-text-tertiary')}>{counts[t.id]}</span>}
                </span>
                <span className={clsx('hidden truncate text-[11px] md:block', active ? 'text-white/60' : 'text-text-tertiary')}>{t.sub}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={tab}
          custom={direction}
          initial={{ opacity: 0, x: 28 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 * direction, transition: { duration: 0.14 } }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="min-w-0"
        >
          {tab === 'couriers' && (
            <CarrierBrowser token={token} initialOrigin={link.from} initialDestination={link.to} initialQuery={link.q} onRequest={setSelectedTrip} refreshKey={boardVersion} />
          )}
          {tab === 'moving' && <CarrierBrowser token={token} phase="in_transit" initialQuery={link.q} onRequest={setSelectedTrip} refreshKey={boardVersion} />}
          {tab === 'routes' && (
            <Card bodyClassName="p-5 sm:p-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <Stepper steps={[{ id: 'details', label: 'Details' }, { id: 'routes', label: 'Route' }, { id: 'review', label: 'Requested' }]} activeId={step} />

                {step === 'details' && (
                  <form onSubmit={findRoutes} className="grid gap-4 md:grid-cols-2">
                    <Input name="origin" label="Origin city" value={form.originCity} onChange={set('originCity')} />
                    <Input name="dest" label="Destination city" value={form.destCity} onChange={set('destCity')} />
                    <Select value={form.category} onChange={(v: unknown) => setForm((f) => ({ ...f, category: String(v) }))} listValue={CATEGORIES} label="Category" />
                    <Input name="weight" label="Weight (kg)" value={form.weightKg} onChange={set('weightKg')} />
                    <Input name="value" label="Declared value" value={form.declaredValue} onChange={set('declaredValue')} showMiniButton />
                    <Select value={form.currency} onChange={(v: unknown) => setForm((f) => ({ ...f, currency: String(v) }))} listValue={CURRENCIES} label="Currency" />
                    <Input name="receiverName" label="Receiver name" value={form.receiverName} onChange={set('receiverName')} />
                    <Input name="receiverPhone" label="Receiver phone" value={form.receiverPhone} onChange={set('receiverPhone')} />
                    <div className="flex flex-col gap-2">
                      <p className="text-body-m font-medium text-text-primary">Item photo</p>
                      <ImageUploader imageUrl={photo} setImageUrl={setPhoto} id="item-photo" />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" label={busy ? 'Searching…' : 'Find routes'} size="lg" disabled={busy} iconTrailing={<ArrowRight size={16} />} />
                    </div>
                  </form>
                )}

                {step === 'routes' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-title-base text-text-primary">{routes.length ? `${routes.length} route${routes.length === 1 ? '' : 's'} for ${form.originCity} → ${form.destCity}` : 'No route yet'}</p>
                      <Button label="Change details" variant="text" size="sm" fit onClick={() => setStep('details')} />
                    </div>
                    {routes.length === 0 && (
                      <EmptyState art="search" title="No route found yet" body="No traveller is heading that way in time. Try nearby cities, or pick a courier directly." cta={{ onClick: () => setTab('couriers'), label: 'Browse couriers' }} />
                    )}
                    {routes.map((route, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
                        className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge label={route.legs.length === 1 ? 'Direct' : `${route.legs.length} legs`} color="harbor" />
                          <span className="text-body-s text-text-secondary">Arrives {fmtDate(route.arriveAt)}</span>
                          <span className="ml-auto text-title-m font-semi-bold text-text-primary">{formatMinors(route.totalPrice, route.currency)}</span>
                        </div>
                        <ol className="flex flex-col gap-2">
                          {route.legs.map((leg, j) => (
                            <li key={leg.trip.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-s">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-harbor-900 text-[11px] font-semi-bold text-white dark:bg-harbor-300 dark:text-harbor-900">{j + 1}</span>
                              <ModeIcon mode={leg.trip.mode} size={13} />
                              <span className="font-semi-bold text-text-primary">{leg.trip.originCity} → {leg.trip.destCity}</span>
                              <span className="text-text-tertiary">{fmtDate(leg.trip.departAt)} · {formatMinors(leg.fee, route.currency)}{leg.trip.international ? ' · international' : ''}</span>
                            </li>
                          ))}
                        </ol>
                        <div>
                          <Button label="Select this route" fit disabled={busy} onClick={() => { setSignError(null); setSigning(route); }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {step === 'review' && shipment && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle text-success-text"><Route size={28} /></span>
                    <p className="text-title-l font-semi-bold text-text-primary">Requests sent</p>
                    <p className="max-w-md text-body-m text-text-secondary">
                      Each courier reviews your item and must accept within 48 hours. Follow approvals and chat with them in Deliveries.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button label="Track this shipment" href={`/deliveries/sending/${shipment.id}`} fit />
                      <Button label="View signed declaration" variant="secondary" href={declarationPath(shipment.id)} fit />
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <RequestModal
        trip={selectedTrip}
        token={token}
        senderTier={user?.kycTier ?? 'T0'}
        onClose={() => setSelectedTrip(null)}
        onSent={() => {
          setBoardVersion((v) => v + 1);
          window.dispatchEvent(new Event('relay:requests-changed'));
        }}
      />
      <DeclarationModal
        open={!!signing}
        token={token}
        busy={busy}
        error={signError}
        summary={
          signing && (
            <>
              {form.weightKg} kg of <span className="capitalize">{form.category}</span> · {form.originCity} → {form.destCity} ·{' '}
              {signing.legs.length === 1 ? 'direct' : `${signing.legs.length} legs`} · {formatMinors(signing.totalPrice, signing.currency)}
            </>
          )
        }
        onClose={() => setSigning(null)}
        onConfirm={(signed) => signing && selectRoute(signing, signed)}
      />
    </div>
  );
}
