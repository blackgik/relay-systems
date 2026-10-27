'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { ArrowLeft, BadgeCheck, EyeOff, Package, PencilLine, Truck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import type { PublicProfile } from '@/lib/dashboard-types';
import { MonthlyColumns, Ring } from '@/components/dashboard/charts';
import { CourierCard } from '@/components/dashboard/courier-card';
import {
  Card,
  EmptyState,
  HandleAvatar,
  ModeIcon,
  RouteStrip,
  Segmented,
  Stars,
  VerifiedBadge,
  formatDay,
  monthLabel,
} from '@/components/dashboard/widgets';

type Facet = 'courier' | 'sender';

export default function PersonPage() {
  const { handle } = useParams<{ handle: string }>();
  const { user, token, loading } = useRequireAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [facet, setFacet] = useState<Facet>('courier');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !handle) return;
    setProfile(null);
    api<PublicProfile>(`/people/${encodeURIComponent(handle)}`, { token })
      .then((p) => {
        setProfile(p);
        // Open on whichever side this person is more active on.
        setFacet(p.courier.deliveries + p.courier.activeTrips.length >= p.sender.sent ? 'courier' : 'sender');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this profile'));
  }, [token, handle]);

  if (!loading && !user) return null;
  if (error) return <EmptyState title="Profile not found" body={error} cta={{ href: '/dashboard/couriers', label: 'Browse couriers' }} />;
  if (!profile) return <div className="h-96 animate-pulse rounded-[22px] bg-muted" aria-label="Loading profile" />;

  const c = profile.courier;
  const s = profile.sender;
  const live = c.activeTrips.find((t) => t.phase === 'IN_TRANSIT');
  const bookable = c.activeTrips.find((t) => t.phase !== 'IN_TRANSIT' && t.remainingKg > 0 && !t.isMine);

  const numbers =
    facet === 'courier'
      ? [
          { value: c.deliveries, label: 'Deliveries' },
          { value: `${c.kgCarried}`, label: 'Kg carried' },
          { value: c.routes.length, label: 'Routes' },
        ]
      : [
          { value: s.sent, label: 'Packages sent' },
          { value: s.delivered, label: 'Delivered' },
          { value: s.corridors, label: 'Corridors' },
        ];
  const ringValue = facet === 'courier' ? c.completionRate ?? 0 : s.sent ? s.delivered / s.sent : 0;
  const hasRing = facet === 'courier' ? c.completionRate !== null : s.sent > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/couriers" className="inline-flex items-center gap-1.5 text-body-s font-medium text-text-secondary hover:text-text-primary">
          <ArrowLeft size={15} /> Courier board
        </Link>
        <Segmented<Facet>
          label="Profile view"
          value={facet}
          onChange={setFacet}
          options={[
            { value: 'courier', label: <><Truck size={14} /> As courier</> },
            { value: 'sender', label: <><Package size={14} /> As sender</> },
          ]}
        />
      </div>

      {profile.isMe && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-body-s text-text-secondary">
          <EyeOff size={16} className="text-icon-muted" />
          This is exactly what other people see — your username, never your real name.
          <Link href="/dashboard/settings" className="ml-auto inline-flex items-center gap-1 font-semi-bold text-text-link hover:underline dark:text-harbor-200">
            <PencilLine size={14} /> Change username
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr] xl:items-end">
        <div>
          <h2 className="flex items-center gap-2 text-[40px] font-light leading-tight tracking-tight text-text-primary sm:text-[48px]">
            @{profile.handle}
            {profile.verified && <BadgeCheck size={28} className="text-text-brand dark:text-accent-signal" />}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-body-m text-text-tertiary">
            <Stars rating={profile.rating} /> · <VerifiedBadge tier={profile.tier} /> · on Relay since {monthLabel(profile.memberSince, 'long')}{' '}
            {profile.memberSince.slice(0, 4)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {numbers.map((n) => (
            <div key={n.label}>
              <p className="text-[44px] font-light leading-none tracking-tight text-text-primary sm:text-[56px]">{n.value}</p>
              <p className="mt-1 text-body-s text-text-tertiary">{n.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[22px] bg-harbor-900 p-5 text-white">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_60%_25%,rgba(245,158,11,0.35),transparent_55%)]" />
          <div className="absolute left-1/2 top-8 -translate-x-1/2">
            <HandleAvatar handle={profile.handle} size={120} className="rounded-[30px] shadow-2lg" />
          </div>
          <div className="relative">
            <p className="text-title-l">@{profile.handle}</p>
            <p className="text-body-s text-white/60">
              {live ? `On the road: ${live.originCity} → ${live.destCity}` : bookable ? `Next: ${bookable.originCity} → ${bookable.destCity}` : 'No trip listed right now'}
            </p>
            {bookable && (
              <Link
                href={`/search?from=${encodeURIComponent(bookable.originCity)}&to=${encodeURIComponent(bookable.destCity)}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-accent-signal px-4 py-2.5 text-body-s font-semi-bold text-harbor-900 hover:bg-yellow-400"
              >
                Book space · {bookable.remainingKg} kg free
              </Link>
            )}
          </div>
        </div>

        <Card title={facet === 'courier' ? 'Deliveries' : 'Packages sent'} sub="Per month, last 6 months">
          <MonthlyColumns points={facet === 'courier' ? c.monthly : s.monthly} label={facet === 'courier' ? 'Deliveries' : 'Packages sent'} />
        </Card>

        <Card title={facet === 'courier' ? 'Completion rate' : 'Delivery success'} sub={facet === 'courier' ? 'Settled vs lost, no-show or disputed' : 'Delivered of sent'}>
          <Ring
            value={ringValue}
            label={facet === 'courier' ? 'Completion rate' : 'Delivery success'}
            center={hasRing ? `${Math.round(ringValue * 100)}%` : '—'}
            caption={facet === 'courier' ? `${c.tripsTaken} trips taken` : `${s.inTransit} in transit`}
          />
        </Card>

        <div className="rounded-[22px] bg-harbor-900 p-5 text-white">
          {facet === 'courier' ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body-s text-white/55">Trips listed</p>
                  <p className="text-title-base">Active & upcoming</p>
                </div>
                <p className="text-headline-m font-light">{c.activeTrips.length}</p>
              </div>
              <ul className="mt-4 space-y-2.5">
                {c.activeTrips.slice(0, 5).map((t) => (
                  <li key={t.tripId} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <ModeIcon mode={t.mode} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-s">{t.originCity} → {t.destCity}</span>
                      <span className="block text-[11px] text-white/50">{formatDay(t.departAt)} · {t.remainingKg} kg free</span>
                    </span>
                    <span className={clsx('h-2 w-2 rounded-full', t.phase === 'IN_TRANSIT' ? 'animate-pulse bg-accent-signal' : 'bg-white/40')} />
                  </li>
                ))}
                {c.activeTrips.length === 0 && <li className="text-body-s text-white/60">Nothing listed at the moment.</li>}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body-s text-white/55">What they send</p>
                  <p className="text-title-base">Categories</p>
                </div>
                <p className="text-headline-m font-light">{s.categories.length}</p>
              </div>
              <ul className="mt-4 space-y-3">
                {s.categories.slice(0, 6).map((cat) => (
                  <li key={cat.category}>
                    <div className="mb-1 flex justify-between text-body-s capitalize">
                      <span>{cat.category}</span>
                      <span className="text-white/60">{cat.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-accent-signal" style={{ width: `${(cat.count / Math.max(1, s.sent)) * 100}%` }} />
                    </div>
                  </li>
                ))}
                {s.categories.length === 0 && <li className="text-body-s text-white/60">No packages sent yet.</li>}
              </ul>
            </>
          )}
        </div>
      </div>

      {facet === 'courier' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">
          <Card title="Routes travelled" sub="City pairs this courier has carried on">
            {c.routes.length === 0 ? (
              <EmptyState title="No routes yet" body="Completed trips will show here." />
            ) : (
              <ul className="divide-y divide-border">
                {c.routes.map((r) => (
                  <li key={`${r.originCity}-${r.destCity}`} className="flex items-center gap-3 py-3">
                    <span className="flex gap-1 text-icon-brand dark:text-harbor-200">
                      {r.modes.map((m) => (
                        <ModeIcon key={m} mode={m} size={15} />
                      ))}
                    </span>
                    <RouteStrip from={r.originCity} to={r.destCity} size="sm" />
                    <span className="ml-auto text-body-s text-text-tertiary">
                      {r.trips} trip{r.trips === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Live trips" sub="Book space directly on an open trip">
            {c.activeTrips.length === 0 ? (
              <EmptyState title="No open trips" body="When this courier lists a trip, it appears here." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {c.activeTrips.map((t) => (
                  <CourierCard key={t.tripId} trip={t} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {facet === 'sender' && s.sent > 0 && (
        <Card title="Sender record" sub="Couriers can check who they're carrying for — without seeing who they are">
          <p className="text-body-m text-text-secondary">
            {s.delivered} of {s.sent} packages delivered across {s.corridors} corridor{s.corridors === 1 ? '' : 's'}
            {s.inTransit ? `, ${s.inTransit} on the way now` : ''}.
          </p>
        </Card>
      )}
    </div>
  );
}
