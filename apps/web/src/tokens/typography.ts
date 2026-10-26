/**
 * Typography tokens — Qwiva design system.
 *
 * TWO-AXIS SCALE: size and weight are independent.
 *   Axis 1 — fontScale  : size, line-height, letter-spacing per token (no weight)
 *   Axis 2 — fontWeight : weight values only
 *   defaultWeight       : canonical size → weight pairing (the "composite default")
 *
 * In Tailwind JSX: use text-* aliases (e.g. text-body-m, text-title-base).
 * The Tailwind fontSize entries in tailwind.config.ts still encode a default
 * fontWeight for backward compat — this will be decoupled in Phase 3.
 *
 * In non-Tailwind contexts (Recharts, react-pdf, inline styles):
 *   import { fontScale, fontWeight, defaultWeight } from '@/src/tokens/typography'
 *   Use fontScale[key].px for size, fontWeight[defaultWeight[key]] for weight.
 *
 * Audits:
 *   docs/font-audit.md           (2026-05-28)
 *   docs/typography-reaudit.md   (2026-05-28)
 *
 * Decisions applied (see typography-reaudit.md §7):
 *   D1: title-xs (18px) + title-base (20px) added — covers 42 + 104 production uses
 *       of text-lg / text-xl; title-s and title-m unchanged
 *   D2: Four 14px tokens kept (title-s, body-m, label-l, caption-r) —
 *       each encodes different weight/letter-spacing intent
 *   D3: display-s renamed → display-xs (36px); new display-s = 40px
 *       fills the gap between display-xs (36px) and display-m (45px)
 *   D4: title-base (20px) covers both heading and large-body contexts;
 *       two-axis system resolves weight ambiguity at call site
 *   D5: micro, numeric-l, numeric-xl retained; production migration pending
 *       (see NEEDS MIGRATION comments and typography-migration-map.md)
 *   D6: leading-table = 1 added — replaces leading-[0.2px] in 21 table rows
 */

export const fontFamily = 'var(--font-brand), sans-serif' as const;

// AXIS 1 — Size tokens
//
// Font weight is NOT encoded here — see Axis 2 (fontWeight) and defaultWeight.
//
// Use fontScale in non-Tailwind contexts.
// Use fontSize (the derived flat map) when only the px value is needed.

