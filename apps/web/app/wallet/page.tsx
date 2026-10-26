'use client';

import React, { useEffect, useState } from 'react';
import { Button, CircularLoader, Input, Select, Typography, toast } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { formatMinors, toMinors } from '@/lib/money';

interface WalletAccount {
  id: string;
  currency: string;
  balance: number;
}

interface LedgerLine {
  id: string;
  accountId: string;
  amount: number;
  transaction: { id: string; type: string; shipmentId?: string | null; createdAt: string };
}

const CURRENCIES = ['NGN', 'USD'];

export default function Wallet() {
  const { user, token, loading } = useRequireAuth();
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [ready, setReady] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [busy, setBusy] = useState(false);

  const load = async (t: string) => {
    const [a, l] = await Promise.all([
      api<WalletAccount[]>('/wallet', { token: t }),
      api<LedgerLine[]>('/wallet/transactions', { token: t }),
    ]);
    setAccounts(a);
    setLines(l);
    setReady(true);
  };

  useEffect(() => {
    if (loading || !user || !token) return;
    load(token).catch((err) =>
      toast.error({ title: 'Load failed', description: err instanceof ApiError ? err.message : '' })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, token]);

  if (!loading && !user) {
    return null;
  }

  const move = async (action: 'topup' | 'withdraw') => {
    if (!token) return;
    const minors = toMinors(amount);
    if (!(minors > 0)) return;
    setBusy(true);
    try {
      await api(`/wallet/${action}`, {
        method: 'POST',
        token,
        body: { amountMinors: minors, currency },
      });
      setAmount('');
      await load(token);
      toast.success({ title: action === 'topup' ? 'Topped up' : 'Withdrawn' });
    } catch (err) {
      toast.error({
        title: 'Failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
    <div className="flex max-w-3xl flex-col gap-6">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        Wallet
      </Typography>
      {!ready && <CircularLoader />}
      {ready && (
        <>
          <div className="flex flex-wrap gap-3">
            {accounts.length === 0 && (
              <Typography size="body-m" color="secondary" as="p">
                No balances yet — top up to get started.
              </Typography>
            )}
            {accounts.map((account) => (
              <div key={account.id} className="rounded-lg bg-brand px-5 py-4">
                <Typography size="body-s" customClassName="text-white/70" as="p">
                  {account.currency}
                </Typography>
                <Typography size="title-l" weight="semi-bold" customClassName="text-white" as="p">
                  {formatMinors(account.balance, account.currency)}
                </Typography>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Input
              name="amount"
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              showMiniButton
            />
            <Select
              value={currency}
              onChange={(v: unknown) => setCurrency(String(v))}
              listValue={CURRENCIES}
              label="Currency"
            />
            <Button label="Top up" variant="secondary" disabled={busy} onClick={() => move('topup')} />
            <Button label="Withdraw" variant="ghost" disabled={busy} onClick={() => move('withdraw')} />
          </div>

          <div className="flex flex-col gap-2">
            <Typography size="title-l" weight="semi-bold" color="primary" as="h2">
              Movements
            </Typography>
            {lines.length === 0 && (
              <Typography size="body-m" color="secondary" as="p">
                No movements yet.
              </Typography>
            )}
            {lines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between border-b border-border py-2"
              >
                <div className="flex flex-col">
                  <Typography size="body-m" weight="medium" color="primary" as="p">
                    {line.transaction.type}
                  </Typography>
                  <Typography size="body-s" color="secondary" as="p">
                    {new Date(line.transaction.createdAt).toLocaleString('en-GB')}
                    {line.transaction.shipmentId ? ` · ${line.transaction.shipmentId.slice(0, 8)}` : ''}
                  </Typography>
                </div>
                <Typography
                  size="body-m"
                  weight="semi-bold"
                  customClassName={line.amount >= 0 ? 'text-success-text' : 'text-destructive'}
                  as="p"
                >
                  {line.amount >= 0 ? '+' : ''}
                  {formatMinors(line.amount, line.accountId.split(':').pop() ?? 'NGN')}
                </Typography>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </AppShell>
  );
}
