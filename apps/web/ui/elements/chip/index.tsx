'use client';

import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export type ChipVariant = 'display' | 'filter' | 'input';
export type ChipColor = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info';
export type ChipSize = 'sm' | 'md';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  color?: ChipColor;
  /** filter variant — marks chip as selected (bg-brand style) */
  selected?: boolean;
  /** input variant — called when × is clicked */
  onRemove?: () => void;
  /** filter variant — called when chip is clicked */
  onClick?: () => void;
  disabled?: boolean;
  size?: ChipSize;
  className?: string;
}

const sizeClasses: Record<ChipSize, string> = {
  sm: 'px-2 py-0.5 text-label-s gap-1 min-h-[24px]',
  md: 'px-2.5 py-1 text-body-s gap-1.5 min-h-[32px]',
};

const removeIconSizeClasses: Record<ChipSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

/** Color classes for display + filter-unselected states */
const colorClasses: Record<ChipColor, string> = {
  default: 'bg-muted text-text-secondary border border-border',
  brand:   'bg-brand text-white border border-brand',
  success: 'bg-badge-success-bg text-badge-success-text border border-transparent',
  warning: 'bg-badge-warning-bg text-badge-warning-text border border-transparent',
  error:   'bg-badge-error-bg text-badge-error-text border border-transparent',
  info:    'bg-badge-info-bg text-badge-info-text border border-transparent',
};

/** Selected state for filter chips — always brand regardless of color */
const selectedClasses = 'bg-brand text-white border border-brand';
const disabledClasses = 'opacity-40 cursor-not-allowed pointer-events-none';

export function Chip({
  label,
  variant = 'display',
  color = 'default',
  selected = false,
  onRemove,
  onClick,
  disabled = false,
  size = 'md',
  className,
}: ChipProps) {
  const isFilter = variant === 'filter';
  const isInput  = variant === 'input';

  const resolvedColor = isFilter && selected ? selectedClasses : colorClasses[color];

  const baseClasses = clsx(
    'inline-flex items-center rounded-full font-medium',
    sizeClasses[size],
    resolvedColor,
    disabled && disabledClasses,
    className,
  );

  if (isFilter) {
    return (
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-pressed={selected}
        className={clsx(
          baseClasses,
          !disabled && 'cursor-pointer transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        )}
      >
        {label}
      </button>
    );
  }

  if (isInput) {
    return (
      <span className={baseClasses}>
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={disabled ? undefined : onRemove}
            disabled={disabled}
            aria-label={`Remove ${label}`}
            className={clsx(
              'inline-flex shrink-0 items-center justify-center rounded-full text-current transition-colors',
              'hover:text-destructive focus:outline-none focus-visible:ring-1 focus-visible:ring-destructive',
              removeIconSizeClasses[size],
            )}
          >
            <X className="h-full w-full" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </span>
    );
  }

  // display (non-interactive)
  return (
    <span className={baseClasses}>
      {label}
    </span>
  );
}

export default Chip;