export const fontScale = {

  // ── Display — hero sections, major announcements ─────────────────────────

  // UNUSED IN PRODUCTION (2 Typography variant= calls only — stories + variant map)
  // Kept for completeness and Recharts/react-pdf contexts. Do not use in new pages.
  'display-l':  { px: 57, lineHeight: '64px', letterSpacing: '0' },

  // 6 production uses (auth verify-success, waitlist form)
  'display-m':  { px: 45, lineHeight: '52px', letterSpacing: '0' },

  // ── D3: new display-s = 40px ──────────────────────────────────────────────
  // Previously display-s was 36px — it is now display-xs (below).
  // NEEDS MIGRATION: 3 files still reference the OLD display-s (36px intent):
  //   app/user/dashboard/(home)/components/getting-started.tsx  (md:text-display-s)
  //   app/auth/resend-verification/page.tsx                     (variant="display-s")
  //   app/components/typography-components.tsx                  (variant="display-s")
  //   → update these to "display-xs" during Phase 3
  //   See: docs/typography-migration-map.md — Table 5
  'display-s':  { px: 40, lineHeight: '48px', letterSpacing: '0' },

  // ── D3: renamed from display-s (was 36px) ────────────────────────────────
  // 2 Typography variant= uses (getting-started hero, display-s direct class)
  'display-xs': { px: 36, lineHeight: '44px', letterSpacing: '0' },

  // ── Numeric — dashboard KPI numerals, large statistics ────────────────────

  // NEEDS MIGRATION: 7 uses of text-[2.625rem] in app/ → text-numeric-xl
  //   See: docs/typography-migration-map.md — Table 4
  'numeric-xl': { px: 42, lineHeight: '48px', letterSpacing: '-0.5px' },

  // ── Headline — page titles, section headers ───────────────────────────────

  // 3 production uses (auth success message, waitlist)
  'headline-l': { px: 32, lineHeight: '40px', letterSpacing: '0' },
  // 11 Typography variant= + 4 direct class uses (auth form headers, POS checkout)
  'headline-m': { px: 28, lineHeight: '36px', letterSpacing: '0' },
  // 35 Typography variant= uses — highest-use headline token
  'headline-s': { px: 24, lineHeight: '32px', letterSpacing: '0' },

  // NEEDS MIGRATION: 12 uses of text-[30px] in app/ → text-numeric-l
  //   See: docs/typography-migration-map.md — Table 4
  'numeric-l':  { px: 30, lineHeight: '36px', letterSpacing: '-0.25px' },

  // ── Title — card headers, widget titles, section headings ─────────────────

  // 19 Typography variant= + 6 direct class uses (modal titles, KYC pages)
  'title-l':    { px: 22, lineHeight: '28px', letterSpacing: '0' },

  // ── D1 / D4: covers 104 production uses of text-xl ───────────────────────
  // Default weight: semi-bold (heading context).
  // For large-body context at 20px, callers pass weight="medium" explicitly.
  'title-base': { px: 20, lineHeight: '28px', letterSpacing: '0' },

  // ── D1: covers 42 production uses of text-lg ─────────────────────────────
  'title-xs':   { px: 18, lineHeight: '28px', letterSpacing: '0' },

  // UNCHANGED (D1) — 82 Typography variant= uses (card titles, form section heads)
  'title-m':    { px: 16, lineHeight: '24px', letterSpacing: '0.15px' },

  // UNCHANGED (D1) — 12 direct + 12 Typography uses (tab labels, compact headings)
  // Note: 14 px = also body-m, label-l, caption-r (D2: each has different weight/spacing)
  'title-s':    { px: 14, lineHeight: '20px', letterSpacing: '0.1px' },

  // ── Body — paragraphs, descriptions, form content ────────────────────────

  // 72 Typography variant= + 3 direct uses
  'body-l':     { px: 16, lineHeight: '24px', letterSpacing: '0.15px' },
  // 55 Typography variant= + 4 direct uses — dominant 14px body token
  'body-m':     { px: 14, lineHeight: '20px', letterSpacing: '0.1px' },
  // 79 Typography variant= uses — helper text, table cell descriptions
  'body-s':     { px: 12, lineHeight: '16px', letterSpacing: '0.25px' },

  // ── Label — form labels, table column headers, navigation items ───────────
  // (D2: all four 14px tokens retained — different weight/spacing intent)

  // ~44 total uses (direct + Typography)
  'label-l':    { px: 14, lineHeight: '20px', letterSpacing: '0.1px' },
  // ~11 total uses
  'label-m':    { px: 12, lineHeight: '16px', letterSpacing: '0.25px' },
  // ~7 total uses
  'label-s':    { px: 11, lineHeight: '16px', letterSpacing: '0.25px' },

  // ── Caption — timestamps, footnotes, fine print ───────────────────────────
  // (D2: 400 regular-weight intent — distinct from body-m at 500)
  // Note: tailwind.config.ts pending update to lh=20px, ls=0.1px (currently 22px / 0.2px)
  'caption-r':  { px: 14, lineHeight: '20px', letterSpacing: '0.1px' },
  // New — covers text-[11px] uses in annotation / caption contexts
  'caption':    { px: 11, lineHeight: '16px', letterSpacing: '0.25px' },

  // ── Micro — badge chips, role labels, count indicators ───────────────────
  // NEEDS MIGRATION: 31 uses of text-[10px] / text-[0.625rem] in app/ → text-micro
  //   See: docs/typography-migration-map.md — Table 4
  'micro':      { px: 10, lineHeight: '14px', letterSpacing: '0.4px' },

} as const;

export type FontSizeKey = keyof typeof fontScale;

/**
 * Flat px map — for non-Tailwind inline styles and backward compat.
 * Derived from fontScale. Prefer fontScale for the full spec.
 *
 * Typical use: Recharts axis tick fontSize, react-pdf text size, stories.
 */
export const fontSize = {
  'display-l':  fontScale['display-l'].px,
  'display-m':  fontScale['display-m'].px,
  'display-s':  fontScale['display-s'].px,
  'display-xs': fontScale['display-xs'].px,
  'numeric-xl': fontScale['numeric-xl'].px,
  'headline-l': fontScale['headline-l'].px,
  'headline-m': fontScale['headline-m'].px,
  'headline-s': fontScale['headline-s'].px,
  'numeric-l':  fontScale['numeric-l'].px,
  'title-l':    fontScale['title-l'].px,
  'title-base': fontScale['title-base'].px,
  'title-xs':   fontScale['title-xs'].px,
  'title-m':    fontScale['title-m'].px,
  'title-s':    fontScale['title-s'].px,
  'body-l':     fontScale['body-l'].px,
  'body-m':     fontScale['body-m'].px,
  'body-s':     fontScale['body-s'].px,
  'label-l':    fontScale['label-l'].px,
  'label-m':    fontScale['label-m'].px,
  'label-s':    fontScale['label-s'].px,
  'caption-r':  fontScale['caption-r'].px,
  'caption':    fontScale['caption'].px,
  'micro':      fontScale['micro'].px,
} as const;

