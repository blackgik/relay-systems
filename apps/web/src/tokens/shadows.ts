/**
 * Shadow tokens — Qwiva design system.
 * In Tailwind, use the named aliases: shadow-light, shadow-card, shadow-sticky-col, etc.
 * Import these constants for non-Tailwind contexts.
 */

export const shadows = {
  // General elevation
  light:     '0px 5px 14px 0px rgba(64, 64, 64, 0.05)',
  lg:        '0px 12px 16px -4px rgba(16, 24, 40, 0.10), 0px 4px 6px -2px rgba(16, 24, 40, 0.05)',
  '2lg':     '5px 5px 50px 0px rgba(26, 32, 44, 0.08)',

  // Component-specific
  card:       '0 2px 7px rgba(211, 217, 227, 0.149)',
  stickyCol:  '-2px 0 4px rgba(0, 0, 0, 0.1)',  // sticky column separator in tables
  toggleKnob: '0px 1px 2px 0px rgba(16, 24, 40, 0.06), 0px 1px 3px 0px rgba(16, 24, 40, 0.10)',
  dropdown:   '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  toast:      '0px 5px 14px 0px rgba(64, 64, 64, 0.05)', // same as light
} as const;

export type ShadowKey = keyof typeof shadows;
