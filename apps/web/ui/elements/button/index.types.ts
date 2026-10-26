import React from 'react';

// ── Variant ────────────────────────────────────────────────────────────────────

export enum ButtonKind {
  primary               = 'primary',
  secondary             = 'secondary',
  ghost                 = 'ghost',
  subtle                = 'subtle',
  text                  = 'text',
  error                 = 'error',
  // New destructive variants (non-breaking — existing 'error' unchanged)
  'secondary-destructive' = 'secondary-destructive',
  'ghost-destructive'   = 'ghost-destructive',
}

// ── Size ───────────────────────────────────────────────────────────────────────

export enum ButtonSize {
  // ── Canonical names (spec-aligned) ──────────────────────────────────────
  xs     = 'xs',      // h-6  24px
  sm     = 'sm',      // h-8  32px
  md     = 'md',      // h-[38px]
  lg     = 'lg',      // h-12 48px
  xl     = 'xl',      // h-14 56px
  // ── Legacy aliases (backward-compatible — do not remove) ─────────────
  small  = 'small',   // → md
  medium = 'medium',  // → lg
  large  = 'large',   // → xl
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style and semantic intent. Default: 'primary'. */
  variant?: keyof typeof ButtonKind;

  /** Height, padding, and font size. Default: 'small'. */
  size?: keyof typeof ButtonSize;

  /** Button text. Omit for icon-only buttons — add aria-label instead. */
  label?: React.ReactNode | string;

  /** When true: hides label on mobile (< md), shows on md+. */
  hideLabel?: boolean;

  // ── Icon slots ───────────────────────────────────────────────────────────────

  /** Icon before label. Alias: iconLeading. */
  leftIcon?: React.ReactNode;
  /** Icon after label. Alias: iconTrailing. */
  rightIcon?: React.ReactNode;

  /** New: icon before label (alias for leftIcon). */
  iconLeading?: React.ReactNode;
  /** New: icon after label (alias for rightIcon). */
  iconTrailing?: React.ReactNode;

  // ── Shape ────────────────────────────────────────────────────────────────────

  /** Applies rounded-lg corners. Default: true. */
  rounded?: boolean;

  // ── Loading ──────────────────────────────────────────────────────────────────

  /** Legacy loading prop — identical to isLoading. */
  loading?: boolean;
  /** New: shows inline spinner and blocks interaction. Button keeps variant colors. */
  isLoading?: boolean;
  /**
   * New: when false, hides label during loading (spinner only).
   * Default: true (label stays visible alongside spinner).
   */
  showTextWhileLoading?: boolean;

  // ── Disabled ─────────────────────────────────────────────────────────────────

  /** HTML disabled attribute — inherited from ButtonHTMLAttributes. */
  disabled?: boolean;
  /** New: React-prop alias for disabled. Both work identically. */
  isDisabled?: boolean;

  // ── As anchor ────────────────────────────────────────────────────────────────

  /** When provided, renders as <a href={href}> with button styling. */
  href?: string;
  /** Anchor target — only used when href is set. */
  target?: string;
  /** Anchor rel — only used when href is set (e.g. "noopener noreferrer"). */
  rel?: string;

  // ── Width ────────────────────────────────────────────────────────────────────

  /** New: when true, button spans full container width. */
  fullWidth?: boolean;
  /** Legacy: when true, button is w-fit (inverse of fullWidth). */
  fit?: boolean;

  // ── Style override ───────────────────────────────────────────────────────────

  /** Extra classes applied after all computed classes. */
  customClassName?: string;
}
