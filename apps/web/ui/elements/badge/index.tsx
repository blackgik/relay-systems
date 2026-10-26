import React from 'react';
import clsx from 'clsx';

export type BadgeColor =
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'info'
  | 'purple'
  | 'teal'
  | 'harbor';

/** @deprecated Alias kept for backward compat — use BadgeColor */
export type BadgeVariant = BadgeColor;

export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeShape = 'rounded' | 'pill';

export interface BadgeProps {
  label: string;
  /**
   * One of 8 fixed color variants (Layer 3 — never changes in dark mode).
   * Pass 'auto' to infer the color from the label string.
   */
  color?: BadgeColor | 'auto';
  /** @deprecated use color instead */
  variant?: BadgeColor | 'auto';
  size?: BadgeSize;
  shape?: BadgeShape;
  showDot?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  success: 'bg-badge-success-bg text-badge-success-text',
  warning: 'bg-badge-warning-bg text-badge-warning-text',
  error:   'bg-badge-error-bg   text-badge-error-text',
  neutral: 'bg-badge-neutral-bg text-badge-neutral-text',
  info:    'bg-badge-info-bg    text-badge-info-text',
  purple:  'bg-badge-purple-bg  text-badge-purple-text',
  teal:    'bg-badge-teal-bg    text-badge-teal-text',
  harbor:  'bg-badge-harbor-bg  text-badge-harbor-text',
};

/**
 * Every size renders its label at 12px (`text-body-s`).
 *
 * `sm` used to drop to 10px and `lg` to rise to 14px, which meant the same
 * status word — "Unpaid", "Walk-In" — was three different sizes depending on
 * which table it appeared in, and the 10px one sat below the readable floor.
 * Size now varies the badge's footprint (padding, gap, icon) and not its text.
 */
const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-body-s gap-1',
  md: 'px-2    py-1   text-body-s gap-1.5',
  lg: 'px-3    py-1.5 text-body-s gap-2',
};

const iconSizeClasses: Record<BadgeSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

const shapeClasses: Record<BadgeShape, string> = {
  pill:    'rounded-full',
  rounded: 'rounded-md',
};

function inferColor(label: string): BadgeColor {
  const s = label.toLowerCase();
  if (['active', 'paid', 'completed', 'delivered', 'open', 'healthy', 'in stock'].includes(s)) return 'success';
  if (['pending', 'partial', 'progress', 'counted', 'low stock', 'expiring soon'].includes(s)) return 'warning';
  if (['inactive', 'unpaid', 'suspended', 'closed', 'deleted', 'exhausted', 'overrun', 'alert', 'draft', 'expired', 'rejected', 'overdue', 'out of stock', 'failed', 'disputed'].includes(s)) return 'error';
  if (['online', 'scheduled', 'processing', 'new', 'info', 'in transit', 'funded'].includes(s)) return 'info';
  if (['walk-in'].includes(s)) return 'purple';
  if (['staff', 'verified'].includes(s)) return 'teal';
  if (['customer', 'corporate'].includes(s)) return 'harbor';
  return 'neutral';
}

export function Badge({
  label,
  color,
  variant,
  size = 'md',
  shape = 'pill',
  showDot = false,
  icon,
  iconPosition = 'left',
  className,
}: BadgeProps) {
  // color takes precedence; fall back to variant for backward compat
  const colorProp = color ?? variant ?? 'auto';
  const resolvedColor: BadgeColor =
    colorProp === 'auto' ? inferColor(label) : colorProp;

  const iconEl = icon ? (
    <span className={clsx('inline-flex shrink-0 items-center', iconSizeClasses[size])}>
      {icon}
    </span>
  ) : null;

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium capitalize',
        colorClasses[resolvedColor],
        sizeClasses[size],
        shapeClasses[shape],
        className,
      )}
    >
      {showDot && (
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {iconEl && iconPosition === 'left' && iconEl}
      {label}
      {iconEl && iconPosition === 'right' && iconEl}
    </span>
  );
}

export default Badge;
