/**
 * Color tokens — Qwiva design system.
 *
 * Three layers:
 *   Layer 1 — primitive: raw hex values. Import when you need a concrete value
 *             (e.g. Recharts `fill` props, react-select `styles` object).
 *   Layer 2 — semantic: references to CSS custom properties. Use these in
 *             react-select `styles` or any JS context that must respect dark mode.
 *   Layer 3 — component: intentionally fixed colors that do NOT flip in dark mode
 *             (badge, avatar, toggle, prescription).
 *
 * In Tailwind JSX, use the semantic class aliases defined in tailwind.config.ts
 * (e.g. `bg-background`, `text-foreground`, `bg-brand`) — not these constants.
 * Import these constants only for non-Tailwind contexts.
 *
 * Last updated: 2026-05-27
 * Source of truth for primitive values: Figma "Primitives" variable collection
 * (exported as Primitives.json, Alias.json — identical files).
 */

// Layer 1 — Primitive color values

export const primitive = {
  // Harbor teal — Relay brand / primary color family.
  // Deep-sea teal ramp; 900 is the canonical brand anchor (anomaly
  // preserved from the donor scale: lighter than 800 on purpose).
  harbor: {
    25:  '#f2f9fb',
    50:  '#ddf2f5',
    100: '#b3e2ea',
    200: '#79c4d2',
    300: '#3a9cae',
    400: '#1f6e80',   // = legacy 'darkmode'
    500: '#145665',
    600: '#0d3f4d',   // = legacy 'dark'
    700: '#093039',
    800: '#062227',
    /* Canonical brand anchor — intentionally lighter than 800. Do not "fix" this value. --brand points here. */
    900: '#0b3b4b',   // canonical brand color (anomaly: lighter than 800)
    950: '#030f13',   // true darkest step
    default: '#0b3b4b',
    // LEGACY semantic aliases — preserved for backward compatibility
    dark:     '#072A35',  // = step 600; used for hover/focus states
    light:    '#79C4D2',  // = step 200
    bg:       '#DDF2F5',  // LEGACY, unreferenced — brandSubtle moved to harbor[50] (#ddf2f5)
    darkmode: '#1F6E80',  // = step 400
  },

  black: '#0A0D14',

  // D1: signal amber — the accent color. Distinct from the teal brand ramp.
  // NOT for borders/focus — accent use only (CTAs, route lines, markers).
  signal: '#F59E0B',

  // Grayscale (legacy scale)
  grayscale: {
    input:    '#EFF0F7',
    line:     '#D9DBE9',
    label:    '#6E7191',
    placehold:'#A0A3BD',
    body:     '#4E4B66',
    plain:    '#E4E6E9',
    brown:    '#2E323A',
    dark:     '#0A0A0A',
  },

  // CoolGray — UPDATED 2026-05-27 to match Figma "CoolGray" variable collection.
  //   Semantic tokens --foreground, --muted-foreground, --border now reference
  //   these values via --prim-neutral-{600,500,300} in src/styles/tokens.css.
  //
  // LEGACY values (old Figma color styles — still referenced by Tailwind
  // LEGACY `neutral-*` classes in tailwind.config.ts):
  //   50:  '#EAECF0'  | 100: '#F7F7FC'  | 200: '#EFF0F6'  | 300: '#D9DBE9'
  //   400: '#A0A3BD'  | 500: '#6E7191'  | 600: '#4E4B66'  | 700: '#262338'
  //   800: '#14142A'  | 900: '#F2F4F7'  ← anomaly: was LIGHT bg, not darkest
  neutral: {
    25:  '#FAFAFD',   // hsl(240, 33%, 99%)
    50:  '#F7F7FC',   // hsl(240, 33%, 98%)
    100: '#EEEEF7',   // hsl(240, 25%, 95%)
    150: '#ebedef',   // extra step — matches disable.bg
    200: '#DCDCEA',   // hsl(240, 22%, 89%)
    300: '#C2C2D9',   // hsl(240, 18%, 80%)
    400: '#9D9DBC',   // hsl(240, 16%, 67%)
    500: '#76768E',   // hsl(240, 11%, 49%)
    600: '#5C5C70',   // hsl(240, 11%, 39%)
    700: '#454555',   // hsl(240, 11%, 31%)
    800: '#33333F',   // hsl(240, 12%, 23%)
    900: '#222229',   // hsl(240, 13%, 16%)
    950: '#15151A',   // hsl(240, 14%, 10%)
  },

  // Blue — Figma "Blue" variable collection
  blue: {
    25:      '#f5faff',
    50:      '#eff8ff',  // = badge.info.bg
    100:     '#d1e9ff',  // = avatar.inactive.bg
    200:     '#b2ddff',
    300:     '#84caff',
    400:     '#53b1fd',
    500:     '#2e90fa',   // = DEFAULT
    600:     '#1570ef',
    700:     '#1666d4',  // was #175cd3 — hue adjusted to H≈216° to smooth arc from step 600 at H=214°
    800:     '#1849a9',
    900:     '#194185',  // = avatar.inactive.text
    950:     '#0a1d3d',
    default: '#2e90fa',
  },

  // Green — Figma "Green" variable collection (expanded from partial coverage)
  //
  green: {
    25:      '#f6fef9',
    50:      '#ECFDF3',   // = badge.success.bg
    100:     '#d1fadf',
    200:     '#a6f4c5',
    300:     '#6ce9a6',
    400:     '#32d583',
    500:     '#12b76a',   // was #18BB0C (LEGACY lime-green H≈114°) — Figma canonical H≈152°
    600:     '#039855',   // Updated from #008A00 to match Figma Green/600
    700:     '#027a48',   // Figma Green.700 = badge.success.text
    800:     '#05603a',
    900:     '#054f31',   // Figma Green.900 — was duplicate of step 700
    950:     '#052e16',
    default: '#12b76a',   // = step 500; updated from LEGACY #18BB0C
  },

  // Red — Figma "Red" variable collection (expanded from partial coverage)
  //
  // ⚠ Step misalignment (do not fix until Phase 3 component migration):
  //   - red.50  = '#FEF3F2' (code) vs '#fef2f2' (Figma) — near-identical
  //   - red.100 = '#FFF2F1' (code) vs '#fee2e2' (Figma) — different
  //   - red.500 = '#FF4747' (code) — custom value, no Figma 500 step
  //   - red.900 = '#B42318' (code) but this value = Figma.700; Figma.900 = '#7a271a'
  red: {
    25:   '#fffbfa',
    50:   '#FEF3F2',   // LEGACY (Figma canonical = '#fef2f2')
    100:  '#fee2e2',   // Figma canonical (was #FFF2F1 — near-duplicate of step 50)
    200:  '#fecdca',
    300:  '#fda29b',   // = error.two
    400:  '#f97066',
    500:  '#f04438',   // Figma error.base (was #FF4747 — near-duplicate of step 400; closes 500→600 cliff)
    600:  '#d92d20',
    700:  '#b42318',   // Figma Red.700 = badge.error.text (also stored at key 900 below)
    800:  '#912018',
    900:  '#7a271a',   // Figma canonical Red.900 (was #B42318 = Figma.700 — perceptual inversion fixed)
    950:  '#450a0a',
    base: '#f04438',   // = error.one; Figma Red.base
  },

  error: {
    one: '#F04438',   // = red.base
    two: '#FDA29B',   // = red.300
  },

  warning: {
    text: '#B54708',  // = yellow.700
    bg:   '#FFFAEB',  // = yellow.50
  },

  // Yellow — Figma "Yellow" variable collection
  // (warning.text and warning.bg above retained for backward compat)
  yellow: {
    25:      '#fffcf5',
    50:      '#fffaeb',  // = warning.bg, badge.warning.bg
    100:     '#fef0c7',
    200:     '#fedf89',
    300:     '#fec84b',
    400:     '#fdb022',
    500:     '#f79009',   // = DEFAULT
    600:     '#dc6803',
    700:     '#b54708',  // = warning.text, badge.warning.text
    800:     '#93370d',
    900:     '#7a2e0e',
    950:     '#422006',
    default: '#f79009',
  },

  // Orange — Figma "Orange" variable collection (new — not previously in code)
  orange: {
    25:      '#fffaf5',
    50:      '#fff6ed',
    100:     '#ffead5',
    200:     '#fdd9a2',  // was #fddcab — hue adjusted H≈30° to smooth blip between steps 100 and 300
    300:     '#feb273',
    400:     '#fd853a',
    500:     '#fb6514',   // = DEFAULT
    600:     '#ec4a0a',
    700:     '#c4320a',
    800:     '#9c2a10',
    900:     '#7e2410',
    950:     '#431407',
    default: '#fb6514',
  },

  // Purple — Figma "Purple" variable collection
  // Note: Layer 3 badge.purple.text (#6941C6) and roleBadge.text (#5925DC) are
  // off-scale from this palette and retained as-is in component tokens below.
  purple: {
    25:  '#fafaff',
    50:  '#f4f3ff',   // = badge.purple.bg, avatar.customer.bg
    100: '#ebe9fe',
    200: '#d9d6fe',
    300: '#bdb4fe',
    400: '#9b8afb',
    500: '#7a5af8',
    600: '#6938ef',
    700: '#5925dc',   // = roleBadge.text
    800: '#4a1fb8',
    900: '#3e1c96',   // = avatar.customer.text
    950: '#190c45',
  },

  // Teal palette — Figma "Teal" variable collection
  // Note: primitive.teal ('#F59E0B') is the D1 accent — a different value from
  // tealPalette.default ('#03cfbb'). Both are intentionally preserved.
  tealPalette: {
    25:      '#f7fffd',
    50:      '#f0fffc',
    100:     '#e0fff8',  // = badge.teal.bg, avatar.staff.bg
    200:     '#9cfbef',
    300:     '#6dfded',
    400:     '#41f8e1',
    /* 21-pt lightness cliff from step 400 (L=62%) is intentional — vivid aqua transitions to muted teal here. Add step 450 (#00e5cd, L≈53%) if smooth gradients are required. */
    500:     '#03cfbb',   // = DEFAULT
    600:     '#00857a',
    700:     '#006b62',   // was #007a70 — darkened to L≈20% to create visible separation from step 600 at L=26%
    800:     '#005649',  // = badge.teal.text, avatar.staff.text
    900:     '#003d35',
    950:     '#002420',
    default: '#03cfbb',
  },

  // Lavender — Figma "Lavendar" variable collection
  // (Figma source has a typo — "Lavendar" — corrected to "lavender" in code)
  lavender: {
    25:  '#fbfaff',
    50:  '#f5f4ff',
    100: '#e9e6ff',   // was #f2f0ff — lightened to L≈93% to separate from step 50
    200: '#c4b6ff',
    300: '#c5a8ff',   // was #b78cff (H=270°) — hue shifted to H≈260° to smooth arc
    400: '#b374ff',
    500: '#9f1aff',   // was #aa33ff — L≈55%, distributes 500→600 gap
    600: '#8000cc',   // was #6c00ae — L≈40%, distributes 500→600 gap
    700: '#550084',
    800: '#3a0055',
    900: '#230033',
    950: '#12001a',
  },

  // Rose — Figma "Rose" variable collection (new — not previously in code)
  rose: {
    25:  '#fef6fb',
    50:  '#fdf2fa',
    100: '#fce7f6',
    200: '#fcceee',
    300: '#faa7e0',
    400: '#f670c7',
    500: '#ee46bc',
    600: '#d81e86',  // was #dd2590 — hue adjusted H≈317° to smooth jump from step 500 at H=310°
    700: '#c11574',
    800: '#9e165f',
    900: '#851651',
    950: '#4a0d28',
  },

  // Misc / one-off values
  disable: {
    bg:   '#EBEDEF',  // = slate.150
    text: '#A3A8B0',  // = slate.400 / neutral.400
  },

  overlay:       'rgba(4, 32, 41, 0.502)',
  // D3 (revised 2026-08-09): brand-subtle — canonical brand chip bg, now on the
  // Harbor primitive scale at step 50. Retires primary.bg / primary[50]
  // and the former off-scale legacy tint.
  brandSubtle:   '#ddf2f5',   // = harbor[50] / Harbor/50
  // D6: notification subtitle text — sits between muted-foreground and brand
  textSecondary: '#3E6B7A',
  // D1: signal amber alias (same as primitive.signal above)
  accentSignal:    '#F59E0B',
  modalClose:    '#999CA0',
  addBtnBg:      '#ECF8FF',
  navActive:     '#122A33',
  employeeId:    '#45464f',
  tabBg:         '#F7F7FC',
} as const;

