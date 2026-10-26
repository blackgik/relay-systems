'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, CircularLoader, Input, Typography, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { formatMinors, toMinors } from '@/lib/money';

interface Quote {
  shipmentId: string;
  currency: string;
  legFees: number;
  platformFee: number;
  premium: number;
  total: number;
}

interface WalletAccount {
  id: string;
  currency: string;
  balance: number;
}

export default function Pay() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [balances, setBalances] = useState<WalletAccount[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [funded, setFunded] = useState(false);
  // Issued once by the API (mock SMS to the receiver); a replayed fund returns null.
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user || !token) return;
    Promise.all([
      api<Quote>(`/shipments/${params.id}/fund?quote=true`, { method: 'POST', token }),
      api<WalletAccount[]>('/wallet', { token }),
    ])
      .then(([q, b]) => {
        setQuote(q);
        setBalances(b);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Load failed'));
  }, [loading, user, token, params.id]);

  if (!loading && !user) {
    return null;
  }
  if (error) {
    return (
      <Typography size="body-l" color="secondary" as="p">
        {error}
      </Typography>
    );
  }
  if (!quote) return <CircularLoader />;

  const balance = balances.find((b) => b.currency === quote.currency)?.balance ?? 0;
  const shortfall = Math.max(0, quote.total - balance);

  const topup = async () => {
    if (!token) return;
    const minors = toMinors(topupAmount || String(shortfall / 100));
    if (!(minors > 0)) return;
    setBusy(true);
    try {
      await api('/wallet/topup', {
        method: 'POST',
        token,
        body: { amountMinors: minors, currency: quote.currency },
      });
      const updated = await api<WalletAccount[]>('/wallet', { token });
      setBalances(updated);
      setTopupAmount('');
      toast.success({ title: 'Wallet topped up' });
    } catch (err) {
      toast.error({
        title: 'Top-up failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  const fund = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await api<{ deliveryOtp: string | null }>(`/shipments/${params.id}/fund`, {
        method: 'POST',
        token,
        body: {},
      });
      setDeliveryOtp(res.deliveryOtp);
      setFunded(true);
      toast.success({ title: 'Escrow funded', description: 'Carriers can now pick up.' });
    } catch (err) {
      toast.error({
        title: 'Funding failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  if (funded) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Badge label="FUNDED" color="success" />
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          Money is in escrow
        </Typography>
        <Typography size="body-l" color="secondary" as="p">
          {formatMinors(quote.total, quote.currency)} is held until delivery is confirmed. The
          first carrier can now pick up the item.
        </Typography>
        {deliveryOtp && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted p-4">
            <Typography size="body-m" color="secondary" as="p">
              Receiver delivery code (sent by SMS in production; shown once)
            </Typography>
            <Typography size="headline-m" weight="bold" color="primary" as="p" customClassName="tracking-[0.3em]">
              {deliveryOtp}
            </Typography>
          </div>
        )}
        <Link href={`/shipments/${params.id}`} className="text-body-m font-medium text-text-brand">
          Track shipment →
        </Link>
      </div>
    );
  }

  const rows: [string, number][] = [
    ['Carrier fees', quote.legFees],
    ['Platform fee', quote.platformFee],
    ['Insurance premium', quote.premium],
  ];

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        Fund escrow
      </Typography>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <Typography size="body-m" color="secondary" as="p">
              {label}
            </Typography>
            <Typography size="body-m" weight="medium" color="primary" as="p">
              {formatMinors(value, quote.currency)}
            </Typography>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <Typography size="title-m" weight="semi-bold" color="primary" as="p">
            Total
          </Typography>
          <Typography size="title-m" weight="semi-bold" color="primary" as="p">
            {formatMinors(quote.total, quote.currency)}
          </Typography>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Typography size="body-m" color="secondary" as="p">
          Wallet balance: {formatMinors(balance, quote.currency)}
        </Typography>
        {shortfall > 0 && (
          <div className="flex items-end gap-3">
            <Input
              name="topup"
              label={`Top up (short by ${formatMinors(shortfall, quote.currency)})`}
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              showMiniButton
            />
            <Button label={busy ? '…' : 'Top up'} variant="secondary" disabled={busy} onClick={topup} />
          </div>
        )}
      </div>

      <div>
        <Button
          label={busy ? 'Funding…' : `Pay ${formatMinors(quote.total, quote.currency)}`}
          size="lg"
          disabled={busy || shortfall > 0}
          onClick={fund}
        />
      </div>
    </div>
  );
}
