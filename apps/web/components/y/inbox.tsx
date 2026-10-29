'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { Card } from '@/components/dashboard/widgets';

export interface InboxFilter<F extends string> {
  value: F;
  label: string;
  count: number;
}

/**
 * The left-hand list on both sides of Deliveries: filter chips, an optional
 * search, and cards that animate in, out and into place as filters change.
 * Each card is a link, so a selection is a URL you can share or go back to.
 */
export function Inbox<T extends { id: string }, F extends string>({
  eyebrow,
  title,
  filters,
  filter,
  onFilter,
  search,
  onSearch,
  searchPlaceholder,
  items,
  selectedId,
  hrefFor,
  renderItem,
  empty,
  footer,
  className,
}: {
  eyebrow: string;
  title: string;
  filters: InboxFilter<F>[];
  filter: F;
  onFilter: (f: F) => void;
  search?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  items: T[] | null;
  selectedId: string | null;
  hrefFor: (item: T) => string;
  renderItem: (item: T, active: boolean) => React.ReactNode;
  empty: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card bodyClassName="p-3" className={clsx('lg:sticky lg:top-4', className)}>
      <div className="px-2 pb-3 pt-2">
        <p className="text-body-s text-text-tertiary">{eyebrow}</p>
        <p className="text-title-base text-text-primary">{title}</p>
        {onSearch && (
          <label className="mt-3 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2">
            <Search size={14} className="shrink-0 text-icon-muted" />
            <span className="sr-only">Search</span>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-w-0 border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0"
            />
          </label>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => onFilter(f.value)}
              className={clsx(
                'relative whitespace-nowrap rounded-full px-3 py-1.5 text-body-s font-semi-bold transition-colors',
                filter === f.value ? 'text-brand-foreground' : 'bg-surface text-text-secondary hover:text-text-primary'
              )}
            >
              {filter === f.value && (
                <motion.span layoutId={`inbox-chip-${title}`} className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              <span className="relative">
                {f.label} <span className="opacity-60">{f.count}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <div className="flex flex-col gap-2" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[136px] animate-pulse rounded-[20px] bg-muted" />)}
        </div>
      ) : items.length === 0 ? (
        empty
      ) : (
        <ul className="flex max-h-[760px] flex-col gap-2 overflow-y-auto overflow-x-hidden pr-0.5">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, i) => {
              const active = item.id === selectedId;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 8) * 0.03 } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  data-item={item.id}
                >
                  <Link href={hrefFor(item)} scroll={false} aria-current={active ? 'page' : undefined} className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                    <motion.span className="block" whileTap={{ scale: 0.985 }}>
                      {renderItem(item, active)}
                    </motion.span>
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      {footer && <div className="mt-3 border-t border-border pt-3">{footer}</div>}
    </Card>
  );
}

/** The right-hand panel: cross-fades and lifts in whenever the selection changes. */
export function DetailPanel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
