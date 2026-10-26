'use client';

import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

export interface StepperStep {
  id: string;
  label: string;
  isComplete?: boolean;
  disabled?: boolean;
}

export interface StepperProps {
  steps: StepperStep[];
  /** id of the step the user is on */
  activeId: string;
  onStepClick?: (id: string) => void;
  /** Accessible name for the step list */
  ariaLabel?: string;
  customClassName?: string;
}

/**
 * Horizontal step indicator: a progress segment per step with a numbered
 * marker and label underneath. Completed steps show a check; the current step
 * is emphasised; steps the user can't reach yet are muted and not clickable.
 */
const Stepper = ({ steps, activeId, onStepClick, ariaLabel = 'Progress', customClassName }: StepperProps) => (
  <nav aria-label={ariaLabel} className={customClassName}>
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => {
        const isActive = step.id === activeId;
        const isDone = !!step.isComplete && !isActive;
        const clickable = !!onStepClick && !step.disabled && !isActive;

        return (
          <li key={step.id} className="min-w-0">
            <button
              type="button"
              onClick={() => clickable && onStepClick?.(step.id)}
              disabled={!clickable}
              aria-current={isActive ? 'step' : undefined}
              className={clsx(
                'group flex w-full flex-col gap-3 text-left focus-visible:outline-none',
                clickable ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <span
                aria-hidden="true"
                className={clsx('h-1 w-full rounded-full transition-colors', isDone ? 'bg-success' : isActive ? 'bg-brand' : 'bg-muted')}
              />
              <span className="flex min-w-0 items-center gap-2 rounded-md group-focus-visible:ring-2 group-focus-visible:ring-brand">
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-s font-semi-bold',
                    isDone ? 'bg-success text-white' : isActive ? 'bg-brand text-white' : 'bg-muted text-text-tertiary'
                  )}
                >
                  {isDone ? <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={clsx(
                    'truncate text-body-s md:text-body-m',
                    isActive
                      ? 'font-semi-bold text-text-primary'
                      : isDone
                        ? 'font-medium text-text-secondary'
                        : 'text-text-tertiary'
                  )}
                >
                  {step.label}
                  {isDone && <span className="sr-only"> (completed)</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

export { Stepper };
