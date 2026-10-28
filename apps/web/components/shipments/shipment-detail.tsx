'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CircleAlert,
  Clock,
  MapPinned,
  MessageCircle,
  Navigation,
  PackageCheck,
  QrCode,
  Route as RouteIcon,
  ScanLine,
  UserRound,
  Weight,
} from 'lucide-react';
import { Button, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import { formatMinors } from '@/lib/money';
import {
  STATUS_LABEL,
  currentLeg,
  formatDuration,
  groupOf,
  journeyFacts,
  journeyProgress,
  journeyStages,
  nextAction,
  shortId,
  type TrackEvent,
  type TrackLeg,
} from '@/lib/tracking';
import { HandleAvatar, ModeIcon, RouteStrip, formatDay, formatTime } from '@/components/dashboard/widgets';
import { VehicleArt } from '@/components/dashboard/vehicle';
import { ChatPanel } from '@/components/chat-panel';
import { ScanHandoff } from '@/components/scan-handoff';
import { EmptyState } from '@/components/empty-state';
import { RouteMap } from './route-map';

const ShipmentMap = dynamic(() => import('@/components/shipment-map').then((m) => m.ShipmentMap), { ssr: false });

export interface TrackData {
  shipment: {
    id: string;
    senderId: string;
    originCity: string;
    destCity: string;
    category: string;
    weightKg: number;
    declaredValue: number;
    currency: string;
    status: string;
    totalPrice: number | null;
    receiverName: string;
    sealId: string | null;
    createdAt: string;
  };
  legs: TrackLeg[];
  custody: TrackEvent[];
  pings: { lat: number; lng: number; at: string }[];
}

const EVENT_LABEL: Record<string, string> = {
  PICKUP: 'Picked up & sealed',
  TRANSFER: 'Handed to next courier',
  HUB_DROP: 'Dropped at hub',
  DELIVERY: 'Delivered to receiver',
};

const LEG_TONE: Record<string, string> = {
  PROPOSED: 'bg-warning-subtle text-warning-text',
  ACCEPTED: 'bg-info-subtle text-info-text',
  AWAITING_PICKUP: 'bg-info-subtle text-info-text',
  IN_CUSTODY: 'bg-info-subtle text-info-text',
  HANDED_OFF: 'bg-success-subtle text-success-text',
  SETTLED: 'bg-success-subtle text-success-text',
};

// Validated categorical slots (globals.css): waiting, leg 1, leg 2, leg 3.
const stageColor = (i: number) => `var(--tr-stage-${Math.min(i, 3)})`;
const stageInk = (i: number) => `var(--tr-stage-${Math.min(i, 3)}-ink)`;

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-body-s text-text-tertiary">
        <Icon size={13} /> {label}
      </p>
      <p className="mt-0.5 text-title-m text-text-primary sm:text-title-base">{value}</p>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-title-base text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ShipmentDetail({
  data,
  token,
  userId,
  onChanged,
  backHref,
}: {
  data: TrackData;
  token: string;
  userId: string;
  onChanged: () => void;
  backHref?: string;
}) {
  const { shipment: s, legs, custody, pings } = data;
  const [chatLeg, setChatLeg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [view, setView] = useState<'route' | 'gps'>('route');
  const [busy, setBusy] = useState(false);

  const isSender = s.senderId === userId;
  const leg = currentLeg(legs);
  const courier = leg?.trip.carrier?.handle ?? null;
  const progress = journeyProgress(s.status, legs);
  const facts = journeyFacts(s.status, s.originCity, s.destCity, legs);
  const stages = useMemo(() => journeyStages(s.createdAt, legs, custody), [s.createdAt, legs, custody]);
  const stageTotal = stages.reduce((sum, st) => sum + st.ms, 0) || 1;
  const moving = s.status === 'IN_TRANSIT' && leg?.status === 'IN_CUSTODY';
  const seal = s.sealId ?? custody[custody.length - 1]?.sealId ?? null;
  const fees = legs.reduce((sum, l) => sum + l.fee, 0);
  const stops = [s.originCity, ...legs.map((l) => l.trip.destCity)];
  const action = isSender ? nextAction(s.status) : null;
  const canScanFirst = isSender && s.status === 'FUNDED' && legs[0]?.status === 'AWAITING_PICKUP';
  const hasGps = pings.length > 0 || custody.some((c) => c.lat !== null);

  const complete = async () => {
    setBusy(true);
    try {
      await api(`/shipments/${s.id}/complete`, { method: 'POST', token });
      toast.success({ title: 'Shipment completed', description: 'Escrow has been released to your couriers.' });
      onChanged();
    } catch (err) {
      toast.error({ title: 'Could not complete', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tr-fade flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-3">
        {backHref && (
          <Link href={backHref} aria-label="Back to shipments" className="flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden">
            <ArrowLeft size={16} />
          </Link>
        )}
        {courier ? (
          <HandleAvatar handle={courier} size={44} className="rounded-full" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-icon-muted">
            <PackageCheck size={20} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-title-m text-text-primary">{courier ? `@${courier}` : `${s.originCity} → ${s.destCity}`}</p>
          <p className="text-body-s text-text-tertiary">ID: {shortId(s.id)} · {STATUS_LABEL[s.status] ?? s.status}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {leg && (
            <button
              type="button"
              onClick={() => setChatLeg(chatLeg ? null : leg.id)}
              aria-pressed={!!chatLeg}
              aria-label="Chat with courier"
              className={clsx('flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-hover', chatLeg ? 'bg-surface-selected text-text-brand' : 'text-text-secondary')}
            >
              <MessageCircle size={18} />
            </button>
          )}
          {courier && (
            <Link href={`/dashboard/people/${courier}`} aria-label={`View @${courier}`} className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover">
              <UserRound size={18} />
            </Link>
          )}
        </div>
      </header>

      {chatLeg && (
        <div className="tr-fade rounded-2xl border border-border p-4">
          <ChatPanel legId={chatLeg} token={token} currentUserId={userId} />
        </div>
      )}

      {/* ── Hero: the package and how it's travelling ─────────── */}
      <div className="relative overflow-hidden rounded-[22px] bg-surface p-6">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_1.1fr]">
          <div className="relative z-10">
            <h1 className="text-title-l text-text-primary">
              {s.category.charAt(0).toUpperCase() + s.category.slice(1)} parcel <span className="text-text-tertiary">·</span>{' '}
              {s.originCity} → {s.destCity}
            </h1>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-body-s text-text-tertiary">Weight</dt>
                <dd className="text-title-m text-text-primary">{s.weightKg} kg</dd>
              </div>
              <div>
                <dt className="text-body-s text-text-tertiary">Declared value</dt>
                <dd className="text-title-m text-text-primary">{formatMinors(s.declaredValue, s.currency)}</dd>
              </div>
              <div>
                <dt className="text-body-s text-text-tertiary">Courier fees</dt>
                <dd className="text-title-m text-text-primary">{formatMinors(s.totalPrice ?? fees, s.currency)}</dd>
              </div>
              <div>
                <dt className="text-body-s text-text-tertiary">Legs</dt>
                <dd className="text-title-m text-text-primary">{legs.length || '—'}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-md border-2 px-2.5 py-1 font-mono text-body-s font-bold tracking-wider',
                  seal ? 'border-text-primary text-text-primary' : 'border-dashed border-border-strong text-text-tertiary'
                )}
                title="Tamper-evident seal ID"
              >
                {seal ?? 'NOT SEALED'}
              </span>
              <span className="text-body-s text-text-secondary">
                To <strong className="font-semi-bold text-text-primary">{s.receiverName}</strong>
              </span>
            </div>
          </div>
          <div className={clsx('tr-stage relative h-40 md:h-48', moving && 'tr-moving')}>
            <div aria-hidden className="tr-road absolute inset-x-0 bottom-3 h-1.5 rounded-full" />
            <div className="tr-vehicle absolute inset-x-4 bottom-2 top-0">
              <VehicleArt mode={leg?.trip.mode ?? 'ROAD'} weight={30} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Next step for the sender ─────────────────────────── */}
      {action && (
        <div className="tr-fade flex flex-wrap items-center gap-3 rounded-2xl border border-warning-text/20 bg-warning-subtle px-4 py-3">
          <CircleAlert size={18} className="shrink-0 text-warning-text" />
          <p className="flex-1 text-body-s font-medium text-text-primary">{action}</p>
          {s.status === 'APPROVED' && <Button label="Review & pay into escrow" href={`/shipments/${s.id}/pay`} fit size="sm" />}
          {s.status === 'REROUTING' && <Button label="Pick a new route" href="/search" fit size="sm" />}
          {s.status === 'DELIVERED' && <Button label={busy ? 'Completing…' : 'Confirm & complete'} fit size="sm" disabled={busy} onClick={complete} />}
          {canScanFirst && !scanning && <Button label="Scan courier QR" leftIcon={<ScanLine size={15} />} fit size="sm" onClick={() => setScanning(true)} />}
        </div>
      )}
      {canScanFirst && scanning && (
        <div className="rounded-2xl border border-border p-5">
          <ScanHandoff token={token} onDone={onChanged} />
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        {/* ── Routes ─────────────────────────────────────────── */}
        <Section
          title="Routes"
          action={
            hasGps ? (
              <div role="radiogroup" aria-label="Map view" className="flex rounded-full bg-surface p-0.5 text-[12px] font-semi-bold">
                {(['route', 'gps'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={view === v}
                    onClick={() => setView(v)}
                    className={clsx('rounded-full px-3 py-1', view === v ? 'bg-card text-text-primary shadow-light' : 'text-text-tertiary')}
                  >
                    {v === 'route' ? 'Route' : 'Live GPS'}
                  </button>
                ))}
              </div>
            ) : null
          }
        >
          <p className="mb-2 text-[11px] font-semi-bold uppercase tracking-[0.12em] text-text-tertiary">
            {moving ? 'Now on the way' : groupOf(s.status) === 'delivered' ? 'Completed journey' : 'Planned route'}
          </p>
          {leg && (
            <p className="mb-3 text-body-m text-text-primary">
              <span className="font-semi-bold">
                Leg {leg.sequence + 1} of {legs.length}
              </span>{' '}
              · {leg.trip.originCity} → {leg.trip.destCity}
              {leg.trip.carrier?.handle ? ` · @${leg.trip.carrier.handle}` : ''}
            </p>
          )}
          {view === 'gps' && hasGps ? (
            <div className="overflow-hidden rounded-2xl">
              <ShipmentMap pings={pings} checkpoints={custody.map((c) => ({ lat: c.lat, lng: c.lng, label: EVENT_LABEL[c.type] ?? c.type, at: c.occurredAt }))} />
            </div>
          ) : (
            <RouteMap stops={stops} progress={progress} moving={moving} />
          )}
          <div className="mt-4 grid grid-cols-2 gap-4 border-b border-border pb-5 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <Stat icon={RouteIcon} label="Distance" value={facts.distanceKm !== null ? `${facts.distanceKm.toLocaleString()} km` : '—'} />
            <Stat icon={Clock} label="Time left" value={facts.timeLeftMs !== null ? formatDuration(facts.timeLeftMs) : moving ? '—' : groupOf(s.status) === 'delivered' ? 'Arrived' : 'Not started'} />
            <Stat icon={Weight} label="Weight" value={`${s.weightKg} kg`} />
            <Stat icon={Navigation} label="Progress" value={`${Math.round(progress * 100)}%`} />
          </div>

          <h3 className="mb-2 mt-5 text-[11px] font-semi-bold uppercase tracking-[0.12em] text-text-tertiary">All legs</h3>
          {legs.length === 0 ? (
            <EmptyState art="route" size="sm" title="No route chosen yet" body="Pick a courier to plan the journey." cta={{ href: '/search', label: 'Choose a courier' }} />
          ) : (
            <ol className="divide-y divide-border">
              {legs.map((l, i) => (
                <li key={l.id} className="tr-rise flex flex-wrap items-center gap-x-3 gap-y-1 py-3" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-icon-brand dark:text-harbor-200">
                    <ModeIcon mode={l.trip.mode} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <RouteStrip from={l.trip.originCity} to={l.trip.destCity} size="sm" />
                    <span className="block text-[12px] text-text-tertiary">
                      Departs {formatDay(l.trip.departAt)}, {formatTime(l.trip.departAt)} · {formatMinors(l.fee, l.currency)}
                      {l.status === 'PROPOSED' && ` · accept by ${formatDay(l.acceptDeadline)}`}
                      {l.trip.carrier?.handle && (
                        <>
                          {' · '}
                          <Link href={`/dashboard/people/${l.trip.carrier.handle}`} className="hover:underline">
                            @{l.trip.carrier.handle}
                          </Link>
                        </>
                      )}
                    </span>
                  </span>
                  <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-semi-bold', LEG_TONE[l.status] ?? 'bg-muted text-text-secondary')}>
                    {l.status.replaceAll('_', ' ').toLowerCase()}
                  </span>
                  <button type="button" onClick={() => setChatLeg(l.id)} className="text-[12px] font-semi-bold text-text-link hover:underline dark:text-harbor-200">
                    Chat
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* ── Journey statistics ─────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-8">
          <Section title="Journey statistics">
            <p className="mb-3 text-[11px] font-semi-bold uppercase tracking-[0.12em] text-text-tertiary">Time spent in each stage</p>
            {stages.length === 0 ? (
              <EmptyState art="parcel" size="sm" title="The clock starts at pickup" body="Stage times appear once the shipment is moving." />
            ) : (
              <>
                <div className="flex h-11 overflow-hidden rounded-xl" role="img" aria-label="Share of journey time per stage">
                  {stages.map((st, i) => {
                    const pct = (st.ms / stageTotal) * 100;
                    return (
                      <div
                        key={st.key}
                        className="tr-grow flex items-center overflow-hidden whitespace-nowrap px-2 text-[12px] font-semi-bold first:rounded-l-xl last:rounded-r-xl"
                        style={{
                          flexBasis: `${pct}%`,
                          animationDelay: `${i * 120}ms`,
                          background: st.projected
                            ? `repeating-linear-gradient(135deg, ${stageColor(st.colorIndex)} 0 4px, transparent 4px 8px)`
                            : stageColor(st.colorIndex),
                          boxShadow: st.projected ? `inset 0 0 0 1.5px ${stageColor(st.colorIndex)}` : undefined,
                          color: st.projected ? 'hsl(var(--text-primary))' : stageInk(st.colorIndex),
                          marginRight: i < stages.length - 1 ? 2 : 0,
                        }}
                        title={`${st.label}: ${formatDuration(st.ms)}`}
                      >
                        {pct >= 12 &&
                          (st.projected ? (
                            <span className="rounded-md bg-card/90 px-1.5 py-0.5 text-text-primary">{pct.toFixed(1)}%</span>
                          ) : (
                            `${pct.toFixed(1)}%`
                          ))}
                      </div>
                    );
                  })}
                </div>
                <table className="mt-3 w-full text-body-s">
                  <tbody className="divide-y divide-border">
                    {stages.map((st, i) => (
                      <tr key={st.key}>
                        <td className="py-2">
                          <span className="flex items-center gap-2 text-text-secondary">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                              style={{
                                background: st.projected
                                  ? `repeating-linear-gradient(135deg, ${stageColor(st.colorIndex)} 0 2px, transparent 2px 4px)`
                                  : stageColor(st.colorIndex),
                                boxShadow: st.projected ? `inset 0 0 0 1px ${stageColor(st.colorIndex)}` : undefined,
                              }}
                            />
                            {st.label}
                          </span>
                        </td>
                        <td className="py-2 text-right font-semi-bold text-text-primary">{formatDuration(st.ms)}</td>
                        <td className="w-16 py-2 text-right text-text-tertiary">{((st.ms / stageTotal) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          <Section title="Checkpoints">
            {custody.length === 0 ? (
              <EmptyState
                art="route"
                size="sm"
                title="No handoffs yet"
                body={s.status === 'FUNDED' ? 'Hand the package to your courier and scan their QR to start the trail.' : 'Every scan, seal and photo will be logged here.'}
              />
            ) : (
              <ol className="relative ml-3 border-l-2 border-border">
                {[...custody].reverse().map((e, i) => (
                  <li key={e.id} className="tr-rise relative pb-5 pl-6 last:pb-0" style={{ animationDelay: `${i * 90}ms` }}>
                    <span
                      className={clsx(
                        'absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-card',
                        i === 0 ? 'bg-accent-signal' : 'bg-brand'
                      )}
                    >
                      {i === 0 && moving && <span className="tr-pulse-dot absolute inset-0 rounded-full bg-accent-signal" />}
                    </span>
                    <p className="text-body-s font-semi-bold text-text-primary">{EVENT_LABEL[e.type] ?? e.type}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-tertiary">
                      <span>
                        {formatDay(e.occurredAt)}, {formatTime(e.occurredAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <QrCode size={12} /> {e.sealId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera size={12} /> {e.photos.length} photo{e.photos.length === 1 ? '' : 's'}
                      </span>
                      {e.lat !== null && (
                        <span className="flex items-center gap-1">
                          <MapPinned size={12} /> GPS
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {groupOf(s.status) === 'delivered' && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-success-subtle px-3 py-2 text-body-s text-success-text">
                <BadgeCheck size={16} /> Receiver confirmed with their one-time code.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
