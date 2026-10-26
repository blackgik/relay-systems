import type { FontSizeKey, FontWeightKey } from '@/src/tokens/typography';
import type { JSX } from 'react';

// HTML tag defaults
//
// Maps every FontSizeKey to its canonical default HTML element.
// Override at the call site via the `as` or `tag` prop.
//
// title-base and title-xs default to `p` — they serve both heading and
// large-body contexts; callers pass `as="h2"` etc. when heading semantics
// are required.

export const tagDefaultMap: Record<FontSizeKey, keyof JSX.IntrinsicElements> = {
  // Display
  'display-l':  'h1',
  'display-m':  'h2',
  'display-s':  'h2',   // 40px — new D3 token; fills gap between display-m and display-xs
  'display-xs': 'h3',   // 36px — D3 rename from display-s
  // Numeric — KPI / large stat values; p by default; override with as="span" in flex rows
  'numeric-xl': 'p',
  'numeric-l':  'p',
  // Headline
  'headline-l': 'h2',
  'headline-m': 'h3',
  'headline-s': 'h4',
  // Title
  'title-l':    'h4',
  'title-base': 'p',    // 20px — heading OR large-body context; p by default
  'title-xs':   'p',    // 18px — heading OR body context; p by default
  'title-m':    'h5',
  'title-s':    'h6',
  // Body / Label / Caption / Micro — inline or paragraph content
  'body-l':     'p',
  'body-m':     'p',
  'body-s':     'p',
  'label-l':    'p',
  'label-m':    'p',
  'label-s':    'p',
  'caption-r':  'p',
  'caption':    'p',
  'micro':      'p',
};

// Legacy variant mapping
//
// Kept for backward compat. The 19 pre-reaudit variant names are still valid
// via the deprecated `variant` prop.
//
// IMPORTANT: display-s maps to 'h3' (not 'h2') to preserve the old 36px
// behavior for callers using variant="display-s" until they migrate to
// size="display-xs" (see docs/typography-migration-map.md Table 5).

export const variantMapping = {
  // Document type scale
  'display-l':  'h1',
  'display-m':  'h2',
  'display-s':  'h3',   // was the old 36px display-s → now display-xs
  'headline-l': 'h2',
  'headline-m': 'h3',
  'headline-s': 'h4',
  'title-l':    'h4',
  'title-m':    'h5',
  'title-s':    'h6',
  'label-l':    'p',
  'label-m':    'p',
  'label-s':    'p',
  'body-l':     'p',
  'body-m':     'p',
  'body-s':     'p',
  'caption-r':  'p',
  // Utility tokens
  'micro':      'p',
  'numeric-l':  'p',
  'numeric-xl': 'p',
} as const;

export type TypographyVariant = keyof typeof variantMapping;

// Re-exported token types
//
// Use FontSizeKey with the `size` prop and FontWeightKey with the `weight`
// prop in new code. TypographySizeKey / TypographyWeightKey are aliases.

export type { FontSizeKey, FontWeightKey };
/** Alias for FontSizeKey — the `size` prop type. */
export type TypographySizeKey = FontSizeKey;
/** Alias for FontWeightKey — the `weight` prop type. */
export type TypographyWeightKey = FontWeightKey;

// Color type (unchanged)

export type TypographyColors =
  // ── Semantic tokens (Layer 2 — dark-mode aware) ──────────────────────────
  | 'inherit'       // inherits parent color — no class applied
  | 'primary'       // → text-foreground (D2: #4E4B66)
  | 'muted'         // → text-muted-foreground (D2: #6E7191)
  | 'brand'         // → text-brand (navy #0B1E4B; flips in dark)
  | 'secondary'     // → text-secondary (D6: #45607A)
  | 'destructive'   // → text-destructive (red; flips in dark)
  | 'error'         // alias of destructive — kept for backward compat
  | 'white'         // → text-white — use on dark surfaces only
  | 'success'       // → text-success-text (dark green — readable)
  | 'active'        // alias of success — kept for backward compat
  | 'info'          // → text-info-text (blue — D4 #175CD3)
  | 'warn'          // → text-warning-text (amber — #B54708)
  // ── Legacy (backward compat — migrate to semantic tokens above) ──────────
  | 'neutral20'     // → text-neutral-20 (#2F3038) — LEGACY
  | 'gSPlacehold'   // → text-muted-foreground — LEGACY (grayscale-placehold)
  | 'gSLabel'       // → text-muted-foreground — LEGACY (grayscale-label)
  | 'gSBody'        // → text-foreground — LEGACY (grayscale-body)
  | 'neutral400'   // → text-muted-foreground — LEGACY
  | 'neutral500'   // → text-muted-foreground — LEGACY (D2 lock)
  | 'neutral600'   // → text-foreground — LEGACY (D2 lock)
  | 'neutral700'   // → text-foreground — LEGACY
  | 'neutral800';  // → text-foreground — LEGACY

export type TypographyAlign = 'start' | 'end' | 'left' | 'right' | 'center' | 'justify';

/**
 * @deprecated Use FontWeightKey (the `weight` prop type) in new code.
 * Kept for backward compat with the deprecated `fontWeight` prop.
 */
export type TypographyFontWeight =
  | 'thin'
  | 'ultra-light'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semi-bold'
  | 'bold'
  | 'extra-bold'
  | 'black';

// TypographyProps

export interface TypographyProps extends React.HTMLAttributes<HTMLOrSVGElement> {

  // ── New two-axis API (Phase 3) ────────────────────────────────────────────

  /**
   * Font **size** token — controls `font-size`, `line-height`, and
   * `letter-spacing`. Maps to the corresponding Tailwind `text-*` alias.
   *
   * Each size has a canonical default weight (see `defaultWeight` in
   * `src/tokens/typography.ts`); pass `weight` to override.
   */
  size?: FontSizeKey;

  /**
   * Font **weight** — independent axis from `size`.
   * Defaults to `defaultWeight[size]` (e.g. bold for display, medium for body).
   * Pass explicitly to override the default pairing.
   */
  weight?: FontWeightKey;

  /**
   * Override the rendered HTML element.
   * Defaults to the semantic element for the `size` token
   * (e.g. `h2` for `display-m`, `p` for `body-m`).
   * Replaces `tag` in new code.
   */
  as?: keyof JSX.IntrinsicElements;

  // ── Deprecated props (backward compat — all call sites still work) ────────

  /**
   * @deprecated Use `size` instead.
   * Every variant value maps 1-to-1 to a `size` value except:
   * `variant="display-s"` → `size="display-xs"` (D3 rename — 36 px intent).
   * Emits `console.warn` in development.
   */
  variant?: TypographyVariant;

  /**
   * @deprecated Use `weight` instead. Prop values are identical.
   * Emits `console.warn` in development.
   */
  fontWeight?: TypographyFontWeight;

  /**
   * @deprecated Use `as` instead. Still supported for backward compat.
   */
  tag?: keyof JSX.IntrinsicElements;

  // ── Unchanged props ───────────────────────────────────────────────────────

  color?: TypographyColors;
  gutterBottom?: boolean;
  align?: TypographyAlign;
  noWrap?: boolean;
  underline?: 'none' | 'always' | 'hover';
  customClassName?: string;
  children?: React.ReactNode;
}
