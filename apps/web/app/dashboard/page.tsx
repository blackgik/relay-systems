'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Luggage, Package, PackageCheck, Route, ShieldCheck, Weight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import type { BoardItem, DashboardSummary, TopCourier } from '@/lib/dashboard-types';
import { useDashboardMode } from '@/components/dashboard/shell';
import { CourierCard } from '@/components/dashboard/courier-card';
import { Card, EmptyState, Segmented, StatStrip } from '@/components/dashboard/widgets';
import {
  ActivityCard,
  Hero,
  IdentityCard,
  MoneySection,
  MyShipments,
  MyTrips,
  NextUpCard,
  RingCard,
  TopCouriers,
} from '@/components/dashboard/sections';

type BoardFilter = 'all' | 'accepting' | 'in_transit';

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading dashboard">
      <div className="h-24 rounded-[22px] bg-muted" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-[22px] bg-muted" />
        ))}
      </div>
      <div className="h-80 rounded-[22px] bg-muted" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, token, loading } = useRequireAuth();
  const { mode } = useDashboardMode();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [top, setTop] = useState<TopCourier[]>([]);
  const [board, setBoard] = useState<BoardItem[] | null>(null);
  const [filter, setFilter] = useState<BoardFilter>('accepting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<DashboardSummary>('/dashboard/summary', { token }).then(setData),
      api<TopCourier[]>('/couriers/top', { token }).then(setTop),
    ]).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your dashboard'));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const q = filter === 'all' ? '' : `&phase=${filter}`;
    api<BoardItem[]>(`/couriers/board?take=6${q}`, { token })
      .then(setBoard)
      .catch(() => setBoard([]));
  }, [token, filter]);

  if (!loading && !user) return null;
  if (error) {
    return <EmptyState title="Dashboard unavailable" body={error} cta={{ href: '/dashboard', label: 'Try again' }} />;
  }
  if (!data) return <Skeleton />;

  const kycPending = user && user.kycTier === 'T0' && ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED'].includes(user.onboarding?.status);
  const courierFirst = mode === 'courier';

  const overview =
    mode === 'courier'
      ? [
          { icon: Luggage, label: 'Goods on hand', value: data.courier.onHand, sub: `${data.courier.kgOnHand} kg in your custody`, href: '/trips' },
          { icon: PackageCheck, label: 'Pending requests', value: data.courier.pendingRequests, sub: 'Waiting for your answer', href: '/requests' },
          { icon: Weight, label: 'Kg carried', value: data.courier.kgCarried, sub: `${data.courier.carriedThisMonth} delivered this month` },
          { icon: Route, label: 'Trips taken', value: data.courier.tripsTaken, sub: `${data.courier.routesTaken} distinct routes` },
        ]
      : [
          { icon: Package, label: 'In transit', value: data.sender.inTransit, sub: 'Moving right now' },
          { icon: PackageCheck, label: 'Needs your action', value: data.sender.needsAction, sub: 'Pay or pick a route', href: '/search' },
          { icon: ShieldCheck, label: 'Delivered', value: data.sender.delivered, sub: 'Confirmed by receiver code' },
          { icon: Weight, label: 'Kg sent', value: data.sender.kgSent, sub: `${data.sender.sentThisMonth} sent this month` },
        ];

  return (
    <div className="space-y-5">
      {kycPending && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning-text/20 bg-warning-subtle px-4 py-3">
          <ShieldCheck size={18} className="text-warning-text" />
          <p className="text-body-s text-text-primary">
            <strong>Finish verifying your identity</strong> to send and carry packages.
          </p>
          <Link href="/onboarding" className="ml-auto inline-flex items-center gap-1 text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
            Continue verification <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <Hero data={data} mode={mode} />

      <Card title={mode === 'courier' ? 'Courier overview' : 'Sending overview'} sub={`As of ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}>
        <StatStrip items={overview} />
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <IdentityCard data={data} />
        <ActivityCard data={data} mode={mode} />
        <RingCard data={data} mode={mode} />
        <NextUpCard data={data} mode={mode} />
      </div>

      <MoneySection data={data} />

      <Card
        title="Couriers accepting packages"
        sub="Shown by username only — no real names, so listings can't be used to track people"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<BoardFilter>
              label="Filter courier board"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'accepting', label: 'Accepting' },
                { value: 'in_transit', label: 'On the road' },
              ]}
            />
            <Link
              href="/dashboard/couriers"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-body-s font-semi-bold text-text-primary hover:bg-surface"
            >
              Full board <ArrowUpRight size={14} />
            </Link>
          </div>
        }
      >
        {!board ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-[22px] bg-muted" />
            ))}
          </div>
        ) : board.length === 0 ? (
          <EmptyState title="No couriers match" body="Try another filter, or post your own trip." cta={{ href: '/trips/new', label: 'Post a trip' }} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {board.map((t) => (
              <CourierCard key={t.tripId} trip={t} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <TopCouriers top={top} />
        <div className="space-y-5">
          {courierFirst ? (
            <>
              <MyTrips trips={data.courier.trips} />
              <MyShipments data={data} />
            </>
          ) : (
            <>
              <MyShipments data={data} />
              <MyTrips trips={data.courier.trips} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
