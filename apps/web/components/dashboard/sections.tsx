'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { formatMinors, formatMinorsShort } from '@/lib/money';
import type { BoardItem, DashboardSummary, TopCourier } from '@/lib/dashboard-types';
import type { DashboardMode } from './shell';
import { ActivityBars, MoneyChart, Ring } from './charts';
import {
  Card,
  Delta,
  EmptyState,
  HandleAvatar,
  ModeIcon,
  PHASES,
  PhasePill,
  RouteStrip,
  Stars,
  VerifiedBadge,
  formatDay,
  formatTime,
  monthLabel,
} from './widgets';

// ── Hero: progress pills + headline numbers (Crextio) ─────────────────

function Pill({ label, pct, tone }: { label: string; pct: number; tone: 'dark' | 'brand' | 'hatched' }) {
  const v = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 truncate text-body-s text-text-tertiary">{label}</p>
      <div
        className="relative h-9 overflow-hidden rounded-full border border-border/60"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, hsl(var(--border)) 0 2px, transparent 2px 7px)' }}
        role="meter"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={clsx(
            'flex h-full min-w-[3.25rem] items-center rounded-full px-3 text-body-s font-semi-bold transition-[width] duration-700',
            tone === 'dark' && 'bg-harbor-900 text-white',
            tone === 'brand' && 'bg-[var(--chart-earned)] text-white',
            tone === 'hatched' && 'bg-card text-text-primary shadow-light'
          )}
          style={{ width: `${v}%` }}
        >
          {v}%
        </div>
      </div>
    </div>
  );
}

