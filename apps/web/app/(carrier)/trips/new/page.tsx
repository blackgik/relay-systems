'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Typography, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { toMinors } from '@/lib/money';

const MODES = ['ROAD', 'AIR', 'RAIL'];
const CURRENCIES = ['NGN', 'USD'];
const CATEGORIES = ['fabric', 'fashion', 'electronics', 'documents', 'books', 'other'];

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostTrip() {
  const { user, token, loading } = useRequireAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    originCity: '',
    destCity: '',
    departAt: toLocalInput(new Date(Date.now() + 5 * 24 * 3600_000)),
    arriveAt: toLocalInput(new Date(Date.now() + 6 * 24 * 3600_000)),
    mode: 'ROAD',
    flightNumber: '',
    capacityKg: '20',
    pricePerKg: '10',
    currency: 'NGN',
    category: 'fabric',
    international: false,
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!loading && !user) {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/trips', {
        method: 'POST',
        token,
        body: {
          originCity: form.originCity,
          destCity: form.destCity,
          departAt: new Date(form.departAt).toISOString(),
          arriveAt: new Date(form.arriveAt).toISOString(),
          mode: form.mode,
          flightNumber: form.flightNumber || undefined,
          capacityKg: Number(form.capacityKg),
          pricePerKg: toMinors(form.pricePerKg),
          currency: form.currency,
          categories: [form.category],
          international: form.international,
        },
      });
      toast.success({ title: 'Trip posted' });
      router.push('/trips');
    } catch (err) {
      toast.error({
        title: 'Posting failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        Post a trip
      </Typography>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Input name="origin" label="Origin city" value={form.originCity} onChange={set('originCity')} />
        <Input name="dest" label="Destination city" value={form.destCity} onChange={set('destCity')} />
        <Input name="depart" label="Departure" type="datetime-local" value={form.departAt} onChange={set('departAt')} />
        <Input name="arrive" label="Arrival" type="datetime-local" value={form.arriveAt} onChange={set('arriveAt')} />
        <Select
          value={form.mode}
          onChange={(v: unknown) => setForm((f) => ({ ...f, mode: String(v) }))}
          listValue={MODES}
          label="Mode"
        />
        <Input name="flight" label="Flight number (optional)" value={form.flightNumber} onChange={set('flightNumber')} />
        <Input name="capacity" label="Capacity (kg)" value={form.capacityKg} onChange={set('capacityKg')} />
        <Input name="price" label="Price per kg" value={form.pricePerKg} onChange={set('pricePerKg')} showMiniButton />
        <Select
          value={form.currency}
          onChange={(v: unknown) => setForm((f) => ({ ...f, currency: String(v) }))}
          listValue={CURRENCIES}
          label="Currency"
        />
        <Select
          value={form.category}
          onChange={(v: unknown) => setForm((f) => ({ ...f, category: String(v) }))}
          listValue={CATEGORIES}
          label="Accepted category"
        />
        <label className="flex items-center gap-2 text-body-m text-text-primary">
          <input
            type="checkbox"
            checked={form.international}
            onChange={(e) => setForm((f) => ({ ...f, international: e.target.checked }))}
          />
          International leg (requires Tier 2)
        </label>
        <div>
          <Button type="submit" label={busy ? 'Posting…' : 'Post trip'} size="lg" disabled={busy} />
        </div>
      </form>
    </div>
  );
}
