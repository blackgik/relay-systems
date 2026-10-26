/**
 * Spacing tokens — Qwiva design system.
 *
 * For layout spacing prefer Tailwind's built-in scale (p-4, gap-6, etc.).
 * These named constants are for semantic layout contexts where a descriptive
 * name carries more meaning than a raw number.
 */

// Semantic form/layout spacing
export const spacing = {
  formFieldGap:    '1rem',    // gap between fields in a form
  formSectionGap:  '2rem',    // gap between form sections
  buttonRowGap:    '0.75rem', // gap between action buttons
  sectionPadding:  '1.5rem',  // horizontal/vertical padding for page sections
  headerPadding: {
    x:   '1.25rem',
    top: '1rem',
    bottom: '0.75rem',
  },
} as const;

// Modal width presets
export const modalWidth = {
  sm: '28.5625rem',  // 457px
  md: '43.3125rem',  // 693px
  lg: '51.5625rem',  // 825px
  xl: '68.75rem',    // 1100px
} as const;

// Commonly-seen arbitrary heights found in component audit
// These are documented for reference — prefer Tailwind scale where possible.
export const componentHeight = {
  inputSm: '2.375rem',  // 38px — h-[38px] in select options
  inputMd: '3rem',      // 48px — h-12 (md input)
  inputLg: '3.5rem',    // 56px — h-14 (lg input)
  dropdown: '12.5rem',  // 200px — max-h-[200px] in select/multiselect
} as const;
