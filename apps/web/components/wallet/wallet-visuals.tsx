'use client';

import React, { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react';
import { BadgeCheck, Lock, Nfc } from 'lucide-react';
import { formatMinors } from '@/lib/money';
import { escrowShare } from '@/lib/wallet';

/** A money figure that counts up to its value (and re-counts when it changes). */
export function CountUp({ value, currency, className }: { value: number; currency: string; className?: string }) {
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(0);
  useMotionValueEvent(mv, 'change', (v) => setShown(Math.round(v)));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.2, 0.7, 0.2, 1] });
    return () => controls.stop();
  }, [mv, value]);
  return <span className={className}>{formatMinors(shown, currency)}</span>;
}

/**
 * The wallet as a card, after the FinBank debit card: available balance on
 * the front card, the escrow card peeking out behind it. Fixed card colours
 * (not theme tokens) so it reads as a physical card in both themes.
 */
export function WalletCards({
  handle,
  tier,
  balance,
  escrow,
  currency,
}: {
  handle: string | null;
  tier: string;
  balance: number;
  escrow: number;
  currency: string;
}) {
  return (
    <div className="relative mx-auto aspect-[1.6/1] w-full max-w-[400px] pr-6 pt-6 sm:pr-8 sm:pt-7">
      {/* escrow card, behind */}
      <motion.div
        initial={{ x: -24, y: 18, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.15 }}
        className="absolute right-0 top-0 h-[calc(100%-24px)] w-[calc(100%-24px)] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#79c4d2] to-[#3a9cae] px-4 pt-1.5 text-[#062227] sm:h-[calc(100%-28px)] sm:w-[calc(100%-32px)]"
        aria-hidden
      >
        {/* Only the top strip shows above the front card: keep it to one line. */}
        <p className="flex items-center justify-end gap-1.5 whitespace-nowrap text-[11px] font-semi-bold uppercase tracking-[0.14em]">
          <Lock size={12} /> Escrow · <span className="normal-case tracking-normal">{formatMinors(escrow, currency).replace(/\.00$/, '')}</span>
        </p>
      </motion.div>

      {/* wallet card, front */}
      <motion.div
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ y: -4, rotate: -0.8 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b3b4b] via-[#145665] to-[#1f6e80] p-5 text-white shadow-2lg sm:p-6"
      >
        <span aria-hidden className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-white/[0.06]" />
        <span aria-hidden className="absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-white/[0.05]" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[12px] text-white/70">Relay wallet</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-white/50">Available balance</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semi-bold">
            <BadgeCheck size={12} className="text-[#F59E0B]" /> {tier === 'T0' ? 'Unverified' : `${tier} verified`}
          </span>
        </div>
        <div className="relative flex items-center gap-3">
          <span aria-hidden className="grid h-8 w-11 grid-cols-3 gap-px overflow-hidden rounded-md bg-[#F2C46D] p-1 opacity-90">
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="rounded-[1px] bg-[#C99A3B]/60" />)}
          </span>
          <Nfc size={20} className="text-white/70" aria-hidden />
        </div>
        <div className="relative">
          <CountUp value={balance} currency={currency} className="block text-[26px] font-semi-bold tracking-tight sm:text-[30px]" />
          <div className="mt-1 flex items-end justify-between">
            <span className="text-[12px] text-white/70">{handle ? `@${handle}` : 'Your wallet'}</span>
            <span className="text-[20px] font-extra-bold tracking-tight">
              relay<span className="text-[#F59E0B]">.</span>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Half-ring gauge (FinBank "expenses" dial): of what your carrying earned
 * recently, the share already paid into your wallet, and what escrow still
 * holds for you. Two series, so both are named in the legend.
 */
export function EscrowGauge({ paidOut, awaiting, currency }: { paidOut: number; awaiting: number; currency: string }) {
  const { total, paidShare } = escrowShare(paidOut, awaiting);
  const R = 80;
  const arc = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`;
  return (
    <div>
      <div className="relative mx-auto w-full max-w-[260px]">
        <svg viewBox="0 0 200 112" className="block w-full" role="img" aria-label={`${Math.round(paidShare * 100)}% of recent carrying income paid to your wallet; ${formatMinors(awaiting, currency)} still in escrow`}>
          {/* whole arc = in escrow, the paid share drawn over it */}
          <path d={arc} fill="none" stroke={total ? 'var(--chart-spent)' : 'var(--chart-grid)'} strokeWidth={20} strokeLinecap="round" />
          {total > 0 && paidShare > 0 && (
            <motion.path
              d={arc}
              fill="none"
              stroke="var(--chart-earned)"
              strokeWidth={20}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: Math.max(0.02, paidShare) }}
              transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
            />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          {total ? (
            <>
              <p className="text-[30px] font-semi-bold leading-none text-text-primary">
                {Math.round(paidShare * 100)}
                <span className="text-body-m">%</span>
              </p>
              <p className="mt-1 text-body-s font-semi-bold text-text-secondary">paid to your wallet</p>
            </>
          ) : (
            <>
              <p className="text-title-m font-semi-bold text-text-primary">No carrying income yet</p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">Fees for packages you carry show here</p>
            </>
          )}
        </div>
      </div>
      <div className={total ? 'mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-body-s text-text-secondary' : 'hidden'}>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--chart-earned)]" /> Paid out {formatMinors(paidOut, currency).replace(/\.00$/, '')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--chart-spent)]" /> In escrow {formatMinors(awaiting, currency).replace(/\.00$/, '')}</span>
      </div>
    </div>
  );
}