// Layer 1 — Primitive dark scale
// Inverted-lightness equivalents of the light primitive scale.
// Use only inside .dark {} CSS overrides via --prim-dark-* vars in tokens.css.
// Do not reference directly in components — use semantic token classes.

export const primitiveDark = {
  // Harbor teal — brand scale inverted (stop 400 = primary interactive surface)
  harbor: {
    25:  '#041611',
    50:  '#06271f',
    100: '#0b3c2f',   // brand-subtle dark
    200: '#115544',
    300: '#1a705b',   // brand-focus dark (hover)
    400: '#1f7b68',   // primary brand surface in dark mode
    500: '#2e9e88',   // ring dark
    600: '#47c2a9',
    700: '#6cd0bc',
    800: '#85e0d1',
    900: '#9be9e0',
    950: '#b8f0eb',
    default: '#2e9e88',  // = dark stop 500
    dark:    '#1f7b68',  // hover/focus = dark stop 400
    bg:      '#0b3c2f',  // brand-subtle dark = dark stop 100
    dm:      '#1f7b68',  // = dark stop 400
    light:   '#6cd0bc',  // = dark stop 700
  },

  // Signal amber (D1) — lightened for dark bg visibility
  signal: '#FBBF24',

  // Neutral — cool blue-dark character (H≈220–222°, S=14–28%)
  neutral: {
    0:   '#0e1117',   // page bg anchor
    25:  '#121823',
    50:  '#161c28',   // card / popover bg
    100: '#1c2333',   // muted bg
    200: '#252d3d',   // subtle border
    300: '#313b4f',   // border
    400: '#4a5568',   // strong border / placeholder
    500: '#718096',   // muted text
    600: '#a0aec0',   // body text
    700: '#cbd5e0',   // strong text
    800: '#e2e8f0',   // near-white text
    900: '#edf2f7',
  },

  // Green — success feedback (text token at stop 700 = 66:1 contrast)
  green: {
    25:      '#032b14',
    50:      '#054f31',   // success-subtle dark
    100:     '#05603a',
    200:     '#027a48',
    300:     '#039855',
    400:     '#12b76a',
    500:     '#32d583',   // success dark (18:1 contrast)
    600:     '#6ce9a6',
    700:     '#a6f4c5',   // success-text dark (66:1 contrast)
    800:     '#d1fadf',
    900:     '#ecfdf3',
    950:     '#f6fef9',
    default: '#32d583',
  },

  // Red — destructive feedback (stop 500 = 14:1 contrast)
  red: {
    25:   '#2b0a09',
    50:   '#3f1110',   // destructive-subtle dark
    100:  '#551616',
    200:  '#7a271a',
    300:  '#912018',   // destructive-muted dark
    400:  '#b42318',
    500:  '#d92d20',   // destructive dark (14:1 contrast)
    600:  '#f04438',
    700:  '#f97066',
    800:  '#fda29b',
    900:  '#fecdca',
    950:  '#fee2e2',
    base: '#d92d20',
  },

  // Yellow / Amber — warning feedback (text at stop 700 = 45:1 contrast)
  yellow: {
    25:      '#1f1200',
    50:      '#2b1a00',
    100:     '#3d2400',   // warning-subtle dark
    200:     '#573200',
    300:     '#7a4500',
    400:     '#a05a00',
    500:     '#ca7200',   // warning dark
    600:     '#f59e0b',
    700:     '#fbd38d',   // warning-text dark (45:1 contrast)
    800:     '#fde8c3',
    900:     '#fef3d9',
    950:     '#fff8eb',
    default: '#ca7200',
    text:    '#fbd38d',
    bg:      '#573200',  // stop 200 (approved adj. — ΔL=8% from bg)
  },

  // Blue — info feedback (text at stop 700 = 29:1 contrast)
  blue: {
    25:      '#020c1a',
    50:      '#051525',
    100:     '#082136',   // info-subtle dark
    200:     '#0d3158',
    300:     '#1449a0',
    400:     '#1a5bbf',
    500:     '#2176d9',   // info dark (12:1 contrast)
    600:     '#4e9fe8',
    700:     '#76b8f0',   // info-text dark (29:1 contrast)
    800:     '#90cdf4',
    900:     '#bee3fb',
    950:     '#daf0fd',
    default: '#2176d9',
  },

  // Purple
  purple: {
    25:  '#0d0a2e',
    50:  '#13104a',
    100: '#1a1669',
    200: '#231e8a',
    300: '#3a2fc0',
    400: '#5548d9',
    500: '#7062e8',
    600: '#9080f2',
    700: '#b3a4f7',
    800: '#c8befa',
    900: '#ddd8fc',
    950: '#f0eeff',
  },

  // Teal Palette — secondary brand (inverted; S reduced 15–33% to prevent glow)
  tealPalette: {
    25:      '#011a17',
    50:      '#022b25',
    100:     '#044038',
    200:     '#075e52',
    300:     '#0a8070',
    400:     '#0fa895',
    500:     '#14c4af',   // default
    600:     '#1dcdb8',
    700:     '#38d9c4',
    800:     '#5de3d1',
    900:     '#89ede1',
    950:     '#b3f4ec',
    default: '#14c4af',
  },

  // Orange
  orange: {
    25:      '#1f0d00',
    50:      '#2b1500',
    100:     '#3d1e00',
    200:     '#572b00',
    300:     '#7a3d00',
    400:     '#a05200',
    500:     '#cc6a14',
    600:     '#e8824a',
    700:     '#f2a67a',
    800:     '#f7c8a5',
    900:     '#fbe0cc',
    950:     '#fef2e8',
    default: '#cc6a14',
  },

  // Rose (H≈312–320°)
  rose: {
    25:  '#280516',
    50:  '#3a0920',
    100: '#520d2d',
    200: '#701442',
    300: '#941b5a',
    400: '#b82274',
    500: '#d92d8e',
    600: '#ee46bc',
    700: '#f670c7',
    800: '#faa7e0',
    900: '#fce7f6',
    950: '#fdf2fa',
  },

  // Lavender (H≈258–260°)
  lavender: {
    25:  '#0d0824',
    50:  '#150f3a',
    100: '#1f1857',
    200: '#2d2480',
    300: '#4130b3',
    400: '#6148d4',
    500: '#8264e8',
    600: '#a48bf2',
    700: '#c3b0f7',
    800: '#ddd4fb',
    900: '#f0ecfe',
    950: '#f8f6ff',
  },

  // Misc semantic helpers (mirror of light misc named values)
  warning: {
    text: '#fbd38d',  // = yellow dark 700
    bg:   '#573200',  // = yellow dark 200 (stop 200: ΔL=8% from bg — approved adj.)
  },

  // D6: secondary text — lightened (+28L) for dark surface legibility
  textSecondary: '#8FB4C0',  // hsl(209 28% 65%)

  // D1: signal amber dark
  accentSignal: '#FBBF24',  // hsl(43 96% 56%)
} as const;

