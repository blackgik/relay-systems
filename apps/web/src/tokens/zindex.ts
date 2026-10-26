/**
 * Z-index tokens — Qwiva design system.
 * In Tailwind, use the named aliases: z-dropdown, z-sticky, z-tabs, z-overlay, z-modal, z-toast, z-tooltip.
 * Never use z-[99] or z-[100] — always reference these named tokens.
 */

export const zIndex = {
  base:       0,
  raised:     1,
  dropdown:   10,  // z-dropdown — dropdowns, popovers
  sticky:     11,  // z-sticky   — sticky table columns, sticky headers
  tabs:       51,  // z-tabs     — tab bars above content
  overlay:    99,  // z-overlay  — modal backdrops, drawer overlays
  modal:     100,  // z-modal    — modal dialogs, drawers
  // z-toast: 110 — above modals so toasts are always visible
  toast:     110,  // z-toast    — toast notifications
  // Tooltips portal to <body>, so they must outrank every surface they can be
  // triggered from — including a modal (100) and a toast (110).
  tooltip:   120,  // z-tooltip  — tooltip bubbles
  // ⚠ z-[101] found in DragAndDrop cancel button — flagged for review.
  // If needed, add: aboveModal: 101. Do not use until confirmed intentional.
} as const;

export type ZIndexKey = keyof typeof zIndex;
