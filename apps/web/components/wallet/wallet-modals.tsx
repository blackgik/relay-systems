'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { motion } from 'motion/react';
import { BadgeCheck, Building2, Check, CreditCard, KeyRound, Landmark, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Input, Modal, ModalHeader, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import { formatMinors, toMinors } from '@/lib/money';
import { INVOICE_LABEL, type Invoice, type WalletMode, invoiceStep } from '@/lib/wallet';
import { RouteStrip } from '@/components/dashboard/widgets';

function ModeNote({ mode }: { mode: WalletMode }) {
  if (mode === 'paystack') {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-body-s text-text-secondary">
        <ShieldCheck size={15} className="shrink-0 text-success" /> Secured by Paystack. Relay never sees your card details.
      </p>
    );
  }
  return (
    <p className="flex gap-2 rounded-xl bg-warning-subtle px-3.5 py-2.5 text-body-s text-warning-text">
      <ShieldAlert size={15} className="mt-0.5 shrink-0" />
      <span>
        {mode === 'simulated'
          ? 'Simulated on this machine: a live Paystack key is configured, so no real card is charged and no real transfer is sent outside production.'
          : 'Simulated: no Paystack key is configured, so this settles instantly with test money.'}
      </span>
    </p>
  );
}

const PRESETS = [500000, 1000000, 2500000, 5000000];

/** Add money by card or bank transfer. Paystack checkout when live; instant test credit otherwise. */
export function AddMoneyModal({
  open,
  token,
  mode,
  currency,
  suggested,
  onClose,
  onDone,
}: {
  open: boolean;
  token: string | null;
  mode: WalletMode;
  currency: string;
  /** Prefill, e.g. the shortfall to pay an escrow. */
  suggested?: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<'card' | 'transfer'>('card');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setAmount(suggested ? String(Math.ceil(suggested / 100)) : '');
  }, [open, suggested]);

  const minors = toMinors(amount || '0');
  const submit = async () => {
    if (!(minors > 0)) return toast.error({ title: 'Enter an amount above zero' });
    setBusy(true);
    try {
      const r = await api<{ checkoutUrl: string | null; status: string }>('/wallet/topup', {
        method: 'POST',
        token,
        body: { amountMinors: minors, currency, method },
      });
      if (r.checkoutUrl) {
        window.location.href = r.checkoutUrl;
        return;
      }
      toast.success({ title: 'Money added', description: `${formatMinors(minors, currency)} is in your wallet.` });
      onDone();
    } catch (err) {
      toast.error({ title: 'Could not add money', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const methods = [
    { id: 'card' as const, icon: CreditCard, label: 'Card', sub: 'Visa, Mastercard, Verve' },
    { id: 'transfer' as const, icon: Building2, label: 'Bank transfer', sub: 'Pay into a one-time account' },
  ];

  return (
    <Modal isOpen={open} closeModal={busy ? () => undefined : onClose}>
      <div className="w-full text-left md:w-[500px] md:max-w-[calc(100vw-2rem)]">
        <ModalHeader title="Add money" subtitle="Top up your wallet to pay into escrow" onClose={onClose} />
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How to pay">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={clsx(
                  'relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-colors',
                  method === m.id ? 'border-brand bg-brand-subtle' : 'border-border hover:bg-surface'
                )}
              >
                <m.icon size={20} className="text-text-brand dark:text-harbor-200" />
                <span>
                  <span className="block text-body-m font-semi-bold text-text-primary">{m.label}</span>
                  <span className="block text-[11px] text-text-tertiary">{m.sub}</span>
                </span>
                {method === m.id && (
                  <motion.span layoutId="add-method" className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check size={12} strokeWidth={3} />
                  </motion.span>
                )}
              </button>
            ))}
          </div>
          <Input name="amount" label={`Amount (${currency})`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setAmount(String(p / 100))} className="rounded-full bg-surface px-3 py-1 text-body-s font-semi-bold text-text-secondary hover:text-text-primary">
                {formatMinors(p, currency).replace(/\.00$/, '')}
              </button>
            ))}
          </div>
          <ModeNote mode={mode} />
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button label="Cancel" variant="secondary" fit onClick={onClose} disabled={busy} />
            <Button
              label={busy ? 'Starting…' : mode === 'paystack' ? `Continue to Paystack${minors > 0 ? ` · ${formatMinors(minors, currency)}` : ''}` : `Add ${minors > 0 ? formatMinors(minors, currency) : 'money'}`}
              fit
              disabled={busy || !(minors > 0)}
              onClick={submit}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface PayoutAccount {
  bankName: string;
  accountName: string;
  accountLast4: string;
  nameMatches: boolean;
}

