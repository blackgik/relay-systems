'use client';

import { Fragment } from 'react';
import { Popover as HeadlessPopover, Transition } from '@headlessui/react';
import clsx from 'clsx';
import React from 'react';
import { X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Render-prop args handed to `children` / `footer` so panel content can dismiss itself */
export interface PopoverRenderProps {
  close: () => void;
}

type PopoverSlot = React.ReactNode | ((props: PopoverRenderProps) => React.ReactNode);

export interface PopoverProps {
  /** Element that opens the popover on click */
  trigger:        React.ReactNode;
  /** Content rendered inside the panel — pass a function to receive `close` */
  children:       PopoverSlot;
  /** Direction the panel opens relative to the trigger */
  placement?:     PopoverPlacement;
  /** Optional header title */
  title?:         string;
  /** Optional footer content (buttons, links, etc.) — pass a function to receive `close` */
  footer?:        PopoverSlot;
  /** Fixed panel width — defaults to w-64 */
  panelWidth?:    string;
  /** Extra classes on the panel */
  panelClassName?: string;
  className?:     string;
}

// ── Placement map ──────────────────────────────────────────────────────────────
const PLACEMENT: Record<PopoverPlacement, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
};

// ── Close icon ─────────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <X size={12} strokeWidth={2.5} aria-hidden />
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
/**
 * Popover — click-triggered floating panel for rich contextual content.
 *
 * Built on Headless UI Popover for accessible keyboard and focus management.
 * Dismisses on outside click or Escape. Use Tooltip for plain text labels,
 * Modal for blocking confirmations.
 *
 * @example
 * <Popover trigger={<button>Open</button>} title="Details" placement="bottom">
 *   <p className="text-body-m text-text-secondary">Any content here.</p>
 * </Popover>
 */
export function Popover({
  trigger,
  children,
  placement = 'bottom',
  title,
  footer,
  panelWidth = 'w-64',
  panelClassName,
  className,
}: PopoverProps) {
  return (
    <HeadlessPopover className={clsx('relative inline-block', className)}>
      <HeadlessPopover.Button as={Fragment}>
        {trigger as React.ReactElement}
      </HeadlessPopover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <HeadlessPopover.Panel
          className={clsx(
            'absolute z-modal rounded-lg border border-border bg-popover shadow-lg',
            panelWidth,
            PLACEMENT[placement],
            panelClassName,
          )}
        >
          {({ close }) => (
            <>
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-title-s font-semibold text-text-primary">{title}</span>
                  <HeadlessPopover.Button
                    className="flex items-center justify-center rounded text-text-tertiary transition-colors hover:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label="Close popover"
                  >
                    <CloseIcon />
                  </HeadlessPopover.Button>
                </div>
              )}

              {/* Body */}
              <div className="p-4 text-body-m text-text-secondary">
                {typeof children === 'function' ? children({ close: () => close() }) : children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="rounded-b-lg border-t border-border bg-popover px-4 py-3">
                  {typeof footer === 'function' ? footer({ close: () => close() }) : footer}
                </div>
              )}
            </>
          )}
        </HeadlessPopover.Panel>
      </Transition>
    </HeadlessPopover>
  );
}

export default Popover;