// Layer 2 — Semantic tokens (CSS custom property references)
// Use these in JS/TS contexts (react-select styles prop, etc.).
// In Tailwind, use the class aliases instead: bg-background, text-foreground, etc.

export const semantic = {
  background:          'hsl(var(--background))',
  foreground:          'hsl(var(--foreground))',
  muted:               'hsl(var(--muted))',
  mutedForeground:     'hsl(var(--muted-foreground))',
  card:                'hsl(var(--card))',
  cardForeground:      'hsl(var(--card-foreground))',
  popover:             'hsl(var(--popover))',
  popoverForeground:   'hsl(var(--popover-foreground))',
  border:              'hsl(var(--border))',
  borderSubtle:        'hsl(var(--border-subtle))',
  borderStrong:        'hsl(var(--border-strong))',
  brand:               'hsl(var(--brand))',
  brandForeground:     'hsl(var(--brand-foreground))',
  destructive:         'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  success:             'hsl(var(--success))',
  successSubtle:       'hsl(var(--success-subtle))',
  successText:         'hsl(var(--success-text))',
  warning:             'hsl(var(--warning))',
  warningSubtle:       'hsl(var(--warning-subtle))',
  warningText:         'hsl(var(--warning-text))',
  info:                'hsl(var(--info))',
  infoSubtle:          'hsl(var(--info-subtle))',
  infoText:            'hsl(var(--info-text))',
  ring:                'hsl(var(--ring))',
  input:               'hsl(var(--input-border))',
  inputBg:             'hsl(var(--input-bg))',
  inputBorderFocus:    'hsl(var(--input-border-focus))',
  // D6: notification subtitle — use var(--text-secondary) in react-select etc.
  secondary:           'var(--text-secondary)',
} as const;

