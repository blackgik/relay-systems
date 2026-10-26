/**
 * Border radius tokens — Qwiva design system.
 * In Tailwind, use: rounded-sm, rounded-md, rounded-lg, rounded-full.
 * Import these constants for non-Tailwind contexts.
 */

export const borderRadius = {
  sm:    '0.5rem',   // 8px
  md:    '0.75rem',  // 12px
  lg:    '1rem',     // 16px
  full:  '9999px',
  badge: '1rem',     // 16px — badge pill
} as const;

export type BorderRadiusKey = keyof typeof borderRadius;
