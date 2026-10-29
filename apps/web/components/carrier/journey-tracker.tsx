'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Button } from '@/ui/elements';
import { JOURNEY_STAGES, journeyStageIndex, nextJourneyStage } from '@/lib/trip-form';
import { ModeIcon } from '@/components/dashboard/widgets';

/**
 * The carrier moves their trip forward: started -> almost there -> arrived ->
 * awaiting delivery pickup -> package delivered. The vehicle glides along the
 * track to the current stage and bobs while the trip is under way. Stages only
 * move forward, so the last step asks once before it commits.
 */
export function JourneyTracker({
  stage,
  mode,
  cancelled,
  busy,
  onAdvance,
}: {
  stage: string | undefined;
  mode: string;
  cancelled: boolean;
  busy: boolean;
  onAdvance: (next: string, label: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const index = journeyStageIndex(stage);
  const last = JOURNEY_STAGES.length - 1;
  const next = nextJourneyStage(stage);
  const pct = (index / last) * 100;
  const moving = !cancelled && index > 0 && index < last;

  const advance = () => {
    if (!next) return;
    if (next.id === 'DELIVERED' && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onAdvance(next.id, next.label);
  };

  return (
    <div>
      <div className={clsx('tr-stage relative px-3 pb-2 pt-9 sm:px-5', moving && 'tr-moving')}>
        {/* track */}
        <div className="relative h-1.5 rounded-full bg-border">
          <div
            className={clsx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out', cancelled ? 'bg-destructive/60' : 'bg-brand dark:bg-harbor-300')}
            style={{ width: `${pct}%` }}
          />
          {/* stops */}
          {JOURNEY_STAGES.map((s, i) => (
            <span
              key={s.id}
              className={clsx(
                'absolute top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-colors duration-500',
                i < index ? 'border-brand bg-brand text-brand-foreground dark:border-harbor-300 dark:bg-harbor-300' : i === index ? 'border-accent-signal bg-card' : 'border-border-strong bg-card'
              )}
              style={{ left: `${(i / last) * 100}%` }}
              aria-hidden
            >
              {i < index && <Check size={9} strokeWidth={3.5} />}
            </span>
          ))}
          {/* vehicle */}
          <span
            className="absolute -top-8 -translate-x-1/2 transition-[left] duration-1000 ease-out"
            style={{ left: `${pct}%` }}
            aria-hidden
          >
            <span className="tr-vehicle flex h-7 w-7 items-center justify-center rounded-full bg-accent-signal text-harbor-900 shadow-md">
              <ModeIcon mode={mode} size={14} />
            </span>
          </span>
        </div>

        {/* labels */}
        <ol className="relative mt-3 hidden h-8 text-[11px] sm:block" aria-label="Journey stages">
          {JOURNEY_STAGES.map((s, i) => (
            <li
              key={s.id}
              aria-current={i === index ? 'step' : undefined}
              className={clsx(
                'absolute top-0 w-[17%] leading-tight',
                i === 0 ? 'text-left' : i === last ? 'text-right' : '-translate-x-1/2 text-center',
                i === index ? 'font-semi-bold text-text-primary' : i < index ? 'text-text-secondary' : 'text-text-tertiary'
              )}
              style={i === last ? { right: 0 } : { left: i === 0 ? 0 : `${(i / last) * 100}%` }}
            >
              {s.label}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-center text-body-s font-semi-bold text-text-primary sm:hidden" aria-live="polite">
          {cancelled ? 'Cancelled' : JOURNEY_STAGES[index].label} · step {index + 1} of {JOURNEY_STAGES.length}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {cancelled ? (
          <p className="text-body-s font-medium text-destructive">This trip was cancelled. Its journey can no longer move.</p>
        ) : next ? (
          <>
            <Button
              label={busy ? 'Updating…' : confirming ? 'Yes — every package is delivered' : JOURNEY_STAGES[index].action}
              fit
              disabled={busy}
              onClick={advance}
            />
            {confirming ? (
              <Button label="Not yet" variant="text" fit size="sm" onClick={() => setConfirming(false)} />
            ) : (
              <span className="text-body-s text-text-tertiary">Next: {next.label}. Stages only move forward.</span>
            )}
          </>
        ) : (
          <p className="text-body-s font-medium text-success-text">Journey complete. Every package on this trip is delivered.</p>
        )}
      </div>
    </div>
  );
}