// Layer 3 — Component tokens (intentionally fixed — do NOT flip in dark mode)

export const badge = {
  success: { text: '#027A48', bg: '#ECFDF3' },
  warning: { text: '#B54708', bg: '#FFFAEB' },
  error:   { text: '#B42318', bg: '#FEF3F2' },
  neutral: { text: '#344054', bg: '#F2F4F7' },
  info:    { text: '#175CD3', bg: '#EFF8FF' },
  purple:  { text: '#6941C6', bg: '#F4F3FF' },  // text is off-scale from purple palette
  teal:    { text: '#005649', bg: '#E0FFF8' },
  harbor:  { text: '#145665', bg: '#DDF2F5' },
} as const;

export const avatar = {
  inactive:    { bg: '#D1E9FF', text: '#194185' },
  staff:       { bg: '#E0FFF8', text: '#005649' },
  // Purple conflict resolved (audit §11): canonical bg is #F4F3FF — was #EBE9FE
  customer:    { bg: '#F4F3FF', text: '#3E1C96' },
  activeDot:   '#38C793',
  inactiveDot: '#868C98',
} as const;

export const toggle = {
  bg:     '#F2F4F7',
  border: '#D2D4D7',
} as const;

export const prescription = {
  bg:   '#ECF8FF',
  text: '#003061',
} as const;

