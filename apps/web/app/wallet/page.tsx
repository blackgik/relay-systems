'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleAlert,
  Download,
  FileText,
  Landmark,
  Lock,
  Plus,
  Search,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button, toast } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { formatMinors } from '@/lib/money';
import {
  INVOICE_LABEL,
  type Invoice,
  type InvoiceStatus,
  type LedgerLine,
  type LineKind,
  type PaymentOrder,
  type Period,
  TYPE_LABEL,
  type WalletSummary,
  filterLines,
  invoicesToCsv,
} from '@/lib/wallet';
import { Card } from '@/components/dashboard/widgets';
import { MoneyChart } from '@/components/dashboard/charts';
import { CountUp, EscrowGauge, WalletCards } from '@/components/wallet/wallet-visuals';
import { AddMoneyModal, type AwaitingPayment, InvoiceModal, PayEscrowModal, WithdrawModal } from '@/components/wallet/wallet-modals';

const INVOICE_TONE: Record<InvoiceStatus, string> = {
  ISSUED: 'bg-warning-subtle text-warning-text',
  FUNDED: 'bg-info-subtle text-info-text',
  PARTIALLY_PAID: 'bg-info-subtle text-info-text',
  PAID: 'bg-success-subtle text-success-text',
  REFUNDED: 'bg-muted text-text-secondary',
};

const LINE_ICON: Record<string, { icon: React.ElementType; tone: string }> = {
  TOPUP: { icon: ArrowDownLeft, tone: 'bg-success-subtle text-success-text' },
  WITHDRAW: { icon: Landmark, tone: 'bg-warning-subtle text-warning-text' },
  WITHDRAW_REVERSAL: { icon: ArrowDownLeft, tone: 'bg-success-subtle text-success-text' },
  FUND_ESCROW: { icon: Lock, tone: 'bg-info-subtle text-info-text' },
  RELEASE_LEG: { icon: ArrowDownLeft, tone: 'bg-success-subtle text-success-text' },
  REFUND: { icon: ArrowDownLeft, tone: 'bg-success-subtle text-success-text' },
};

const KINDS: { value: LineKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Withdrawals' },
  { value: 'escrow', label: 'Escrow' },
];
const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 0, label: 'All time' },
];

