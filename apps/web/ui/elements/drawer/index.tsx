'use client';

import { Dialog } from '@headlessui/react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface DrawerProps {
  /** Controls visibility. */
  isOpen: boolean;
  /** Called when the backdrop or Escape key is pressed. */
  onClose: () => void;
  children?: React.ReactNode;
  /** Which edge the panel slides in from. Default: 'right'. */
  side?: 'left' | 'right';
  /**
   * Tailwind width class for the panel. Default: 'w-[480px]'.
   * Use 'w-full sm:w-[480px]' for responsive drawers.
   */
  width?: string;
}

/**
 * Drawer — a panel that slides in from either side of the viewport.
 *
 * Uses Headless UI Dialog for full a11y (focus trap, Escape close, ARIA).
 *
 * Motion is deliberately asymmetric. Opening *fades* the panel in where it
 * sits, the way the Modal does; closing slides it off its own edge. A slide-in
 * has to begin from a painted off-screen position, so every millisecond spent
 * mounting the Dialog and the panel's contents eats into the movement and the
 * panel appears to arrive late and stutter — a fade has no starting position
 * to miss, so the same mount cost is invisible. The slide is kept on the way
 * out, where nothing is mounting and it still says where the panel went.
 *
 * Both are CSS *animations* rather than transitions between class states: a
 * transition only runs if the element was painted in its starting position
 * first, which is why the old implementation needed two nested
 * `requestAnimationFrame`s before flipping a class.
 *
 * Lifecycle:
 *   open  → mount, panel plays `drawer-in` from its first frame
 *   close → panel plays `drawer-out-*`; its `animationend` unmounts it, with a
 *           timer as the fallback for when no animation runs at all
 *
 * It also holds the page still while it is open — see `useScrollbarCompensation`.
 */

/**
 * Keeps the page from shifting when the scroll lock removes the scrollbar.
 *
 * Headless UI locks scrolling with `overflow: hidden` on <html>. On any
 * platform with classic (space-taking) scrollbars that widens the viewport by
 * ~15px, and every element on the page jumps right at the same moment the
 * panel animates in — which looks like the drawer sliding past its resting
 * position and settling back. Headless UI is meant to pad the same amount back
 * on, but it measures 0 here and doesn't.
 *
 * Reserving the gutter permanently in CSS (`scrollbar-gutter: stable`) also
 * fixes it, but the gutter is outside the fixed-position containing block, so
 * the drawer could no longer reach the edge of the screen — a strip of page
 * showing beside it instead. Padding the exact width back on keeps the page
 * still *and* lets the panel sit flush.
 *
 * `!important` because Headless UI writes `padding-right: 0px` on the same
 * element as part of its own lock.
 *
 * What gets padded back on is not "the scrollbar width" but *how much the
 * viewport actually grew* — `widthBeforeLock` is captured before the Dialog
 * mounts, and compared here, after its lock has been applied. That ordering is
 * the trick: measure after the lock and the scrollbar is already gone, which
 * is how Headless UI ends up writing 0px and how the first version of this
 * hook silently did nothing. Measuring the difference rather than assuming a
 * scrollbar also means environments where nothing moves — overlay scrollbars,
 * or a page already reserving `scrollbar-gutter` — compensate by zero instead
 * of shifting the page the other way.
 */
const useScrollbarCompensation = (active: boolean, widthBeforeLock: number) => {
  useLayoutEffect(() => {
    if (!active || widthBeforeLock <= 0) return;

    const root = document.documentElement;
    const grew = root.clientWidth - widthBeforeLock;
    if (grew <= 0) return;

    const previous = root.style.getPropertyValue('padding-right');
    const previousPriority = root.style.getPropertyPriority('padding-right');
    root.style.setProperty('padding-right', `${grew}px`, 'important');

    return () => {
      if (previous) root.style.setProperty('padding-right', previous, previousPriority);
      else root.style.removeProperty('padding-right');
    };
  }, [active, widthBeforeLock]);
};
const Drawer = ({
  isOpen,
  onClose,
  children,
  side = 'right',
  width = 'w-[480px]',
}: DrawerProps) => {
  const [mounted, setMounted] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [widthBeforeLock, setWidthBeforeLock] = useState(0);

  useScrollbarCompensation(mounted, widthBeforeLock);

  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);

    if (isOpen) {
      // Captured here, before the Dialog exists and its lock changes the
      // viewport width out from under us.
      setWidthBeforeLock(document.documentElement.clientWidth);
      setMounted(true);
    } else if (mounted) {
      // Fallback only. `animationend` below is what normally unmounts, and it
      // this covers the cases where no animation runs (reduced motion, a
      // background tab) and nothing would ever end.
      closeTimer.current = setTimeout(() => setMounted(false), 450);
    }

    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [isOpen, mounted]);

  if (!mounted) return null;

  return (
    <Dialog open onClose={onClose} className="relative z-modal">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={clsx(
          'fixed inset-0 bg-overlay/40 backdrop-blur-[2px]',
          isOpen ? 'animate-overlay-in' : 'animate-overlay-out'
        )}
      />

      {/* Panel */}
      <div className="fixed inset-0 overflow-hidden">
        <div className={clsx('absolute inset-y-0', side === 'right' ? 'right-0' : 'left-0')}>
          <Dialog.Panel
            onAnimationEnd={(event) => {
              // Only the panel's own slide-out ends the close — an animation
              // bubbling up from something inside it doesn't.
              if (event.target !== event.currentTarget) return;
              if (!isOpen) setMounted(false);
            }}
            className={clsx(
              // max-w: the wrapper this sits in is absolutely positioned with
              // no width, so it shrink-wraps to this panel — which makes a
              // `w-full` width class circular and lets a wide child size the
              // panel instead. On a phone that pushed the panel to 879px and
              // carried the footer, and its Back button, off the left of the
              // screen. Capping against the viewport is the one measure that
              // does not depend on the parent.
              'flex h-full max-w-[100vw] flex-col bg-card shadow-2lg will-change-transform',
              // Scaled from its own edge, so the fade grows out of the side it
              // is anchored to rather than the middle of the screen.
              side === 'right' ? 'origin-right' : 'origin-left',
              width,
              isOpen
                ? 'animate-drawer-in'
                : side === 'right'
                ? 'animate-drawer-out-right'
                : 'animate-drawer-out-left'
            )}
          >
            {children}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

export { Drawer };
