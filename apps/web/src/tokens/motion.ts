/**
 * Motion tokens — Qwiva design system.
 * Durations and easing functions derived from component audit.
 * In Tailwind, prefer the named aliases: duration-fast, duration-base, duration-slow, etc.
 * Import these constants for JS animation libraries or inline style contexts.
 */

// Duration in milliseconds
export const duration = {
  instant: 0,
  fast:    150, // used for tooltip show/hide, icon transitions
  base:    200, // default transition (most interactive elements)
  slow:    300, // used for modal/dropdown open/close
  slower:  500, // used for progress animations, page transitions
} as const;

// Duration as CSS strings (for use in transition/animation CSS properties)
export const durationCss = {
  instant: '0ms',
  fast:    '150ms',
  base:    '200ms',
  slow:    '300ms',
  slower:  '500ms',
} as const;

export type DurationKey = keyof typeof duration;

// Easing functions
export const easing = {
  linear:    'linear',
  easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
  easeOut:   'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:    'cubic-bezier(0.34, 1.56, 0.64, 1)', // slight overshoot
} as const;

export type EasingKey = keyof typeof easing;