function when(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Chips<T extends string | number>({ value, options, onChange, label, id }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; id: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx('relative rounded-full px-3 py-1.5 text-body-s font-semi-bold transition-colors', value === o.value ? 'text-brand-foreground' : 'bg-surface text-text-secondary hover:text-text-primary')}
        >
          {value === o.value && <motion.span layoutId={id} className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

type ModalState = { kind: 'add'; suggested?: number } | { kind: 'withdraw' } | null;

export default function Wallet() {
  const { user, token, loading } = useRequireAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [awaiting, setAwaiting] = useState<AwaitingPayment[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [paying, setPaying] = useState<AwaitingPayment | null>(null);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [kind, setKind] = useState<LineKind>('all');
  const [period, setPeriod] = useState<Period>(30);
  const [q, setQ] = useState('');
  const [orderKind, setOrderKind] = useState<'all' | 'TOPUP' | 'WITHDRAWAL'>('all');
  const [invQ, setInvQ] = useState('');
  const [invStatus, setInvStatus] = useState<InvoiceStatus | 'all'>('all');

  const load = useCallback(async () => {
    if (!token) return;
    const [s, l, o, inv, ships] = await Promise.all([
      api<WalletSummary>('/wallet/summary', { token }),
      api<LedgerLine[]>('/wallet/transactions?take=100', { token }),
      api<PaymentOrder[]>('/wallet/orders?take=50', { token }).catch(() => [] as PaymentOrder[]),
      api<Invoice[]>('/wallet/invoices', { token }).catch(() => [] as Invoice[]),
      api<(AwaitingPayment & { status: string })[]>('/shipments', { token }).catch(() => []),
    ]);
    setSummary(s);
    setLines(l);
    setOrders(o);
    setInvoices(inv);
    // Accepted by every courier, waiting for the sender's money in escrow.
    setAwaiting(ships.filter((x) => x.status === 'APPROVED'));
  }, [token]);

  useEffect(() => {
    if (loading || !user || !token) return;
    load().catch((err) => toast.error({ title: 'Could not load your wallet', description: err instanceof ApiError ? err.message : '' }));
  }, [loading, user, token, load]);

  // Back from a Paystack checkout: confirm the payment, then credit the wallet.
  useEffect(() => {
    if (!token) return;
    const ref = new URLSearchParams(window.location.search).get('funding');
    if (!ref) return;
    api<{ status: string }>('/wallet/topup/verify', { method: 'POST', token, body: { reference: ref } })
      .then(async (r) => {
        if (r.status === 'SUCCESS') toast.success({ title: 'Money added', description: 'Paystack confirmed it. It’s in your wallet.' });
        else toast.error({ title: 'Payment not completed', description: 'No money was taken. You can try again.' });
        await load();
      })
      .catch((err) => toast.error({ title: 'Could not confirm the payment', description: err instanceof ApiError ? err.message : '' }))
      .finally(() => window.history.replaceState({}, '', '/wallet'));
  }, [token, load]);

  const currency = summary?.currency ?? 'NGN';
  const balance = summary?.balances.find((b) => b.currency === currency)?.balance ?? 0;
  const shown = useMemo(() => filterLines(lines, { kind, period, q }), [lines, kind, period, q]);
  const shownOrders = orderKind === 'all' ? orders : orders.filter((o) => o.kind === orderKind);
  const shownInvoices = useMemo(() => {
    const term = invQ.trim().toLowerCase().replace(/^@/, '');
    return invoices.filter(
      (i) =>
        (invStatus === 'all' || i.status === invStatus) &&
        (!term ||
          [i.number, i.route?.originCity, i.route?.destCity, i.senderHandle, i.carrierHandle].some((v) => (v ?? '').toLowerCase().includes(term)))
    );
  }, [invoices, invQ, invStatus]);

  if (!loading && !user) return null;

  const done = () => {
    setModal(null);
    void load();
    window.dispatchEvent(new Event('relay:requests-changed'));
  };

  const exportCsv = () => {
    const blob = new Blob([invoicesToCsv(shownInvoices)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relay-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const firstName = user?.fullName.split(' ')[0];

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1 basis-64">
            <h1 className="text-[34px] font-light leading-tight tracking-tight text-text-primary sm:text-[44px]">Wallet</h1>
            <p className="text-body-s text-text-tertiary">Hi {firstName}. Your balance, what escrow holds for you, and where every naira went.</p>
          </div>
          <span className="flex flex-wrap gap-2">
            <Button label="Withdraw" variant="secondary" fit iconLeading={<ArrowUpRight size={16} />} onClick={() => setModal({ kind: 'withdraw' })} disabled={!summary} />
            <Button label="Add money" fit iconLeading={<Plus size={16} />} onClick={() => setModal({ kind: 'add' })} disabled={!summary} />
          </span>
        </header>

        {summary && summary.mode !== 'paystack' && (
          <p className="flex gap-2 rounded-2xl border border-warning-text/20 bg-warning-subtle px-4 py-3 text-body-s text-warning-text">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              {summary.mode === 'simulated'
                ? 'Payments are simulated here. A live Paystack key is configured, so outside production no card is charged and no transfer is sent. Use a test key (sk_test_…) to try the real checkout, or set PAYSTACK_ALLOW_LIVE=true when you mean it.'
                : 'Payments are simulated: no Paystack key is configured, so top-ups and withdrawals settle instantly with test money.'}
            </span>
          </p>
        )}

        {!summary ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="h-72 animate-pulse rounded-[22px] bg-muted" />
            <div className="h-72 animate-pulse rounded-[22px] bg-muted" aria-label="Loading wallet" />
          </div>
        ) : (
          <>
            {/* ── Cards + total balance ─────────────────── */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Card title="Your Relay wallet" sub="Spend into escrow, get paid out of it">
                <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_170px]">
                  <WalletCards handle={user?.handle ?? null} tier={user?.kycTier ?? 'T0'} balance={balance} escrow={summary.escrowAwaitingWallet + summary.escrowForMyShipments} currency={currency} />
                  <motion.button
                    type="button"
                    onClick={() => setModal({ kind: 'add' })}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-full min-h-[140px] flex-col items-center justify-center gap-3 rounded-[22px] bg-surface p-4 text-center"
                  >
                    <span className="flex h-16 w-20 items-center justify-center rounded-2xl border border-border bg-card text-text-tertiary shadow-light">
                      <Plus size={22} />
                    </span>
                    <span className="text-body-s font-semi-bold text-text-primary">Add money</span>
                    <span className="-mt-2 text-[11px] text-text-tertiary">Card or bank transfer</span>
                  </motion.button>
                </div>
              </Card>

              <Card bodyClassName="flex h-full flex-col p-5 sm:p-6 [container-type:inline-size]">
                <p className="text-center text-body-m font-semi-bold text-text-primary">Your total balance</p>
                <CountUp value={balance} currency={currency} className="mt-3 block whitespace-nowrap text-center text-[min(42px,11cqw)] font-semi-bold tracking-tight text-text-brand dark:text-harbor-200" />
                <p className="mt-1 text-center text-body-s text-text-tertiary">
                  {new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="mt-auto grid grid-cols-3 gap-2 rounded-2xl bg-surface p-2 pt-2">
                  {[
                    { icon: Plus, label: 'Add money', onClick: () => setModal({ kind: 'add' }) },
                    { icon: ArrowUpRight, label: 'Withdraw', onClick: () => setModal({ kind: 'withdraw' }) },
                    {
                      icon: Send,
                      label: 'Pay escrow',
                      onClick: () => (awaiting[0] ? setPaying(awaiting[0]) : toast.success({ title: 'Nothing to pay', description: 'When every courier accepts your request, pay it into escrow here.' })),
                    },
                  ].map((a) => (
                    <motion.button
                      key={a.label}
                      type="button"
                      onClick={a.onClick}
                      whileTap={{ scale: 0.95 }}
                      className="relative flex flex-col items-center gap-1.5 rounded-xl bg-card px-2 py-3 text-body-s font-semi-bold text-text-primary shadow-light hover:bg-surface-hover"
                    >
                      <a.icon size={18} className="text-text-brand dark:text-harbor-200" />
                      {a.label}
                      {a.label === 'Pay escrow' && awaiting.length > 0 && (
                        <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-signal px-1 text-[10px] font-bold text-harbor-900">{awaiting.length}</span>
                      )}
                    </motion.button>
                  ))}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-body-s">
                  <div>
                    <dt className="text-text-tertiary">Added, all time</dt>
                    <dd className="font-semi-bold text-text-primary">{formatMinors(summary.toppedUp, currency).replace(/\.00$/, '')}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">Withdrawn, all time</dt>
                    <dd className="font-semi-bold text-text-primary">{formatMinors(summary.withdrawn, currency).replace(/\.00$/, '')}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            {/* ── Waiting for your payment ──────────────── */}
            <AnimatePresence initial={false}>
              {awaiting.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="rounded-[22px] border border-warning-text/20 bg-warning-subtle/60 p-4">
                  <p className="flex items-center gap-2 text-body-m font-semi-bold text-text-primary">
                    <CircleAlert size={17} className="text-warning-text" /> {awaiting.length === 1 ? 'A shipment is' : `${awaiting.length} shipments are`} waiting for you to pay into escrow
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {awaiting.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3">
                        <span className="min-w-0">
                          <span className="block truncate text-body-m font-semi-bold text-text-primary">{s.originCity} → {s.destCity}</span>
                          <span className="block text-[11px] text-text-tertiary"><span className="capitalize">{s.category}</span> · {s.weightKg} kg · couriers accepted</span>
                        </span>
                        <Button label="Pay" size="sm" fit onClick={() => setPaying(s)} />
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Transactions + escrow ─────────────────── */}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Card
                title="Recent transactions"
                sub="Every credit and debit on your wallet"
                action={
                  <select
                    aria-label="Period"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value) as Period)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-body-s text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                  >
                    {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                }
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chips id="wallet-kind" label="Filter transactions" value={kind} options={KINDS} onChange={setKind} />
                    <label className="ml-auto flex min-w-0 flex-1 basis-40 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 sm:max-w-[220px]">
                      <Search size={14} className="shrink-0 text-icon-muted" />
                      <span className="sr-only">Search transactions</span>
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full min-w-0 border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0" />
                    </label>
                  </div>
                  {shown.length === 0 ? (
                    <EmptyState art="wallet" size="sm" title="Nothing here" body={lines.length ? 'No transactions match these filters.' : 'Top-ups, escrow payments, payouts and withdrawals will be listed here.'} />
                  ) : (
                    <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                      <AnimatePresence initial={false}>
                        {shown.slice(0, 40).map((l, i) => {
                          const meta = LINE_ICON[l.transaction.type] ?? { icon: FileText, tone: 'bg-muted text-text-secondary' };
                          return (
                            <motion.li
                              key={l.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.025 } }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-3 py-3"
                            >
                              <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
                                <meta.icon size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-body-m font-semi-bold text-text-primary">{TYPE_LABEL[l.transaction.type] ?? l.transaction.type}</span>
                                <span className="block text-[11px] text-text-tertiary">{when(l.transaction.createdAt)}</span>
                              </span>
                              <span className={clsx('shrink-0 text-body-m font-semi-bold', l.amount > 0 ? 'text-success-text' : 'text-text-secondary')}>
                                {l.amount > 0 ? '+ ' : '− '}
                                {formatMinors(Math.abs(l.amount), currency)}
                              </span>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>
              </Card>

              <Card title="Escrow" sub="Fees for packages you carry, released as they move">
                <EscrowGauge paidOut={summary.breakdown.payouts} awaiting={summary.escrowAwaitingWallet} currency={currency} />
                <div className="mt-5 grid gap-2">
                  <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
                    <span className="text-body-s text-text-secondary">
                      Yet to be paid into your wallet
                      <span className="block text-[11px] text-text-tertiary">{summary.awaitingLegs} package{summary.awaitingLegs === 1 ? '' : 's'} you carry · 70% at handover, rest at delivery</span>
                    </span>
                    <span className="shrink-0 text-title-m font-semi-bold text-text-primary">{formatMinors(summary.escrowAwaitingWallet, currency).replace(/\.00$/, '')}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
                    <span className="text-body-s text-text-secondary">
                      Held for packages you sent
                      <span className="block text-[11px] text-text-tertiary">Releases to your couriers, or back to you if cancelled</span>
                    </span>
                    <span className="shrink-0 text-title-m font-semi-bold text-text-primary">{formatMinors(summary.escrowForMyShipments, currency).replace(/\.00$/, '')}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Money flow + top-ups & withdrawals ────── */}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Card title="Money flow" sub="Last 6 months, into and out of your wallet">
                <MoneyChart
                  series={summary.flow.map((f) => ({ month: f.month, earned: f.inflow, spent: f.outflow, net: f.net }))}
                  projected={null}
                  currency={currency}
                  labels={{ earned: 'Money in', spent: 'Money out' }}
                  ariaLabel="Money into and out of your wallet, last 6 months"
                />
                <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Added by you', value: summary.breakdown.topups, tone: 'in' },
                    { label: 'Escrow payouts', value: summary.breakdown.payouts, tone: 'in' },
                    { label: 'Refunds', value: summary.breakdown.refunds, tone: 'in' },
                    { label: 'Paid into escrow', value: summary.breakdown.intoEscrow, tone: 'out' },
                    { label: 'Withdrawn', value: summary.breakdown.withdrawals, tone: 'out' },
                  ].map((b) => (
                    <div key={b.label} className="rounded-xl bg-surface px-3 py-2">
                      <dt className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                        <span className="h-2 w-2 rounded-[2px]" style={{ background: b.tone === 'in' ? 'var(--chart-earned)' : 'var(--chart-spent)' }} />
                        {b.label}
                      </dt>
                      <dd className="text-body-m font-semi-bold text-text-primary">{formatMinors(b.value, currency).replace(/\.00$/, '')}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <Card title="Top-ups & withdrawals" sub="What you moved in and out, and its status">
                <Chips
                  id="wallet-orders"
                  label="Filter top-ups and withdrawals"
                  value={orderKind}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'TOPUP', label: 'Top-ups' },
                    { value: 'WITHDRAWAL', label: 'Withdrawals' },
                  ]}
                  onChange={setOrderKind}
                />
                {shownOrders.length === 0 ? (
                  <EmptyState art="wallet" size="sm" title="None yet" body="Money you add by card or transfer, and withdrawals to your bank, show here." />
                ) : (
                  <ul className="mt-3 max-h-[380px] divide-y divide-border overflow-y-auto">
                    {shownOrders.map((o) => (
                      <li key={o.id} className="flex items-center gap-3 py-3">
                        <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', o.kind === 'TOPUP' ? 'bg-success-subtle text-success-text' : 'bg-warning-subtle text-warning-text')}>
                          {o.kind === 'TOPUP' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-s font-semi-bold text-text-primary">
                            {o.kind === 'TOPUP' ? `Added by ${o.method === 'transfer' ? 'bank transfer' : 'card'}` : `To ${o.accountName ?? 'your bank'}${o.accountLast4 ? ` ••••${o.accountLast4}` : ''}`}
                          </span>
                          <span className="block text-[11px] text-text-tertiary">{when(o.createdAt)}{o.provider === 'mock' ? ' · simulated' : ''}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-body-s font-semi-bold text-text-primary">{formatMinors(o.amountMinors, o.currency)}</span>
                          <span
                            className={clsx(
                              'text-[10px] font-semi-bold uppercase tracking-wide',
                              o.status === 'SUCCESS' ? 'text-success-text' : o.status === 'FAILED' ? 'text-destructive' : 'text-warning-text'
                            )}
                          >
                            {o.status === 'SUCCESS' ? 'Completed' : o.status === 'FAILED' ? 'Failed' : 'Pending'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* ── Invoice activity ───────────────────────── */}
            <Card
              className="overflow-hidden"
              title="Invoice activity"
              sub="One invoice per accepted request: when money entered escrow and when it was paid into the wallet"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
                    <Search size={14} className="shrink-0 text-icon-muted" />
                    <span className="sr-only">Search invoices</span>
                    <input value={invQ} onChange={(e) => setInvQ(e.target.value)} placeholder="Invoice, city or @user" className="w-36 border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0 sm:w-44" />
                  </label>
                  <select
                    aria-label="Invoice status"
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as InvoiceStatus | 'all')}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-body-s text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                  >
                    <option value="all">All statuses</option>
                    {(Object.keys(INVOICE_LABEL) as InvoiceStatus[]).map((s) => <option key={s} value={s}>{INVOICE_LABEL[s]}</option>)}
                  </select>
                  <Button label="Export" variant="secondary" size="sm" fit iconLeading={<Download size={14} />} onClick={exportCsv} disabled={!shownInvoices.length} />
                </div>
              }
            >
              {invoices.length === 0 ? (
                <EmptyState art="wallet" size="sm" title="No invoices yet" body="When a courier accepts your request, or you accept one, its invoice appears here and tracks the money." />
              ) : shownInvoices.length === 0 ? (
                <EmptyState art="search" size="sm" title="No invoices match" body="Try another search or status." />
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-body-s">
                    <thead>
                      <tr className="bg-surface text-[11px] uppercase tracking-wide text-text-tertiary">
                        <th className="rounded-l-xl px-3 py-2.5 font-semi-bold">Invoice</th>
                        <th className="px-3 py-2.5 font-semi-bold">Route</th>
                        <th className="px-3 py-2.5 font-semi-bold">With</th>
                        <th className="px-3 py-2.5 font-semi-bold">Into escrow</th>
                        <th className="px-3 py-2.5 font-semi-bold">Paid to wallet</th>
                        <th className="px-3 py-2.5 font-semi-bold">Status</th>
                        <th className="rounded-r-xl px-3 py-2.5 text-right font-semi-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {shownInvoices.map((i, idx) => (
                        <motion.tr
                          key={i.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { delay: Math.min(idx, 12) * 0.02 } }}
                          onClick={() => setOpenInvoice(i)}
                          className="cursor-pointer hover:bg-surface-hover"
                        >
                          <td className="px-3 py-3">
                            <button type="button" onClick={() => setOpenInvoice(i)} className="font-mono font-semi-bold text-text-primary hover:underline">{i.number}</button>
                            <span className="block text-[11px] text-text-tertiary">{i.role === 'carrier' ? 'You carried' : 'You sent'}</span>
                          </td>
                          <td className="px-3 py-3 text-text-primary">{i.route ? `${i.route.originCity} → ${i.route.destCity}` : '—'}</td>
                          <td className="px-3 py-3 text-text-secondary">@{(i.role === 'carrier' ? i.senderHandle : i.carrierHandle) ?? 'member'}</td>
                          <td className="px-3 py-3 text-text-secondary">{i.escrowFundedAt ? new Date(i.escrowFundedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                          <td className="px-3 py-3 text-text-secondary">{i.paidToWalletAt ? new Date(i.paidToWalletAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : i.amountPaid ? `${formatMinors(i.amountPaid, i.currency).replace(/\.00$/, '')} so far` : '—'}</td>
                          <td className="px-3 py-3"><span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semi-bold', INVOICE_TONE[i.status])}>{INVOICE_LABEL[i.status]}</span></td>
                          <td className={clsx('px-3 py-3 text-right font-semi-bold', i.role === 'carrier' ? 'text-success-text' : 'text-text-primary')}>
                            {i.role === 'carrier' ? '+ ' : '− '}
                            {formatMinors(i.amount, i.currency)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {summary && (
        <>
          <AddMoneyModal
            open={modal?.kind === 'add'}
            token={token}
            mode={summary.mode}
            currency={currency}
            suggested={modal?.kind === 'add' ? modal.suggested : undefined}
            onClose={() => setModal(null)}
            onDone={done}
          />
          <WithdrawModal open={modal?.kind === 'withdraw'} token={token} mode={summary.mode} currency={currency} available={balance} onClose={() => setModal(null)} onDone={done} />
        </>
      )}
      <PayEscrowModal
        shipment={paying}
        token={token}
        available={balance}
        onClose={() => setPaying(null)}
        onTopUp={(short) => {
          setPaying(null);
          setModal({ kind: 'add', suggested: short });
        }}
        onDone={() => {
          void load();
          window.dispatchEvent(new Event('relay:requests-changed'));
        }}
      />
      <InvoiceModal invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </AppShell>
  );
}