export function Hero({ data, mode }: { data: DashboardSummary; mode: DashboardMode }) {
  const { sender, courier, money } = data;
  const nextTrip = courier.trips.find((t) => t.phase !== 'IN_TRANSIT');
  const live = courier.trips.find((t) => t.phase === 'IN_TRANSIT');
  const share = (n: number) => (sender.sent ? (n / sender.sent) * 100 : 0);
  const pills =
    mode === 'courier'
      ? [
          { label: 'Next trip booked', pct: nextTrip ? (nextTrip.bookedKg / Math.max(1, nextTrip.capacityKg)) * 100 : 0, tone: 'dark' as const },
          { label: 'Usual fill rate', pct: money.projection.fillRate * 100, tone: 'brand' as const },
          { label: live ? 'Live trip progress' : 'No trip on the road', pct: live ? live.progress * 100 : 0, tone: 'hatched' as const },
        ]
      : [
          { label: 'Delivered', pct: share(sender.delivered), tone: 'dark' as const },
          { label: 'In transit', pct: share(sender.inTransit), tone: 'brand' as const },
          { label: 'Needs your action', pct: share(sender.needsAction), tone: 'hatched' as const },
        ];
  const numbers = [
    { value: courier.carried, label: 'Carried as courier' },
    { value: sender.sent, label: 'Sent as sender' },
    { value: courier.routesTaken, label: 'Routes taken' },
  ];
  const ordered = mode === 'courier' ? numbers : [numbers[1], numbers[0], numbers[2]];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr] xl:items-end">
      <div>
        <p className="text-body-m text-text-tertiary">
          {mode === 'courier' ? 'Your courier month so far' : 'Your sending at a glance'}
        </p>
        <div className="mt-3 flex gap-2 sm:gap-3">
          {pills.map((p) => (
            <Pill key={p.label} {...p} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {ordered.map(({ value, label }) => (
          <div key={label} className="text-right xl:text-left">
            <p className="text-[44px] font-light leading-none tracking-tight text-text-primary sm:text-[56px]">{value}</p>
            <p className="mt-1 text-body-s text-text-tertiary">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Identity card ────────────────────────────────────────────────────

export function IdentityCard({ data }: { data: DashboardSummary }) {
  const { me } = data;
  return (
    <Link
      href={`/dashboard/people/${me.handle}`}
      className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[22px] bg-harbor-900 p-5 text-white"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(245,158,11,0.35),transparent_55%)]" />
      <div aria-hidden className="absolute left-1/2 top-7 -translate-x-1/2 transition-transform duration-500 group-hover:scale-105">
        <HandleAvatar handle={me.handle} size={112} className="rounded-[28px] shadow-2lg" />
      </div>
      <div className="relative">
        <p className="flex items-center gap-1.5 text-title-l">
          @{me.handle} {me.tier !== 'T0' && <BadgeCheck size={18} className="text-accent-signal" />}
        </p>
        <p className="text-body-s text-white/60">
          Tier {me.tier.slice(1)} · on Relay since {monthLabel(me.memberSince, 'long')} {me.memberSince.slice(0, 4)}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-body-s text-white/80">
            <Stars rating={me.rating} onDark />
          </span>
          <span className="rounded-full border border-white/25 px-3 py-1.5 text-body-s font-semi-bold backdrop-blur">
            {formatMinorsShort(data.balance, data.currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Activity + ring ──────────────────────────────────────────────────

export function ActivityCard({ data, mode }: { data: DashboardSummary; mode: DashboardMode }) {
  const key = mode === 'courier' ? 'delivered' : 'sent';
  const points = data.activity.weeks.map((w) => ({ weekStart: w.weekStart, value: w[key] }));
  const total = points.reduce((s, p) => s + p.value, 0);
  return (
    <Card
      title="Activity"
      action={
        <Link href={mode === 'courier' ? '/trips' : '/search'} aria-label="Open" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary">
          <ArrowUpRight size={16} />
        </Link>
      }
    >
      <p className="flex items-baseline gap-2">
        <span className="text-[34px] font-light leading-none text-text-primary">{total}</span>
        <span className="text-body-s text-text-tertiary">{mode === 'courier' ? 'deliveries' : 'packages sent'}<br />last 8 weeks</span>
      </p>
      <div className="mt-2">
        <ActivityBars points={points} label={mode === 'courier' ? 'Deliveries' : 'Packages sent'} />
      </div>
    </Card>
  );
}

export function RingCard({ data, mode }: { data: DashboardSummary; mode: DashboardMode }) {
  const live = data.courier.trips.find((t) => t.phase === 'IN_TRANSIT');
  const next = data.courier.trips[0];
  if (mode === 'courier') {
    const trip = live ?? next;
    const value = trip ? (live ? live.progress : trip.bookedKg / Math.max(1, trip.capacityKg)) : 0;
    return (
      <Card title={live ? 'On the road' : 'Next trip load'} sub={trip ? `${trip.originCity} → ${trip.destCity}` : 'No trip posted'}>
        <Ring
          value={value}
          label={live ? 'Trip progress' : 'Capacity booked'}
          center={trip ? `${Math.round(value * 100)}%` : '—'}
          caption={live ? 'of the journey' : trip ? `${trip.bookedKg}/${trip.capacityKg} kg` : 'Post a trip'}
        />
        {trip && (
          <p className="mt-4 flex items-center justify-center gap-2 text-body-s text-text-secondary">
            <Clock size={14} />
            {live ? `Lands ${formatTime(trip.arriveAt)}` : `Departs ${formatDay(trip.departAt)}`}
          </p>
        )}
      </Card>
    );
  }
  const rate = data.sender.sent ? data.sender.delivered / data.sender.sent : 0;
  return (
    <Card title="Delivery success" sub="Delivered of everything you've sent">
      <Ring value={rate} label="Delivery success" center={data.sender.sent ? `${Math.round(rate * 100)}%` : '—'} caption={`${data.sender.delivered} of ${data.sender.sent}`} />
      <p className="mt-4 text-center text-body-s text-text-secondary">
        {data.sender.inTransit} on the way · {data.sender.needsAction} need you
      </p>
    </Card>
  );
}

// ── Next up (dark task card) ─────────────────────────────────────────

function Steps({ steps }: { steps: { label: string; sub: string; done: boolean }[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3">
          <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', s.done ? 'bg-white/15' : 'bg-white/5')}>
            <Clock size={14} className="text-white/70" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={clsx('block text-body-s', s.done ? 'text-white' : 'text-white/70')}>{s.label}</span>
            <span className="block truncate text-[11px] text-white/45">{s.sub}</span>
          </span>
          <span className={clsx('flex h-5 w-5 items-center justify-center rounded-full', s.done ? 'bg-accent-signal text-harbor-900' : 'border border-white/25')}>
            {s.done && <Check size={12} strokeWidth={3} />}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function NextUpCard({ data, mode }: { data: DashboardSummary; mode: DashboardMode }) {
  let title = 'Next up';
  let steps: { label: string; sub: string; done: boolean }[] = [];
  let href = '/search';
  if (mode === 'courier') {
    const t = data.courier.trips[0];
    href = '/trips';
    title = t ? `${t.originCity} → ${t.destCity}` : 'Post your next trip';
    steps = t
      ? [
          { label: 'Trip posted', sub: `${t.capacityKg} kg capacity`, done: true },
          { label: 'Requests accepted', sub: `${t.packagesBooked} package${t.packagesBooked === 1 ? '' : 's'} booked`, done: t.packagesBooked > 0 },
          { label: 'Collected & sealed', sub: `${t.packagesOnHand} in your custody`, done: t.packagesOnHand > 0 },
          { label: 'Departed', sub: formatDay(t.departAt), done: t.phase === 'IN_TRANSIT' },
          { label: 'Handed over', sub: '70% paid at handoff', done: false },
        ]
      : [
          { label: 'Get verified', sub: 'NIN, BVN, ID and bank', done: data.me.tier !== 'T0' },
          { label: 'Post a trip', sub: 'Route, date and spare kg', done: false },
          { label: 'Accept a request', sub: 'Within 48 hours', done: false },
        ];
  } else {
    const s = data.sender.recent.find((x) => !['COMPLETED', 'DELIVERED'].includes(x.status)) ?? data.sender.recent[0];
    href = s ? `/shipments/${s.id}` : '/search';
    title = s ? `${s.originCity} → ${s.destCity}` : 'Send your first package';
    const order = ['ROUTED', 'AWAITING_APPROVAL', 'APPROVED', 'FUNDED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
    const at = s ? order.indexOf(s.status) : -1;
    steps = s
      ? [
          { label: 'Route found', sub: `${s.legs} leg${s.legs === 1 ? '' : 's'}`, done: at >= 0 },
          { label: 'Couriers accepted', sub: s.couriers.map((c) => `@${c.handle}`).join(', ') || 'Waiting', done: at >= 2 },
          { label: 'Escrow funded', sub: s.totalPrice ? formatMinors(s.totalPrice, s.currency) : 'Pay to start', done: at >= 3 },
          { label: 'In transit', sub: `${Math.round(s.progress * 100)}% of legs handed over`, done: at >= 4 },
          { label: 'Delivered', sub: 'Receiver code confirms', done: at >= 5 },
        ]
      : [
          { label: 'Search a route', sub: 'Origin and destination', done: false },
          { label: 'Pick couriers', sub: 'Verified travellers', done: false },
          { label: 'Fund escrow', sub: 'Released only on delivery', done: false },
        ];
  }
  const done = steps.filter((s) => s.done).length;
  return (
    <Link href={href} className="flex flex-col rounded-[22px] bg-harbor-900 p-5 text-white transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-s text-white/55">{mode === 'courier' ? 'Next trip' : 'Latest shipment'}</p>
          <p className="truncate text-title-base">{title}</p>
        </div>
        <p className="text-headline-m font-light">
          {done}/{steps.length}
        </p>
      </div>
      <Steps steps={steps} />
    </Link>
  );
}

// ── Money ────────────────────────────────────────────────────────────

export function MoneySection({ data }: { data: DashboardSummary }) {
  const { money, currency } = data;
  const p = money.projection;
  const tiles = [
    { icon: TrendingUp, label: 'Earned carrying', value: money.earned, extra: <Delta value={money.earnedChange} /> },
    { icon: TrendingDown, label: 'Spent sending', value: money.spent, extra: money.refunds ? <span className="text-[11px] text-text-tertiary">after {formatMinorsShort(money.refunds, currency)} refunds</span> : null },
    { icon: Scale, label: 'Net profit / loss', value: money.net, extra: null, tone: money.net >= 0 ? 'text-success-text' : 'text-destructive' },
    { icon: Wallet, label: 'Wallet balance', value: data.balance, extra: null },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
      <Card
        title="Earnings & spending"
        sub="Last 6 months from your wallet ledger, plus next month's projection"
        action={
          <Link href="/wallet" className="inline-flex items-center gap-1 text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
            Wallet <ArrowUpRight size={14} />
          </Link>
        }
      >
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map(({ icon: Icon, label, value, extra, tone }) => (
            <div key={label} className="rounded-2xl bg-surface p-3.5">
              <p className="flex items-center gap-1.5 text-body-s text-text-secondary">
                <Icon size={14} className="text-icon-muted" /> {label}
              </p>
              <p className={clsx('mt-2 text-title-l', tone ?? 'text-text-primary')}>{formatMinorsShort(value, currency)}</p>
              <div className="mt-1 min-h-[18px]">{extra}</div>
            </div>
          ))}
        </div>
        <MoneyChart series={money.series} projected={p.estimate} currency={currency} />
      </Card>

      <Card title="Projections" sub="What's coming as a courier">
        <div className="rounded-2xl bg-harbor-900 p-5 text-white">
          <p className="text-body-s text-white/60">Expected next 30 days</p>
          <p className="mt-1 text-[38px] font-light leading-tight">{formatMinorsShort(p.estimate, currency)}</p>
          <p className="text-body-s text-white/60">
            Committed + open space at your {p.fillRateIsDefault ? 'starting' : 'usual'} {Math.round(p.fillRate * 100)}% fill rate
          </p>
        </div>
        <dl className="mt-4 space-y-3">
          {[
            { label: 'Committed payouts', sub: 'Accepted legs not yet paid in full', value: p.committed },
            { label: 'Open capacity value', sub: 'If every free kilo on your trips sells', value: p.openCapacity },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5">
              <div>
                <dt className="text-body-s font-semi-bold text-text-primary">{r.label}</dt>
                <dd className="text-[12px] text-text-tertiary">{r.sub}</dd>
              </div>
              <dd className="text-title-m text-text-primary">{formatMinorsShort(r.value, currency)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12px] text-text-tertiary">
          Projections are estimates, not guaranteed earnings. Payouts land as custody is proven: 70% at handoff, 30% on delivery.
        </p>
      </Card>
    </div>
  );
}

// ── Top 20 ───────────────────────────────────────────────────────────

export function TopCouriers({ top }: { top: TopCourier[] }) {
  return (
    <Card
      title="Top 20 verified couriers"
      sub="Ranked by rating, weighted by completed deliveries"
      action={<span className="rounded-full bg-surface px-2.5 py-1 text-body-s font-semi-bold text-text-tertiary">{top.length} listed</span>}
      bodyClassName="px-2 pb-3 pt-3"
    >
      {top.length === 0 ? (
        <div className="px-3">
          <EmptyState art="shield" title="No verified couriers yet" body="Verified travellers with trips appear here, ranked by their track record." />
        </div>
      ) : (
        <ol className="max-h-[520px] overflow-y-auto">
          {top.map((c) => (
            <li key={c.handle}>
              <Link href={`/dashboard/people/${c.handle}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-hover">
                <span className={clsx('w-6 text-center text-body-s font-bold', c.rank <= 3 ? 'text-accent-signal' : 'text-text-tertiary')}>{c.rank}</span>
                <HandleAvatar handle={c.handle} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-body-s font-semi-bold text-text-primary">
                    <span className="truncate">@{c.handle}</span>
                    <VerifiedBadge tier={c.tier} />
                  </span>
                  <span className="block truncate text-[12px] text-text-tertiary">
                    {c.deliveries} deliveries · {c.kgCarried} kg · {c.routes} route{c.routes === 1 ? '' : 's'}
                    {c.activeTrip && ` · now ${c.activeTrip.originCity}→${c.activeTrip.destCity}`}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <Stars rating={c.rating} />
                  {c.activeTrip && (
                    <span className={clsx('h-1.5 w-1.5 rounded-full', PHASES[c.activeTrip.phase].dot)} aria-label={PHASES[c.activeTrip.phase].label} />
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

// ── My trips / my shipments ──────────────────────────────────────────

export function MyTrips({ trips }: { trips: BoardItem[] }) {
  return (
    <Card
      title="My routes"
      sub="Trips you're running as a courier"
      action={
        <Link href="/trips" className="inline-flex items-center gap-1 text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
          All trips <ArrowUpRight size={14} />
        </Link>
      }
    >
      {trips.length === 0 ? (
        <EmptyState art="route" title="No upcoming trips" body="Post a trip you're already taking and start earning per kilo." cta={{ href: '/trips?new=1', label: 'Post a trip' }} />
      ) : (
        <ul className="divide-y divide-border">
          {trips.map((t) => (
            <li key={t.tripId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-icon-brand dark:text-harbor-200">
                <ModeIcon mode={t.mode} />
              </span>
              <span className="min-w-0 flex-1">
                <RouteStrip from={t.originCity} to={t.destCity} size="sm" />
                <span className="block text-[12px] text-text-tertiary">
                  {formatDay(t.departAt)} · {t.packagesBooked} booked · {t.remainingKg} kg free
                </span>
              </span>
              <PhasePill phase={t.phase} mode={t.mode} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'bg-success-subtle text-success-text',
  DELIVERED: 'bg-success-subtle text-success-text',
  IN_TRANSIT: 'bg-info-subtle text-info-text',
  FUNDED: 'bg-info-subtle text-info-text',
  APPROVED: 'bg-warning-subtle text-warning-text',
  ROUTED: 'bg-warning-subtle text-warning-text',
  AWAITING_APPROVAL: 'bg-warning-subtle text-warning-text',
  REROUTING: 'bg-destructive-subtle text-destructive',
  DISPUTED: 'bg-destructive-subtle text-destructive',
};

export function MyShipments({ data }: { data: DashboardSummary }) {
  const recent = data.sender.recent;
  return (
    <Card
      title="My shipments"
      sub="Packages you've sent"
      action={
        <Link href="/deliveries/sending" className="inline-flex items-center gap-1 text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
          Track all <ArrowUpRight size={14} />
        </Link>
      }
    >
      {recent.length === 0 ? (
        <EmptyState title="Nothing sent yet" body="Book space with a verified courier and track it here live." cta={{ href: '/search', label: 'Send a package' }} />
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((s) => (
            <li key={s.id}>
              <Link href={`/shipments/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 hover:opacity-80">
                <span className="min-w-0 flex-1">
                  <RouteStrip from={s.originCity} to={s.destCity} size="sm" />
                  <span className="block text-[12px] text-text-tertiary">
                    <span className="capitalize">{s.category}</span> · {s.weightKg} kg · {s.couriers.map((c) => `@${c.handle}`).join(' → ')}
                  </span>
                </span>
                {s.totalPrice != null && <span className="text-body-s font-semi-bold text-text-primary">{formatMinorsShort(s.totalPrice, s.currency)}</span>}
                <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-semi-bold', STATUS_TONE[s.status] ?? 'bg-muted text-text-secondary')}>
                  {s.status.replaceAll('_', ' ').toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
