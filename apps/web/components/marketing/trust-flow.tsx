'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { BadgeCheck, FileSignature, PackagePlus, ShieldCheck, Truck } from 'lucide-react';

// Landing-page walkthrough of one package's life on Relay: the sender asks,
// the courier checks them and accepts, both sign the declaration, the parcel
// travels sealed, and the receiver's code closes it out with a review each
// way. Auto-advances; any step can be picked. Keyframes: `tf-*` in globals.css.

const STEPS = [
  {
    id: 'request',
    icon: PackagePlus,
    title: 'Sender requests',
    body: 'Pick a courier already going your way, weigh the parcel, see the price per kilo.',
  },
  {
    id: 'accept',
    icon: BadgeCheck,
    title: 'Courier checks & accepts',
    body: 'The courier reads the sender’s record and reviews first. Accepting unlocks both verified identities.',
  },
  {
    id: 'declare',
    icon: FileSignature,
    title: 'Agreement is signed',
    body: 'The sender attests the goods are lawful; the courier is bound against theft. Both get the stamped A4.',
  },
  {
    id: 'deliver',
    icon: Truck,
    title: 'Sealed delivery',
    body: 'Tamper seal, photos and GPS at every handoff, so the parcel is tracked from hand to hand.',
  },
  {
    id: 'acknowledge',
    icon: ShieldCheck,
    title: 'Acknowledged & rated',
    body: 'The receiver’s one-time code confirms delivery, escrow pays out, and each side rates the other.',
  },
] as const;

const STEP_MS = 3800;

function Avatar({ x, y, label, tone }: { x: number; y: number; label: string; tone: 'harbor' | 'signal' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="22" className={tone === 'harbor' ? 'fill-harbor-900 dark:fill-harbor-300' : 'fill-accent-signal'} />
      <text textAnchor="middle" dy="5" fontSize="14" fontWeight="700" className={tone === 'harbor' ? 'fill-white dark:fill-harbor-900' : 'fill-harbor-900'}>
        {label}
      </text>
    </g>
  );
}

