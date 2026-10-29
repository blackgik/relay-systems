'use client';

import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Typography, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import type { Trip } from '@/lib/types';
import { formatMinors, toMinors } from '@/lib/money';
import { CITY_COUNTRY, currencyRule, modeReferenceLabel } from '@/lib/trip-form';
import { ModeIcon, RouteStrip, Segmented } from '@/components/dashboard/widgets';

const MODES = ['ROAD', 'AIR', 'RAIL'] as const;
const CATEGORIES = ['fabric', 'fashion', 'electronics', 'documents', 'books', 'other'];
const CANNOT_CARRY_PRESETS = ['glass & fragile', 'liquids', 'batteries', 'perishables', 'cash & valuables', 'weapons'];
const KNOWN_CITIES = Object.keys(CITY_COUNTRY);

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-body-s font-semi-bold capitalize transition-colors ${
    active ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-surface text-text-secondary hover:text-text-primary'
  }`;

/** Interactive new-trip form: mode-aware reference number, country-aware currency, cannot-carry list. */
export function TripCreatePanel({
  token,
  onCreated,
  showHeading = true,
}: {
  token: string | null;
  onCreated: (t: Trip) => void;
  /** Off inside a modal, whose header already names the form. */
  showHeading?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [customBan, setCustomBan] = useState('');
  const [form, setForm] = useState({
    originCity: '',
    destCity: '',
    departAt: toLocalInput(new Date(Date.now() + 5 * 24 * 3600_000)),
    arriveAt: toLocalInput(new Date(Date.now() + 6 * 24 * 3600_000)),
    mode: 'ROAD' as (typeof MODES)[number],
    reference: '',
    capacityKg: '20',
    pricePerKg: '2000',
    currency: 'NGN',
    manualInternational: false,
  });
  const [categories, setCategories] = useState<string[]>(['fabric']);
  const [banned, setBanned] = useState<string[]>([]);
  const [banFee, setBanFee] = useState('');

  const rule = useMemo(() => currencyRule(form.originCity, form.destCity), [form.originCity, form.destCity]);
  const international = rule.international ?? form.manualInternational;
  const currency = rule.locked ?? form.currency;
  const ref = modeReferenceLabel(form.mode);
  const durationH = Math.round(((new Date(form.arriveAt).getTime() - new Date(form.departAt).getTime()) / 3600_000) * 10) / 10;
  const fullBag = (Number(form.capacityKg) || 0) * toMinors(form.pricePerKg || '0');
  const toggle = (list: string[], setList: (v: string[]) => void, v: string) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.originCity.trim() || !form.destCity.trim()) return toast.error({ title: 'Add both cities' });
    if (categories.length === 0) return toast.error({ title: 'Pick at least one category you accept' });
    if (!(durationH > 0)) return toast.error({ title: 'Arrival must be after departure' });
    setBusy(true);
    try {
      const trip = await api<Trip>('/trips', {
        method: 'POST',
        token,
        body: {
          originCity: form.originCity.trim(),
          destCity: form.destCity.trim(),
          departAt: new Date(form.departAt).toISOString(),
          arriveAt: new Date(form.arriveAt).toISOString(),
          mode: form.mode,
          flightNumber: form.reference.trim() || undefined,
          capacityKg: Number(form.capacityKg),
          pricePerKg: toMinors(form.pricePerKg),
          currency,
          categories,
          international,
          excludedItems: banned,
          excludedFeePerKg: banned.length && banFee ? toMinors(banFee) : undefined,
        },
      });
      toast.success({ title: 'Trip posted', description: `${trip.originCity} → ${trip.destCity} is live for senders.` });
      onCreated(trip);
    } catch (err) {
      toast.error({ title: 'Posting failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-label="Create a new trip">
      {showHeading && (
        <div>
          <Typography size="title-l" weight="semi-bold" color="primary" as="h2">Create a new trip</Typography>
          <Typography size="body-s" color="secondary" as="p">List spare bag space on a journey you are already taking.</Typography>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="originCity" label="Origin city" value={form.originCity} onChange={set('originCity')} list="relay-cities" />
        <Input name="destCity" label="Destination city" value={form.destCity} onChange={set('destCity')} list="relay-cities" />
      </div>
      <datalist id="relay-cities">{KNOWN_CITIES.map((c) => <option key={c} value={c} />)}</datalist>

      <div>
        <p className="mb-1.5 text-body-m font-medium text-text-primary">Mode of transport</p>
        <Segmented label="Mode of transport" value={form.mode} onChange={(v) => setForm((f) => ({ ...f, mode: v }))}
          options={MODES.map((m) => ({ value: m, label: <span className="flex items-center gap-1.5"><ModeIcon mode={m} size={14} />{m === 'ROAD' ? 'Road' : m === 'AIR' ? 'Air' : 'Rail'}</span> }))} />
      </div>

      <div key={form.mode} className="tr-fade">
        <Input name="reference" label={ref.label} placeholder={ref.placeholder} value={form.reference} onChange={set('reference')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="departAt" label="Departure" type="datetime-local" value={form.departAt} onChange={set('departAt')} />
        <Input name="arriveAt" label="Arrival" type="datetime-local" value={form.arriveAt} onChange={set('arriveAt')} />
      </div>
      {durationH > 0 && <p className="-mt-2 text-body-s text-text-tertiary">Journey time: {durationH}h</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="capacityKg" label="Capacity you can carry (kg)" value={form.capacityKg} onChange={set('capacityKg')} />
        <Input name="pricePerKg" label={`Price per kg (${currency})`} value={form.pricePerKg} onChange={set('pricePerKg')} showMiniButton />
      </div>

      <div className="rounded-xl bg-surface px-3.5 py-3 text-body-s">
        {rule.locked ? (
          <p className="text-text-secondary">Local trip in {rule.country} — you charge in <strong className="text-text-primary">{rule.locked}</strong>{rule.locked === 'NGN' ? ' (Naira)' : ''}. Currency is fixed for local trips.</p>
        ) : rule.international ? (
          <div className="flex flex-col gap-2">
            <p className="text-text-secondary">International trip — pick what you charge in. Requires Tier 2 verification.</p>
            <Select value={form.currency} onChange={(v: unknown) => setForm((f) => ({ ...f, currency: String(v) }))} listValue={[...new Set(rule.choices)]} label="Currency" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-text-primary">
              <input type="checkbox" checked={form.manualInternational} onChange={(e) => setForm((f) => ({ ...f, manualInternational: e.target.checked }))} />
              This trip crosses a border (international)
            </label>
            <Select value={form.currency} onChange={(v: unknown) => setForm((f) => ({ ...f, currency: String(v) }))} listValue={rule.choices} label="Currency" />
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-body-m font-medium text-text-primary">You accept</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => <button key={c} type="button" aria-pressed={categories.includes(c)} onClick={() => toggle(categories, setCategories, c)} className={chip(categories.includes(c))}>{c}</button>)}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-body-m font-medium text-text-primary">Things you cannot transport</p>
        <div className="flex flex-wrap gap-1.5">
          {CANNOT_CARRY_PRESETS.map((c) => <button key={c} type="button" aria-pressed={banned.includes(c)} onClick={() => toggle(banned, setBanned, c)} className={chip(banned.includes(c))}>{c}</button>)}
          {banned.filter((b) => !CANNOT_CARRY_PRESETS.includes(b)).map((b) => (
            <button key={b} type="button" onClick={() => setBanned(banned.filter((x) => x !== b))} className={chip(true)}>{b} ×</button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={customBan} onChange={(e) => setCustomBan(e.target.value)} placeholder="Add your own, e.g. alcohol"
            className="w-full rounded-full border border-border bg-card px-3 py-2 text-body-s text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-focus-ring" />
          <button type="button" disabled={!customBan.trim()} onClick={() => { setBanned([...banned, customBan.trim().toLowerCase()]); setCustomBan(''); }}
            className="shrink-0 rounded-full border border-border px-3 py-2 text-body-s font-semi-bold text-text-primary disabled:opacity-50">Add</button>
        </div>
        {banned.length > 0 && (
          <div className="mt-3">
            <Input name="banFee" label={`Added fee per kg that could convince you (${currency}, optional)`} value={banFee} onChange={(e) => setBanFee(e.target.value)} />
            <p className="mt-1 text-body-s text-text-tertiary">Leave empty if no amount would convince you. Senders see this before booking.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-body-s">
        <span className="flex items-center gap-2 text-text-secondary">
          {form.originCity && form.destCity ? <RouteStrip from={form.originCity} to={form.destCity} size="sm" /> : 'Your route'}
          <ModeIcon mode={form.mode} size={13} /> {form.reference || ref.label}
        </span>
        <span className="font-semi-bold text-text-primary">Full bag ≈ {formatMinors(fullBag, currency)}</span>
      </div>

      <Button type="submit" label={busy ? 'Posting…' : 'Post this trip'} size="lg" disabled={busy} />
    </form>
  );
}
