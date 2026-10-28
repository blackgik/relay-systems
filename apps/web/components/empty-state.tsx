import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';

// Shared empty state for every list and page. One animated scene — a soft
// halo, a dashed route that draws itself and a parcel travelling along it —
// with a subject that fits the page (parcel, pin, inbox, wallet, search,
// shield, chat). Keyframes live in globals.css (`es-*`) and stop under
// prefers-reduced-motion.

export type EmptyArt = 'parcel' | 'route' | 'inbox' | 'wallet' | 'search' | 'shield' | 'chat' | 'error';

const INK = 'var(--es-ink)';
const AMBER = '#F59E0B';

function Subject({ art }: { art: EmptyArt }) {
  switch (art) {
    case 'route':
      return (
        <g className="es-bob">
          <ellipse className="es-shadow" cx="110" cy="112" rx="16" ry="4" fill={INK} opacity="0.15" />
          <path d="M110 104c-14-16-22-26-22-38a22 22 0 1 1 44 0c0 12-8 22-22 38z" fill={INK} />
          <circle cx="110" cy="66" r="8" fill={AMBER} />
        </g>
      );
    case 'inbox':
      return (
        <g>
          <g className="es-drop">
            <rect x="94" y="40" width="32" height="24" rx="3" fill="var(--es-paper)" stroke={INK} strokeWidth="2" />
            <path d="M94 44l16 11 16-11" fill="none" stroke={INK} strokeWidth="2" />
          </g>
          <path d="M80 78h18l4 8h16l4-8h18v24a4 4 0 0 1-4 4H84a4 4 0 0 1-4-4z" fill={INK} />
          <path d="M80 78l10-18h40l10 18" fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </g>
      );
    case 'wallet':
      return (
        <g>
          <circle className="es-coin" cx="110" cy="40" r="9" fill={AMBER} />
          <rect x="82" y="62" width="56" height="40" rx="8" fill={INK} />
          <rect x="82" y="56" width="48" height="12" rx="4" fill="var(--es-paper)" stroke={INK} strokeWidth="2" />
          <rect x="120" y="76" width="18" height="12" rx="4" fill={AMBER} />
        </g>
      );
    case 'search':
      return (
        <g>
          <Parcel />
          <g className="es-sweep">
            <circle cx="122" cy="62" r="15" fill="var(--es-glass)" stroke={INK} strokeWidth="4" />
            <path d="M133 73l12 12" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>
      );
    case 'shield':
      return (
        <g className="es-bob">
          <path d="M110 36l28 10v20c0 18-12 30-28 36-16-6-28-18-28-36V46z" fill={INK} />
          <path className="es-check" d="M98 70l9 9 16-18" fill="none" stroke={AMBER} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </g>
      );
    case 'chat':
      return (
        <g>
          <g className="es-pop es-pop-1">
            <path d="M80 48h44a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H96l-10 8v-8h-6a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8z" fill={INK} />
            {[92, 102, 112].map((x, i) => (
              <circle key={x} className={`es-dot es-dot-${i}`} cx={x} cy="65" r="3" fill={AMBER} />
            ))}
          </g>
          <g className="es-pop es-pop-2">
            <path d="M118 74h28a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7h-4v7l-8-7h-16a7 7 0 0 1-7-7V81a7 7 0 0 1 7-7z" fill="var(--es-paper)" stroke={INK} strokeWidth="2" />
          </g>
        </g>
      );
    case 'error':
      return (
        <g>
          <Parcel tilt />
          <g className="es-blink">
            <circle cx="134" cy="48" r="11" fill={AMBER} />
            <path d="M134 42v7" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <circle cx="134" cy="53.5" r="1.8" fill={INK} />
          </g>
        </g>
      );
    default:
      return <Parcel />;
  }
}

/** Isometric parcel with tape, gently bobbing. */
function Parcel({ tilt = false }: { tilt?: boolean }) {
  return (
    <g className={tilt ? 'es-tilt' : 'es-bob'}>
      <ellipse className="es-shadow" cx="110" cy="110" rx="26" ry="5" fill={INK} opacity="0.12" />
      <path d="M110 48l28 14-28 14-28-14z" fill="var(--es-box-t)" />
      <path d="M82 62l28 14v30l-28-14z" fill="var(--es-box-l)" />
      <path d="M138 62l-28 14v30l28-14z" fill="var(--es-box-r)" />
      <path d="M96 55l28 14v10" fill="none" stroke="var(--es-tape)" strokeWidth="5" />
    </g>
  );
}

export function EmptyIllustration({ art = 'parcel', size = 'md' }: { art?: EmptyArt; size?: 'sm' | 'md' }) {
  return (
    <svg
      viewBox="0 0 220 130"
      aria-hidden
      className={clsx('empty-scene mx-auto', size === 'sm' ? 'h-20' : 'h-32 sm:h-36')}
    >
      <circle className="es-halo" cx="110" cy="72" r="54" fill="var(--es-halo)" />
      <path
        className="es-route"
        d="M18 110 C 50 70, 80 120, 110 92 S 170 50, 202 78"
        fill="none"
        stroke="var(--es-route)"
        strokeWidth="2"
        strokeDasharray="4 7"
      />
      <circle cx="18" cy="110" r="4" fill={INK} />
      <circle className="es-ping" cx="202" cy="78" r="4" fill={AMBER} />
      <g className="es-traveller">
        <rect x="-5" y="-5" width="10" height="10" rx="2" fill={AMBER} />
      </g>
      <Subject art={art} />
    </svg>
  );
}

export function EmptyState({
  title,
  body,
  art = 'parcel',
  size = 'md',
  cta,
  secondary,
  className,
  tone = 'surface',
}: {
  title: string;
  body?: React.ReactNode;
  art?: EmptyArt;
  size?: 'sm' | 'md';
  cta?: { href: string; label: string } | { onClick: () => void; label: string };
  secondary?: { href: string; label: string };
  className?: string;
  /** 'plain' drops the dashed frame, for use inside an existing card. */
  tone?: 'surface' | 'plain';
}) {
  return (
    <div
      role="status"
      className={clsx(
        'flex flex-col items-center text-center',
        tone === 'surface' && 'rounded-2xl border border-dashed border-border-strong/50 bg-surface',
        size === 'sm' ? 'gap-1 px-4 py-5' : 'gap-2 px-6 py-10',
        className
      )}
    >
      <EmptyIllustration art={art} size={size} />
      <p className={clsx('text-text-primary', size === 'sm' ? 'text-title-s' : 'mt-2 text-title-base')}>{title}</p>
      {body && <p className="mx-auto max-w-sm text-body-s text-text-tertiary">{body}</p>}
      {(cta || secondary) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {cta &&
            ('href' in cta ? (
              <Link
                href={cta.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus"
              >
                {cta.label} <ArrowRight size={14} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={cta.onClick}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus"
              >
                {cta.label}
              </button>
            ))}
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-body-s font-semi-bold text-text-primary hover:bg-card"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