function Scene({ step }: { step: number }) {
  // Each scene remounts on step change so its animations replay from the start.
  switch (STEPS[step].id) {
    case 'request':
      return (
        <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden>
          <rect x="40" y="30" width="170" height="160" rx="18" className="fill-card stroke-border" strokeWidth="2" />
          <Avatar x={78} y={68} label="HH" tone="harbor" />
          <rect x="108" y="58" width="80" height="8" rx="4" className="fill-border" />
          <rect x="108" y="72" width="54" height="6" rx="3" className="fill-border" />
          <g className="tf-drop">
            <rect x="96" y="96" width="58" height="46" rx="6" className="fill-[#C68A4E]" />
            <path d="M96 112h58M125 96v46" stroke="#8A5A2B" strokeWidth="3" />
          </g>
          <rect x="62" y="154" width="126" height="24" rx="12" className="fill-harbor-900 dark:fill-harbor-300" />
          <text x="125" y="170" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-white dark:fill-harbor-900">Request · ₦2,000/kg</text>
          <path d="M215 110 C 260 60, 300 70, 330 50" className="tf-dash fill-none stroke-border-strong" strokeWidth="2" strokeDasharray="4 6" />
          <g opacity="0">
            <path d="M-11 -8 l22 8 -22 8 5 -8z" className="fill-accent-signal" />
            <set attributeName="opacity" to="1" begin="0.7s" fill="freeze" />
            <animateMotion dur="1.6s" begin="0.7s" fill="freeze" rotate="auto" path="M215 110 C 260 60, 300 70, 330 50" />
          </g>
        </svg>
      );
    case 'accept':
      return (
        <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden>
          <rect x="30" y="26" width="300" height="168" rx="18" className="fill-card stroke-border" strokeWidth="2" />
          <Avatar x={70} y={66} label="AO" tone="signal" />
          <text x="102" y="62" fontSize="13" fontWeight="700" className="fill-text-primary">@harbor-heron-21</text>
          <text x="102" y="80" fontSize="10" className="fill-text-tertiary">38 sent · 37 delivered · 0 disputes</text>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${60 + i * 20} 112)`}>
              <path
                d="M0 -8 l2.4 5 5.4 .6 -4 3.7 1.1 5.4 -4.9 -2.8 -4.9 2.8 1.1 -5.4 -4 -3.7 5.4 -.6z"
                className="tf-star fill-accent-signal"
                style={{ animationDelay: `${0.25 + i * 0.15}s` }}
              />
            </g>
          ))}
          <rect x="52" y="132" width="180" height="8" rx="4" className="fill-border" />
          <rect x="52" y="146" width="130" height="8" rx="4" className="fill-border" />
          <g transform="translate(262 140)">
            <g className="tf-stamp">
              <circle r="32" className="fill-success/20 stroke-success" strokeWidth="3" />
              <path d="M-13 0l9 9 17-18" className="tf-check fill-none stroke-success" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </svg>
      );
    case 'declare':
      return (
        <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden>
          <g className="tf-rise">
            <rect x="105" y="14" width="150" height="196" rx="6" className="fill-[#FFFDF8] stroke-border" strokeWidth="2" />
            <rect x="105" y="14" width="150" height="6" rx="3" className="fill-harbor-900" />
            <rect x="120" y="34" width="70" height="8" rx="4" className="fill-harbor-900/80" />
            {[52, 62, 72, 86, 96, 106, 116].map((y, i) => (
              <rect key={y} x="120" y={y} width={i % 3 === 2 ? 80 : 118} height="4" rx="2" className="fill-[#D9E3E6]" />
            ))}
            <path d="M122 168 c 8 -16 14 6 22 -4 s 10 -10 16 2 s 10 4 18 -6" className="tf-sign fill-none stroke-harbor-900" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M120 176h70" className="stroke-harbor-900" strokeWidth="1" />
          </g>
          <g transform="translate(222 160)"><g className="tf-thump">
            <circle r="26" fill="none" stroke="#B4232A" strokeWidth="3" opacity="0.85" />
            <circle r="20" fill="none" stroke="#B4232A" strokeWidth="1" opacity="0.85" />
            <text textAnchor="middle" dy="4" fontSize="10" fontWeight="900" fill="#B4232A" opacity="0.9">SIGNED</text>
          </g></g>
        </svg>
      );
    case 'deliver':
      return (
        <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden>
          <path d="M20 160 H340" className="stroke-border" strokeWidth="14" strokeLinecap="round" />
          <path d="M20 160 H340" className="tf-road stroke-card" strokeWidth="2" strokeDasharray="14 12" />
          <g transform="translate(320 120)">
            <path d="M0 0c-8-10-12-16-12-22a12 12 0 1 1 24 0c0 6-4 12-12 22z" className="fill-harbor-900 dark:fill-harbor-300" />
            <circle cy="-22" r="4.5" className="fill-white" />
          </g>
          <g className="tf-drive">
            <rect x="0" y="118" width="74" height="34" rx="6" className="fill-harbor-900 dark:fill-harbor-300" />
            <path d="M74 126 h18 l12 14 v12 h-30z" className="fill-harbor-700 dark:fill-harbor-200" />
            <rect x="12" y="126" width="22" height="16" rx="2" className="fill-[#C68A4E]" />
            <circle cx="20" cy="154" r="8" className="fill-text-primary" />
            <circle cx="84" cy="154" r="8" className="fill-text-primary" />
            <circle cx="20" cy="154" r="3" className="fill-card" />
            <circle cx="84" cy="154" r="3" className="fill-card" />
          </g>
          {[70, 170, 260].map((x, i) => (
            <g key={x} transform={`translate(${x} 60)`}>
              <g className="tf-ping" style={{ animationDelay: `${0.4 + i * 0.7}s` }}>
                <circle r="14" className="fill-accent-signal/20" />
                <circle r="5" className="fill-accent-signal" />
              </g>
            </g>
          ))}
          <text x="180" y="200" textAnchor="middle" fontSize="10" letterSpacing="2" className="fill-text-tertiary">SEALED · PHOTOGRAPHED · GPS LOGGED</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden>
          {['4', '8', '1', '9', '2', '6'].map((d, i) => (
            <g key={i} transform={`translate(${66 + i * 40} 52)`}>
              <g className="tf-pop" style={{ animationDelay: `${i * 0.12}s` }}>
                <rect x="-16" y="-20" width="32" height="40" rx="8" className="fill-card stroke-border" strokeWidth="2" />
                <text textAnchor="middle" dy="7" fontSize="20" fontWeight="700" className="fill-text-primary">{d}</text>
              </g>
            </g>
          ))}
          <g transform="translate(180 132)">
            <circle r="30" className="fill-success/20" />
            <path d="M-13 0l9 9 17-18" className="tf-check fill-none stroke-success" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: '0.8s' }} />
          </g>
          {[
            { x: 40, label: 'Sender rates courier' },
            { x: 230, label: 'Courier rates sender' },
          ].map((r, j) => (
            <g key={r.label} transform={`translate(${r.x} 186)`}>
              <text y="-10" fontSize="9" className="fill-text-tertiary">{r.label}</text>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`translate(${8 + i * 16} 4)`}>
                  <path
                    d="M0 -6 l1.8 3.8 4 .4 -3 2.8 .8 4 -3.6 -2.1 -3.6 2.1 .8 -4 -3 -2.8 4 -.4z"
                    className="tf-star fill-accent-signal"
                    style={{ animationDelay: `${1.2 + j * 0.5 + i * 0.1}s` }}
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>
      );
  }
}

export function TrustFlow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [step, paused]);

  const pct = (step / (STEPS.length - 1)) * 100;

  return (
    <div
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Steps */}
      <ol className="flex min-w-0 flex-col gap-2" aria-label="How a package moves on Relay">
        {STEPS.map((s, i) => {
          const active = i === step;
          const Icon = s.icon;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={active ? 'step' : undefined}
                className={clsx(
                  'relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-colors sm:p-4',
                  active ? 'border-harbor-900 bg-harbor-900 text-white dark:border-harbor-300 dark:bg-harbor-800' : 'border-border bg-card hover:bg-surface-hover'
                )}
              >
                <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', active ? 'bg-accent-signal text-harbor-900' : 'bg-surface text-text-secondary')}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className={clsx('block text-[11px] font-semi-bold uppercase tracking-[0.2em]', active ? 'text-white/60' : 'text-text-tertiary')}>Step {i + 1}</span>
                  <span className="block text-title-s font-semi-bold">{s.title}</span>
                  <span className={clsx('mt-0.5 text-body-s', active ? 'block text-white/75' : 'hidden text-text-secondary sm:block')}>{s.body}</span>
                </span>
                {active && !paused && (
                  <span aria-hidden className="tf-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent-signal" style={{ animationDuration: `${STEP_MS}ms` }} />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Stage */}
      <div className="order-first min-w-0 overflow-hidden rounded-[28px] border border-border bg-surface p-4 sm:p-6 lg:order-none">
        <div className="relative aspect-[36/22] w-full">
          <div key={step} className="tf-scene absolute inset-0">
            <Scene step={step} />
          </div>
        </div>
        {/* Progress rail: the parcel travels sender → acknowledged */}
        <div className="relative mx-2 mt-4 h-8" aria-hidden>
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
          <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-harbor-900 transition-[width] duration-700 dark:bg-harbor-300" style={{ width: `${pct}%` }} />
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={clsx('absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors', i <= step ? 'border-harbor-900 bg-harbor-900 dark:border-harbor-300 dark:bg-harbor-300' : 'border-border-strong bg-card')}
              style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
            />
          ))}
          <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out" style={{ left: `${pct}%` }}>
            <span className="block h-5 w-5 rounded-md bg-[#C68A4E] shadow-md ring-2 ring-card" />
          </span>
        </div>
        <p className="mt-1 text-center text-body-s font-semi-bold text-text-primary" aria-live="polite">
          {step + 1}/{STEPS.length} · {STEPS[step].title}
        </p>
      </div>
    </div>
  );
}
