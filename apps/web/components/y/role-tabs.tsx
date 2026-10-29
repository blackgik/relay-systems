'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { motion } from 'motion/react';
import { Luggage, Send } from 'lucide-react';

export type DeliveryTab = 'sending' | 'carrying';

const TABS: { id: DeliveryTab; label: string; sub: string; icon: React.ElementType }[] = [
  { id: 'sending', label: 'Sending', sub: 'Packages you send', icon: Send },
  { id: 'carrying', label: 'Carrying', sub: 'Packages you carry', icon: Luggage },
];

/**
 * The Sending / Carrying switch at the top of Deliveries. The highlight
 * slides between the two (a shared layout animation), and each side shows how
 * many things are waiting on you there.
 */
export function RoleTabs({ tab, counts }: { tab: DeliveryTab; counts: Record<DeliveryTab, number> }) {
  return (
    <nav aria-label="Deliveries" className="grid w-full grid-cols-2 gap-1 rounded-[22px] border border-border/70 bg-card p-1.5 shadow-light sm:w-auto sm:min-w-[420px]">
      {TABS.map((t) => {
        const active = tab === t.id;
        const Icon = t.icon;
        return (
          <Link
            key={t.id}
            href={`/deliveries/${t.id}`}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={clsx('relative flex items-center gap-3 rounded-[16px] px-3 py-2.5 transition-colors sm:px-4', active ? 'text-white' : 'text-text-secondary hover:text-text-primary')}
          >
            {active && (
              <motion.span
                layoutId="deliveries-tab"
                className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-harbor-900 to-harbor-800 shadow-lg dark:from-harbor-800 dark:to-[#03161b]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={clsx('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors', active ? 'bg-accent-signal text-harbor-900' : 'bg-surface')}>
              <Icon size={17} />
            </span>
            <span className="relative min-w-0">
              <span className="block text-title-s font-semi-bold">{t.label}</span>
              <span className={clsx('block truncate text-[11px]', active ? 'text-white/60' : 'text-text-tertiary')}>{t.sub}</span>
            </span>
            {counts[t.id] > 0 && (
              <motion.span
                key={counts[t.id]}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={clsx(
                  'relative ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-semi-bold',
                  active ? 'bg-accent-signal text-harbor-900' : 'bg-brand text-brand-foreground'
                )}
                aria-label={`${counts[t.id]} waiting on you`}
              >
                {counts[t.id]}
              </motion.span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
