import React from 'react';
import clsx from 'clsx';

// ── Size map ───────────────────────────────────────────────────────────────────
// xs=12px  sm=16px  md=20px (default)  lg=24px  xl=32px
const SIZE_CLASSES: Record<string, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export interface IconProps {
  /** An app icon from ./app-icons, or any lucide-react icon */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Canonical size token. Default: 'md' (20px) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional Tailwind classes — colour with a text-icon-* token (icons draw in currentColor) */
  className?: string;
  /** Provide for standalone icons with no adjacent visible label */
  'aria-label'?: string;
  /** Explicitly override aria-hidden. Defaults to true unless aria-label is given */
  'aria-hidden'?: boolean;
}

export function Icon({
  icon: SvgIcon,
  size = 'md',
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: IconProps) {
  const hidden = ariaHidden ?? (ariaLabel == null);

  return (
    <SvgIcon
      className={clsx(SIZE_CLASSES[size], 'shrink-0', className)}
      aria-hidden={hidden || undefined}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    />
  );
}
