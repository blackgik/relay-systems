'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight, BadgeCheck, Plane, Star, TrainFront, Truck } from 'lucide-react';
import { handleHue, handleMonogram } from '@/lib/handle';
import type { TripPhase } from '@/lib/dashboard-types';

// Shared presentational pieces for the signed-in app. Colours come from the
// semantic tokens so light and dark mode both work.

export function Card({
  title,
  sub,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx('min-w-0 rounded-[22px] border border-border/70 bg-card shadow-light', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-title-base text-text-primary">{title}</h2>}
            {sub && <p className="mt-0.5 text-body-s text-text-tertiary">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Horizon-style overview strip: icon + label, big value, sub-label, divided columns. */
export function StatStrip({
  items,
}: {
  items: { icon: React.ElementType; label: string; value: React.ReactNode; sub: React.ReactNode; href?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-y-5 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, sub, href }, i) => {
        const body = (
          <>
            <dt className="flex items-center gap-2 text-body-m text-text-secondary">
              <Icon size={16} className="text-icon-muted" /> {label}
            </dt>
            <dd className="mt-3 text-[30px] font-semi-bold leading-none tracking-tight text-text-primary">{value}</dd>
            <dd className="mt-2 text-body-s text-text-tertiary">{sub}</dd>
          </>
        );
        return (
          <div
            key={label}
            className={clsx('px-1 lg:px-5', i > 0 && 'lg:border-l lg:border-border', i % 2 === 1 && 'border-l border-border pl-5 lg:pl-5')}
          >
            {href ? (
              <Link href={href} className="block rounded-lg transition-opacity hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </div>
        );
      })}
    </dl>
  );
}

/** Tinted monogram tile for a handle. */
export function HandleAvatar({ handle, size = 40, className }: { handle: string; size?: number; className?: string }) {
  const hue = handleHue(handle);
  return (
    <span
      aria-hidden
      className={clsx('flex shrink-0 items-center justify-center rounded-xl font-bold', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        backgroundColor: `hsl(${hue} 55% 90%)`,
        color: `hsl(${hue} 50% 28%)`,
      }}
    >
      {handleMonogram(handle)}
    </span>
  );
}

export function HandleLink({ handle, className }: { handle: string | null; className?: string }) {
  if (!handle) return <span className={className}>Verified courier</span>;
  return (
    <Link href={`/dashboard/people/${handle}`} className={clsx('hover:underline', className)}>
      @{handle}
    </Link>
  );
}

export const PHASES: Record<TripPhase, { label: string; className: string; dot: string }> = {
  ACCEPTING: { label: 'Accepting', className: 'bg-success-subtle text-success-text', dot: 'bg-success' },
  DEPARTING_SOON: { label: 'Departs today', className: 'bg-warning-subtle text-warning-text', dot: 'bg-accent-signal' },
  IN_TRANSIT: { label: 'On the road', className: 'bg-info-subtle text-info-text', dot: 'bg-info' },
  ARRIVED: { label: 'Arrived', className: 'bg-muted text-text-secondary', dot: 'bg-text-tertiary' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive-subtle text-destructive', dot: 'bg-destructive' },
};

export function PhasePill({ phase, mode }: { phase: TripPhase; mode?: string }) {
  const p = PHASES[phase];
  const label = phase === 'IN_TRANSIT' && mode === 'AIR' ? 'In the air' : p.label;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semi-bold', p.className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', p.dot, phase === 'IN_TRANSIT' && 'animate-pulse')} />
      {label}
    </span>
  );
}

/** Load meter (Horizon style): solid fill over a hatched track. */
export function LoadBar({ pct, label = 'Load', right }: { pct: number; label?: string; right?: React.ReactNode }) {
  const v = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-body-s">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semi-bold text-text-primary">{right ?? `${v}%`}</span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0 4px, hsl(var(--border)) 4px 6px)',
        }}
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function ModeIcon({ mode, size = 16 }: { mode: string; size?: number }) {
  if (mode === 'AIR') return <Plane size={size} />;
  if (mode === 'RAIL') return <TrainFront size={size} />;
  return <Truck size={size} />;
}

export function RouteStrip({ from, to, size = 'md' }: { from: string; to: string; size?: 'sm' | 'md' }) {
  return (
    <span className={clsx('inline-flex min-w-0 items-center gap-1.5 font-semi-bold text-text-primary', size === 'sm' ? 'text-body-s' : 'text-body-m')}>
      <span className="truncate">{from}</span>
      <ArrowRight size={size === 'sm' ? 12 : 14} className="shrink-0 text-accent-signal" />
      <span className="truncate">{to}</span>
    </span>
  );
}

export function VerifiedBadge({ tier }: { tier: string }) {
  if (tier === 'T0') return null;
  return (
    <span
      title={tier === 'T2' ? 'Passport verified' : 'NIN/BVN verified'}
      className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-[11px] font-semi-bold text-text-brand dark:text-harbor-200"
    >
      <BadgeCheck size={12} /> {tier}
    </span>
  );
}

export function Stars({ rating, onDark = false }: { rating: number; onDark?: boolean }) {
  if (!rating) return <span className={clsx('text-body-s', onDark ? 'text-white/60' : 'text-text-tertiary')}>New</span>;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-body-s font-semi-bold', onDark ? 'text-white' : 'text-text-primary')}>
      <Star size={13} className="fill-accent-signal text-accent-signal" />
      {rating.toFixed(2)}
    </span>
  );
}

/** Signed change badge. Up is good unless `invert`. */
export function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || !Number.isFinite(value)) return null;
  const good = invert ? value < 0 : value >= 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semi-bold',
        good ? 'bg-success-subtle text-success-text' : 'bg-destructive-subtle text-destructive'
      )}
    >
      {value >= 0 ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}%
      <span className="sr-only"> versus last month</span>
    </span>
  );
}

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong/60 bg-surface px-4 py-10 text-center">
      <p className="text-title-s text-text-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-body-s text-text-tertiary">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus"
        >
          {cta.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-s font-semi-bold transition-colors',
            value === o.value ? 'bg-card text-text-primary shadow-light' : 'text-text-tertiary hover:text-text-primary'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function monthLabel(ym: string, style: 'short' | 'long' = 'short') {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: style, timeZone: 'UTC' });
}