export const selected = {
  light: '#B4E5FF',
  bg:    '#D8EFF4',
} as const;

export const roleBadge = {
  bg:   '#F4F3FF',
  text: '#5925DC',  // = purple.700
} as const;

// Semantic hex — resolved light/dark values for every Layer 2 semantic token.
// Source of truth: src/styles/tokens.css (:root and .dark blocks).
// Use these in doc pages and anywhere a concrete hex is needed for display.
// In components, always use the Tailwind class or CSS var — not these constants.

export const semanticHex = {
  light: {
    background:        '#ffffff',
    foreground:        primitive.neutral[600],      // '#5C5C70'
    card:              '#ffffff',
    popover:           '#ffffff',
    muted:             primitive.neutral[100],      // '#EEEEF7'
    mutedForeground:   primitive.neutral[500],      // '#76768E'
    surfaceDisabled:   primitive.disable.bg,         // '#EBEDEF'
    surfaceHover:      '#F9FAFB',                    // --prim-neutral-50
    surfacePressed:    primitive.neutral[200],      // '#DCDCEA'
    surfaceSelected:   primitive.brandSubtle,        // '#ddf2f5'
    textPrimary:       primitive.neutral[800],          // '#33333F' — headings
    textSecondary:     primitive.neutral[600],          // '#5C5C70' — body copy
    textTertiary:      primitive.neutral[400],          // '#9D9DBC' — supporting/placeholder
    textDisabled:      primitive.neutral[300],          // '#C2C2D9' — disabled (lighter than tertiary)
    brand:             primitive.harbor[900],          // '#0b3b4b'
    brandText:         primitive.harbor[900],          // '#0b3b4b' — same as brand in light
    brandForeground:   '#ffffff',
    brandSubtle:       primitive.brandSubtle,        // '#ddf2f5'
    brandFocus:        primitive.harbor.dark,          // '#072A35'
    destructive:       primitive.red[500],           // '#f04438'
    destructiveSubtle: primitive.red[50],            // '#FEF3F2'
    destructiveMuted:  primitive.error.two,          // '#FDA29B'
    success:           primitive.green[500],         // '#12b76a'
    successStrong:     primitive.green[500],         // '#12b76a'
    successSubtle:     primitive.green[50],          // '#ECFDF3'
    successText:       primitive.green[700],         // '#027a48'
    warning:           primitive.warning.text,       // '#B54708'
    warningSubtle:     primitive.warning.bg,         // '#FFFAEB'
    warningText:       primitive.warning.text,       // '#B54708'
    info:              primitive.blue[700],          // '#1666d4'
    infoSubtle:        primitive.blue[50],           // '#eff8ff'
    infoText:          primitive.blue[700],          // '#1666d4'
    border:            primitive.neutral[300],      // '#C2C2D9'
    borderSubtle:      primitive.neutral[200],      // '#DCDCEA'
    borderStrong:      primitive.neutral[400],      // '#9D9DBC'
    ring:              primitive.harbor[900],          // '#0b3b4b'
    focusRing:         primitive.harbor[900],          // '#0b3b4b'
    focusRingOffset:   '#ffffff',
    overlay:           primitive.overlay,            // 'rgba(4, 32, 41, 0.502)'
    secondary:         primitive.textSecondary,      // '#3E6B7A'
    textLink:          primitive.harbor[900],          // '#0b3b4b'
    textLinkHover:     primitive.harbor.dark,          // '#072A35'
    borderBrand:       primitive.harbor[900],          // '#0b3b4b' — dark: white
  },
  dark: {
    background:        primitiveDark.neutral[0],    // '#0e1117'
    foreground:        primitiveDark.neutral[800],  // '#e2e8f0'
    card:              primitiveDark.neutral[50],   // '#161c28'
    popover:           primitiveDark.neutral[100],  // '#1c2333'
    muted:             primitiveDark.neutral[100],  // '#1c2333'
    mutedForeground:   primitiveDark.neutral[600],  // '#a0aec0'
    surfaceDisabled:   primitiveDark.neutral[100],  // '#1c2333'
    surfaceHover:      primitiveDark.neutral[100],  // '#1c2333'
    surfacePressed:    primitiveDark.neutral[200],  // '#252d3d'
    surfaceSelected:   primitiveDark.harbor[100],      // '#0b3c2f'
    textPrimary:       primitive.neutral[50],           // '#F7F7FC' — headings near-white on dark
    textSecondary:     primitive.neutral[100],          // '#EEEEF7' — body on dark
    textTertiary:      primitive.neutral[300],          // '#C2C2D9' — supporting/muted on dark
    textDisabled:      primitive.neutral[400],          // '#9D9DBC' — disabled on dark
    brand:             primitiveDark.harbor[400],      // '#1f7b68'
    brandText:         primitive.neutral[50],           // '#fafafb' — near-white (neutral primitive)
    brandForeground:   primitiveDark.neutral[800],  // '#e2e8f0'
    brandSubtle:       primitiveDark.harbor[100],      // '#0b3c2f'
    brandFocus:        primitiveDark.harbor[300],      // '#1a705b'
    destructive:       primitiveDark.red[500],       // '#d92d20'
    destructiveSubtle: primitiveDark.red[50],        // '#3f1110'
    destructiveMuted:  primitiveDark.red[300],       // '#912018'
    success:           primitiveDark.green[500],     // '#32d583'
    successStrong:     primitiveDark.green[500],     // '#32d583'
    successSubtle:     primitiveDark.green[50],      // '#054f31'
    successText:       primitiveDark.green[700],     // '#a6f4c5'
    warning:           primitiveDark.yellow[500],    // '#ca7200'
    warningSubtle:     primitiveDark.yellow.bg,      // '#573200'
    warningText:       primitiveDark.warning.text,   // '#fbd38d'
    info:              primitiveDark.blue[500],      // '#2176d9'
    infoSubtle:        primitiveDark.blue[100],      // '#082136'
    infoText:          primitiveDark.blue[700],      // '#76b8f0'
    border:            primitiveDark.neutral[300],  // '#313b4f'
    borderSubtle:      primitiveDark.neutral[200],  // '#252d3d'
    borderStrong:      primitiveDark.neutral[400],  // '#4a5568'
    ring:              primitiveDark.harbor[500],      // '#2e9e88'
    focusRing:         primitiveDark.harbor[500],      // '#2e9e88'
    focusRingOffset:   primitiveDark.neutral[0],    // '#0e1117'
    secondary:         primitiveDark.textSecondary,  // '#8FB4C0'
    textLink:          primitive.neutral[50],           // '#fafafb' — near-white (neutral primitive)
    textLinkHover:     '#ffffff',                    // white — prim-neutral-0
    borderBrand:       '#ffffff',                    // white on dark bg
  },
} as const;

// Chart colors — for Recharts fill/stroke props (cannot use Tailwind classes)

export const chart = {
  primary:   '#0B3B4B',
  secondary: '#F59E0B',
  success:   '#18BB0C',
  warning:   '#B54708',
  error:     '#FF4747',
  neutral:   '#A0A3BD',
  green50:   '#ECFDF3',
  green600:  '#008A00',
  harbor:    '#072A35',
  signal:    '#F59E0B',
} as const;
