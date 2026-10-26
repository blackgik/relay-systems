'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Types ─────────────────────────────────────────────────────────────────────
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Text or node shown inside the tooltip bubble */
  content: React.ReactNode;
  /** Direction the bubble appears relative to the trigger */
  placement?: TooltipPlacement;
  /** The element that triggers the tooltip on hover/focus */
  children: React.ReactNode;
  className?: string;
  /** Extra classes for the outer wrapper span (e.g. responsive visibility) */
  wrapperStyle?: string;
  /** Prevents text from wrapping — replaces max-w-[220px] with whitespace-nowrap */
  noWrap?: boolean;
  /** Show only on hover, not on focus */
  hoverOnly?: boolean;
  /** Extra classes applied directly to the tooltip bubble */
  bubbleClassName?: string;
}

/** Distance between the trigger edge and the bubble, in px. Matches the old `mb-2`/`mt-2`. */
const GAP = 8;
/** Minimum breathing room between the bubble and the viewport edge, in px. */
const VIEWPORT_PADDING = 8;

// ── Arrow classes ─────────────────────────────────────────────────────────────
// The arrow is a child of the bubble, so it is still positioned relative to it.
const ARROW: Record<TooltipPlacement, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-tooltip-bg',
  bottom:
    'bottom-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-tooltip-bg',
  left: 'left-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-tooltip-bg',
  right:
    'right-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-tooltip-bg',
};

type Coords = { top: number; left: number };

/** Where the bubble sits, in viewport coordinates, for a given trigger rect. */
const anchorTo = (rect: DOMRect, placement: TooltipPlacement): Coords => {
  switch (placement) {
    case 'bottom':
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - GAP };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + GAP };
    case 'top':
    default:
      return { top: rect.top - GAP, left: rect.left + rect.width / 2 };
  }
};

/** The translate that turns the anchor point into the bubble's own corner. */
const TRANSFORM: Record<TooltipPlacement, string> = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
};

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Tooltip — wraps any element with a hover/focus-visible tooltip.
 *
 * **The bubble is rendered in a portal on `document.body`, not inside the
 * wrapper.** It used to be an absolutely-positioned child, which meant any
 * ancestor with `overflow` other than `visible` clipped it — modal panels
 * (`overflow-hidden`), the modal scroll container (`overflow-y-auto`), dropdown
 * lists and horizontally scrolling tables all did. No z-index can lift an
 * element out of an ancestor's overflow clip, which is why bumping `z-50` to
 * `z-[200]` at the call site never fixed it. Being a child also trapped the
 * bubble in the wrapper's stacking context, so a tooltip on the page behind a
 * modal could not paint above it either.
 *
 * Visibility stays JS-controlled so the tooltip is never stranded when a modal
 * opens: the browser fires no `mouseleave` once a modal captures pointer events,
 * so `onMouseDown` dismisses it explicitly.
 *
 * Use for short labels (max ~40 chars). For rich content use a Popover.
 *
 * @example
 * <Tooltip content="Copy to clipboard" placement="top">
 *   <button>Copy</button>
 * </Tooltip>
 */
export function Tooltip({
  content,
  placement = 'top',
  children,
  className,
  wrapperStyle,
  noWrap,
  hoverOnly,
  bubbleClassName,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  // Portals need a DOM target, which does not exist during SSR.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords(anchorTo(rect, placement));
  }, [placement]);

  const show = useCallback(() => {
    reposition();
    setVisible(true);
  }, [reposition]);

  const hide = useCallback(() => setVisible(false), []);

  // Keep the bubble on the trigger while anything scrolls underneath it. Capture
  // phase because the scroll may happen in an inner container (a modal body, a
  // table) whose scroll event never reaches the window in the bubble phase.
  useEffect(() => {
    if (!visible) return;

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [visible, reposition]);

  // Nudge the bubble back inside the viewport once its real width is known.
  // Layout effect so the correction never paints as a jump.
  useLayoutEffect(() => {
    if (!visible) return;

    const bubble = bubbleRef.current;
    if (!bubble) return;

    const rect = bubble.getBoundingClientRect();
    const overflowLeft = VIEWPORT_PADDING - rect.left;
    const overflowRight = rect.right - (window.innerWidth - VIEWPORT_PADDING);
    const shift = overflowLeft > 0 ? overflowLeft : overflowRight > 0 ? -overflowRight : 0;

    if (shift !== 0) setCoords((prev) => (prev ? { ...prev, left: prev.left + shift } : prev));
    // `coords` is deliberately absent: including it would re-run the clamp against
    // the position the clamp itself just produced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      className={clsx('relative inline-flex', className, wrapperStyle)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={!hoverOnly ? show : undefined}
      onBlur={!hoverOnly ? hide : undefined}
      // Hide immediately when clicked (e.g. a modal is about to open)
      onMouseDown={hide}
    >
      {children}

      {mounted && visible && coords
        ? createPortal(
            <span
              ref={bubbleRef}
              role="tooltip"
              style={{ top: coords.top, left: coords.left, transform: TRANSFORM[placement] }}
              className={clsx(
                'pointer-events-none fixed z-tooltip rounded-lg bg-tooltip-bg px-3 py-1.5',
                noWrap ? 'whitespace-nowrap' : 'max-w-[220px]',
                'text-body-s leading-snug text-white shadow-lg',
                // `opacity-100` is the resting state, so if the animation is stripped
                // (reduced motion, an environment that does not run it) the bubble is
                // simply visible without a fade rather than invisible.
                'opacity-100 animate-tooltip-in motion-reduce:animate-none',
                bubbleClassName
              )}
            >
              {content}
              {/* Arrow */}
              <span className={clsx('absolute h-0 w-0', ARROW[placement])} />
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

export default Tooltip;
