'use client';

import React, { type ReactNode } from 'react';
import clsx from 'clsx';

/**
 * The mobile card a table becomes below its breakpoint.
 *
 * There were four independent implementations of this — the generic
 * `AutoTableCard`, the sales list's own renderer, the POS/register-summary
 * card, and the product card list — each restating the same type scale by
 * hand. They drifted, repeatedly: one shipped 11px labels while another used
 * 12px, one put values on `text-text-tertiary` (lighter than its own labels)
 * while another used 16px semi-bold, and every scale fix had to be applied
 * three or four times and was usually applied to fewer.
 *
 * These primitives own the scale. Cards compose them and supply their own
 * content and any bespoke chrome — a status pill, an actions menu, an
 * expandable variant list — but never their own type or colour.
 *
 * The scale, stepping down title → subtitle → value → label:
 *
 *   title     16px/600  text-text-primary      #33333F / #edf2f7
 *   subtitle  16px/500  text-text-secondary    #5C5C70 / #e2e8f0
 *   value     14px/600  text-text-primary      #33333F / #edf2f7
 *   label     12px/500  text-muted-foreground  #76768E / #a0aec0
 *
 * Values are emphatic on purpose: on a phone the card *is* the row, and the
 * figure is what the row was opened for. Title and value therefore separate on
 * size alone — both are 600 on `text-text-primary` — while the label carries
 * the whole quiet end of the scale at 12px and a step down the ramp.
 *
 * The label stays on `text-muted-foreground` rather than the `text-*` ramp:
 * that ramp's quiet step is `text-text-tertiary`, specced for placeholders, and
 * at #9D9DBC gives roughly 2.2:1 on white — below WCAG AA. `muted-foreground`
 * is the only token that reads as secondary in *both* themes and still passes.
 */

/**
 * Row container. One card per row, divided by a rule rather than boxed.
 *
 * No `last:border-b-0` here: every caller wraps the card in its own `<li>` or
 * `<div>`, so the card is always an only child and `:last-child` would match
 * all of them, removing the divider from the whole list. A caller that wants
 * the trailing rule gone should put `last:border-b-0` on its own wrapper,
 * where the siblings actually are.
 */
export const TableCard = ({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    className={clsx(
      'flex flex-col gap-3 border-b border-table-border px-4 py-3',
      onClick && 'cursor-pointer',
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

/**
 * Top zone: identity on the left, controls on the right.
 *
 * `actions` stops click propagation so a menu or badge inside it can't trigger
 * the card's own row click.
 */
export const TableCardHeader = ({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    {actions && (
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {actions}
      </div>
    )}
  </div>
);

/**
 * The row's identity — an invoice number, a product, an order title.
 *
 * `label` says what the value *is*; "INV-026AUG03-XLE" alone doesn't tell you
 * it's an invoice number, and every fact below it is labelled.
 *
 * The `>span` / `>a>span` rules are load-bearing. Callers pass whatever their
 * table's column def renders, and shared cell components (`TableRowItem` and
 * friends) carry their own `text-sm font-regular`, which would otherwise beat
 * this container. Child combinators, not descendant: a title can nest an
 * `Avatar` whose initials are also a span and must keep their own size.
 */
export const TableCardTitle = ({ label, children }: { label?: ReactNode; children: ReactNode }) => (
  <div className="min-w-0">
    {/* A `span`, not a `dt` — this sits outside the facts list, and a `dt` is
        only valid as a child of a definition list. */}
    {label ? <span className="block text-label-m text-muted-foreground">{label}</span> : null}

    <div
      data-table-card-title
      className={clsx(
        'min-w-0 text-body-l font-semi-bold text-text-primary',
        label ? 'mt-0.5' : null,
        '[&>a>span]:text-body-l [&>a>span]:font-semi-bold',
        '[&>span]:text-body-l [&>span]:font-semi-bold'
      )}
    >
      {children}
    </div>
  </div>
);

/**
 * A secondary identifying line under the title — a customer under an invoice.
 *
 * Carries the value treatment, not a smaller one of its own: it is a labelled
 * value that happens to have been promoted into the header, and a customer
 * name should not read quieter than the register that served them.
 */
export const TableCardSubtitle = ({
  label,
  children,
}: {
  label?: ReactNode;
  children: ReactNode;
}) => (
  <div className="mt-2 min-w-0">
    {label ? <span className="block text-label-m text-muted-foreground">{label}</span> : null}

    <div
      className={clsx(
        'min-w-0 text-body-l font-medium text-text-secondary',
        label ? 'mt-0.5' : null,
        '[&>a>span]:text-body-l [&>a>span]:font-medium',
        '[&>span]:text-body-l [&>span]:font-medium'
      )}
    >
      {children}
    </div>
  </div>
);

/** Two-column label/value grid. */
export const TableCardFacts = ({ children }: { children: ReactNode }) => (
  <dl className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</dl>
);

/**
 * One labelled fact. `label` is omitted for columns that declare no header.
 *
 * The `>span` rules do for values what the title slot does for headlines: the
 * common `TableRowItem` wraps its content in a span carrying `text-sm
 * font-regular`, which matches the 14px but would hold the value at regular
 * weight and its own colour.
 *
 * A child combinator, not a descendant one — badges live inside their own
 * wrapper element and must keep their 12px, and a tooltip bubble nested in a
 * value must keep its own type.
 */
export const TableCardFact = ({
  label,
  children,
  prose,
}: {
  label?: ReactNode;
  children: ReactNode;
  /**
   * A sentence rather than a figure — an audit activity, a note, a reason.
   *
   * Facts truncate to one line by default, which is right for the values this
   * grid was built for: a quantity, a date, a status. Applied to prose it
   * silently eats the content — "Batch Kachi23 Was Marked…" is the whole point
   * of the row and the half that got cut is the part you came to read. This
   * takes the full card width and wraps instead.
   */
  prose?: boolean;
}) => (
  <div className={clsx('min-w-0', prose && 'col-span-2')}>
    {label ? <dt className="text-label-m text-muted-foreground">{label}</dt> : null}
    <dd
      className={clsx(
        prose ? 'whitespace-normal break-words' : 'truncate',
        'text-body-m font-semi-bold text-text-primary',
        // Size and weight only. Colour is deliberately left to the child: a
        // value can carry a semantic tone — a margin below 10% is
        // `text-destructive`, days-of-cover is `text-warning-text` — and
        // forcing the slot's colour here would flatten all of them to primary.
        '[&>a>span]:text-body-m [&>a>span]:font-semi-bold',
        '[&>span]:text-body-m [&>span]:font-semi-bold',
        label ? 'mt-0.5' : null
      )}
    >
      {children}
    </dd>
  </div>
);

/** Trailing full-width row, for an actions bar under the facts. */
export const TableCardFooter = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
    {children}
  </div>
);