// AXIS 2 — Weight tokens
//
// Font weight is a separate, independent axis from size.
// Apply via the fontWeight prop on Typography, or the font-* Tailwind class.
//
// Primary class names (from tailwind.config.ts theme.fontWeight):
//   font-regular, font-medium, font-semi-bold, font-bold
//
// Aliases kept for backward compat (produce identical CSS):
//   font-normal   = font-regular  (400)
//   font-semibold = font-semi-bold (600)
//
// NOT valid in this project (replaced by custom names):
//   font-extralight  → use font-ultra-light
//   font-extrabold   → use font-extra-bold

export const fontWeight = {

  // ── Production weights (84–350+ codebase uses each) ──────────────────────
  // These are the weights to reach for in new code.

  regular:      400,  // table cells, footnotes, caption-r text         — 84 uses
  medium:       500,  // body copy, labels, form fields — DOMINANT       — 351+ uses
  'semi-bold':  600,  // modal titles, card headers, section names       — 258+ uses
  bold:         700,  // page headings, KPI numerals, emphasis           — 350+ uses

  // ── Not in active production use — available but use sparingly ───────────
  // Configured in tailwind.config.ts; available as Tailwind classes.
  // Use only when explicitly called for by the design.

  'extra-bold': 800,  // 3 codebase uses (decorative only)
  thin:         100,  // 1 codebase use
  'ultra-light': 200, // 1 codebase use
  light:        300,  // 1 codebase use
  black:        900,  // 1 codebase use

} as const;

export type FontWeightKey = keyof typeof fontWeight;

// DEFAULT PAIRINGS
//
// Canonical size → weight mapping, derived from actual codebase usage patterns.
// Source: docs/typography-reaudit.md Section 3c.
//
// In the current Tailwind composite tokens (text-body-m etc.) this pairing
// is baked into the fontSize definition in tailwind.config.ts.
// In the two-axis system (Phase 3), callers pass size + weight explicitly
// and this map provides the default when no weight override is given.

export const defaultWeight: Record<FontSizeKey, FontWeightKey> = {
  // Display — always bold
  'display-l':  'bold',
  'display-m':  'bold',
  'display-s':  'bold',
  'display-xs': 'bold',
  // Numeric — always bold
  'numeric-xl': 'bold',
  'numeric-l':  'bold',
  // Headline — always bold
  'headline-l': 'bold',
  'headline-m': 'bold',
  'headline-s': 'bold',
  // Title — semi-bold for l/base/xs; medium for m/s (smaller title range)
  'title-l':    'semi-bold',
  'title-base': 'semi-bold',
  'title-xs':   'semi-bold',
  'title-m':    'medium',
  'title-s':    'medium',
  // Body — medium
  'body-l':     'medium',
  'body-m':     'medium',
  'body-s':     'medium',
  // Label — medium
  'label-l':    'medium',
  'label-m':    'medium',
  'label-s':    'medium',
  // Caption — caption-r is regular weight by design; caption is medium
  'caption-r':  'regular',
  'caption':    'medium',
  // Micro — medium
  'micro':      'medium',
} as const;

// LINE HEIGHTS (standalone — for non-Tailwind contexts only)
//
// Unitless multipliers for use with Recharts, react-select, react-pdf.
// In Tailwind JSX: use leading-* classes or the values baked into text-* tokens.
//
// D6: Use leading-table (Tailwind) or var(--leading-table) (CSS) for the
//     compact table-row pattern. Replaces 21 uses of leading-[0.2px].

export const lineHeight = {
  tight:   1.25,  // matches Tailwind leading-tight — UNUSED standalone in app/
  snug:    1.375, // UNUSED standalone in app/
  normal:  1.5,
  relaxed: 1.625,
  loose:   2,     // UNUSED standalone in app/
  table:   1,     // D6: compact table rows — CSS var --leading-table; replaces leading-[0.2px]
} as const;

// LETTER SPACING (standalone — for non-Tailwind contexts only)
//
// In Tailwind JSX: text-* token aliases already encode the correct tracking.
// Do not add standalone tracking-[*] classes alongside named tokens.

export const letterSpacing = {
  tight:  '-0.025em', // UNUSED standalone in app/
  normal: '0em',
  wide:   '0.025em',
  wider:  '0.05em',   // UNUSED standalone in app/ (1 use in stories only)
  widest: '0.1em',
} as const;