/** Withdraw to the payout account verified at KYC; money never goes anywhere else. */
export function WithdrawModal({
  open,
  token,
  mode,
  currency,
  available,
  onClose,
  onDone,
}: {
  open: boolean;
  token: string | null;
  mode: WalletMode;
  currency: string;
  available: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [account, setAccount] = useState<PayoutAccount | null | undefined>(undefined);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !token) return;
    setAmount('');
    api<{ account: PayoutAccount | null }>('/wallet/payout-account', { token })
      .then((r) => setAccount(r.account))
      .catch(() => setAccount(null));
  }, [open, token]);

  const minors = toMinors(amount || '0');
  const tooMuch = minors > available;
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ status: string }>('/wallet/withdraw', { method: 'POST', token, body: { amountMinors: minors, currency } });
      toast.success({
        title: r.status === 'SUCCESS' ? 'Withdrawal sent' : 'Withdrawal on its way',
        description: r.status === 'SUCCESS' ? `${formatMinors(minors, currency)} left your wallet.` : 'Paystack is sending it to your bank. You’ll see it settle here.',
      });
      onDone();
    } catch (err) {
      toast.error({ title: 'Withdrawal failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} closeModal={busy ? () => undefined : onClose}>
      <div className="w-full text-left md:w-[500px] md:max-w-[calc(100vw-2rem)]">
        <ModalHeader title="Withdraw" subtitle="To your verified payout account" onClose={onClose} />
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6">
          {account === undefined ? (
            <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          ) : account === null ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-body-s text-text-secondary">
              <p className="font-semi-bold text-text-primary">No payout account yet</p>
              <p className="mt-0.5">Add your bank account in Verification. Paystack checks the account name matches yours, and withdrawals only ever go there.</p>
              <Button label="Add payout account" size="sm" fit customClassName="mt-3" href="/kyc" />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground"><Landmark size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-m font-semi-bold text-text-primary">{account.accountName}</p>
                <p className="text-body-s text-text-tertiary">{account.bankName} ••••{account.accountLast4}</p>
              </div>
              {account.nameMatches && (
                <span className="flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-[11px] font-semi-bold text-success-text">
                  <BadgeCheck size={12} /> Name verified
                </span>
              )}
            </div>
          )}

          {account && (
            <>
              <div>
                <Input
                  name="withdrawAmount"
                  label={`Amount (${currency})`}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  errorMessage={tooMuch ? `You have ${formatMinors(available, currency)} available.` : undefined}
                  infoMessage={tooMuch ? undefined : `Available: ${formatMinors(available, currency)}`}
                />
                <button type="button" onClick={() => setAmount(String(available / 100))} className="mt-1 text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
                  Withdraw everything
                </button>
              </div>
              <ModeNote mode={mode} />
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button label="Cancel" variant="secondary" fit onClick={onClose} disabled={busy} />
            {account && (
              <Button label={busy ? 'Sending…' : `Withdraw ${minors > 0 ? formatMinors(minors, currency) : ''}`} fit disabled={busy || !(minors > 0) || tooMuch} onClick={submit} />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export interface AwaitingPayment {
  id: string;
  originCity: string;
  destCity: string;
  category: string;
  weightKg: number;
  currency: string;
}

interface Quote {
  legFees: number;
  platformFee: number;
  premium: number;
  total: number;
  currency: string;
}

/** Pay an accepted shipment into escrow from the wallet; the money waits there until delivery. */
export function PayEscrowModal({
  shipment,
  token,
  available,
  onClose,
  onTopUp,
  onDone,
}: {
  shipment: AwaitingPayment | null;
  token: string | null;
  available: number;
  onClose: () => void;
  onTopUp: (shortfall: number) => void;
  onDone: () => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  useEffect(() => {
    if (!shipment || !token) return;
    setQuote(null);
    setOtp(null);
    api<Quote>(`/shipments/${shipment.id}/fund?quote=true`, { method: 'POST', token })
      .then(setQuote)
      .catch((err) => toast.error({ title: 'Could not price this', description: err instanceof ApiError ? err.message : '' }));
  }, [shipment, token]);

  if (!shipment) return <Modal isOpen={false} closeModal={onClose}>{null}</Modal>;
  const short = quote ? Math.max(0, quote.total - available) : 0;

  const pay = async () => {
    setBusy(true);
    try {
      const r = await api<{ deliveryOtp: string | null }>(`/shipments/${shipment.id}/fund`, { method: 'POST', token, body: {} });
      setOtp(r.deliveryOtp ?? '');
      toast.success({ title: 'Paid into escrow', description: 'Your couriers can pick up. Money releases as the package moves.' });
      onDone();
    } catch (err) {
      toast.error({ title: 'Payment failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen closeModal={busy ? () => undefined : onClose}>
      <div className="w-full text-left md:w-[500px] md:max-w-[calc(100vw-2rem)]">
        <ModalHeader title={otp !== null ? 'Paid into escrow' : 'Pay into escrow'} subtitle={`${shipment.originCity} → ${shipment.destCity}`} onClose={onClose} />
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6">
          {otp !== null ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-2 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white"><Lock size={28} /></span>
              <p className="text-body-m text-text-secondary">The money is held in escrow. 70% releases to the courier at the sealed handover and the rest at delivery.</p>
              {otp && (
                <div className="rounded-2xl bg-surface px-5 py-3">
                  <p className="flex items-center justify-center gap-1.5 text-body-s text-text-tertiary"><KeyRound size={14} /> Receiver’s delivery code. Share it only with them.</p>
                  <p className="font-mono text-[32px] font-semi-bold tracking-[0.25em] text-text-primary">{otp}</p>
                </div>
              )}
              <Button label="Done" fit onClick={onClose} />
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-body-s">
                <RouteStrip from={shipment.originCity} to={shipment.destCity} size="sm" />
                <span className="font-semi-bold capitalize text-text-primary">{shipment.category} · {shipment.weightKg} kg</span>
              </div>
              {!quote ? (
                <div className="h-32 animate-pulse rounded-2xl bg-muted" />
              ) : (
                <dl className="divide-y divide-border rounded-2xl border border-border text-body-s">
                  {[
                    ['Courier fees', quote.legFees],
                    ['Platform fee', quote.platformFee],
                    ['Declared-value cover', quote.premium],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between px-4 py-2.5">
                      <dt className="text-text-secondary">{k}</dt>
                      <dd className="font-semi-bold text-text-primary">{formatMinors(v as number, quote.currency)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3">
                    <dt className="font-semi-bold text-text-primary">Into escrow</dt>
                    <dd className="text-title-m font-semi-bold text-text-primary">{formatMinors(quote.total, quote.currency)}</dd>
                  </div>
                </dl>
              )}
              {quote && short > 0 && (
                <p className="rounded-xl bg-warning-subtle px-3.5 py-2.5 text-body-s text-warning-text">
                  Your wallet has {formatMinors(available, quote.currency)}. Add {formatMinors(short, quote.currency)} more to pay this.
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button label="Cancel" variant="secondary" fit onClick={onClose} disabled={busy} />
                {quote && short > 0 ? (
                  <Button label={`Add ${formatMinors(short, quote.currency)}`} fit onClick={() => onTopUp(short)} />
                ) : (
                  <Button label={busy ? 'Paying…' : `Pay ${quote ? formatMinors(quote.total, quote.currency) : ''} into escrow`} fit disabled={busy || !quote} onClick={pay} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

const STEPS = ['Request accepted', 'Money in escrow', 'Part paid (handover)', 'Paid to wallet'];

/** One invoice: what it's for and where the money is, step by step. */
export function InvoiceModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  if (!invoice) return <Modal isOpen={false} closeModal={onClose}>{null}</Modal>;
  const step = invoiceStep(invoice.status);
  const dates = [invoice.createdAt, invoice.escrowFundedAt, step >= 2 ? invoice.escrowFundedAt : null, invoice.paidToWalletAt];
  const counterparty = invoice.role === 'carrier' ? invoice.senderHandle : invoice.carrierHandle;
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  return (
    <Modal isOpen closeModal={onClose}>
      <div className="w-full text-left md:w-[520px] md:max-w-[calc(100vw-2rem)]">
        <ModalHeader title={invoice.number} subtitle={invoice.role === 'carrier' ? 'You carried this package' : 'You sent this package'} onClose={onClose} />
        <div className="flex flex-col gap-5 px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-body-s text-text-tertiary">{invoice.role === 'carrier' ? 'Your fee' : 'Courier fee'}</p>
              <p className="text-[30px] font-light leading-none tracking-tight text-text-primary">{formatMinors(invoice.amount, invoice.currency)}</p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-body-s font-semi-bold text-text-primary">{INVOICE_LABEL[invoice.status]}</span>
          </div>
          {invoice.route && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-body-s">
              <RouteStrip from={invoice.route.originCity} to={invoice.route.destCity} size="sm" />
              <span className="text-text-secondary">
                <span className="capitalize">{invoice.route.category}</span> · {invoice.route.weightKg} kg{counterparty ? ` · @${counterparty}` : ''}
              </span>
            </div>
          )}
          {invoice.status === 'REFUNDED' ? (
            <p className="rounded-xl bg-muted px-4 py-3 text-body-s text-text-secondary">This shipment was cancelled and the escrow went back to the sender.</p>
          ) : (
            <ol className="relative ml-2 border-l-2 border-border pl-6">
              {STEPS.map((label, i) => {
                const done = i <= step;
                return (
                  <motion.li key={label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }} className="relative pb-5 last:pb-0">
                    <span
                      className={clsx(
                        'absolute -left-[33px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2',
                        done ? 'border-brand bg-brand text-brand-foreground dark:border-harbor-300 dark:bg-harbor-300' : 'border-border bg-card'
                      )}
                    >
                      {done && <Check size={9} strokeWidth={3.5} />}
                    </span>
                    <p className={clsx('text-body-m', done ? 'font-semi-bold text-text-primary' : 'text-text-tertiary')}>{label}</p>
                    <p className="text-body-s text-text-tertiary">
                      {i === 2 && done ? `${formatMinors(invoice.amountPaid, invoice.currency)} released so far` : done ? fmt(dates[i]) : 'Not yet'}
                    </p>
                  </motion.li>
                );
              })}
            </ol>
          )}
          <div className="flex justify-between gap-2 border-t border-border pt-4">
            <Link href={invoice.role === 'carrier' ? `/deliveries/carrying/${invoice.legId}` : `/deliveries/sending/${invoice.shipmentId}`} className="text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
              Open the delivery →
            </Link>
            <Button label="Close" variant="secondary" fit onClick={onClose} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
