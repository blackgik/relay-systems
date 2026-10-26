'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  CircularLoader,
  ImageUploader,
  Input,
  Select,
  Stepper,
  Typography,
  toast,
} from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { RouteOption, Shipment } from '@/lib/types';
import { formatMinors, toMinors } from '@/lib/money';

const CATEGORIES = ['fabric', 'fashion', 'electronics', 'documents', 'books', 'other'];
const CURRENCIES = ['NGN', 'USD'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Step = 'details' | 'routes' | 'review';

export default function Search() {
  const { user, token, loading } = useRequireAuth();
  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [form, setForm] = useState({
    originCity: 'Awka',
    destCity: 'Houston',
    category: 'fabric',
    weightKg: '5',
    declaredValue: '150000',
    currency: 'NGN',
    receiverName: '',
    receiverPhone: '',
  });
  const [photo, setPhoto] = useState<string>();
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!loading && !user) {
    return null;
  }

  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const draft = await api<Shipment>('/shipments', {
        method: 'POST',
        token,
        body: {
          ...form,
          weightKg: Number(form.weightKg),
          declaredValue: toMinors(form.declaredValue),
          photos: photo ? [photo] : [],
        },
      });
      setShipment(draft);
      const found = await api<{ routes: RouteOption[] }>(`/shipments/${draft.id}/routes`, {
        token,
      });
      setRoutes(found.routes);
      setStep('routes');
    } catch (err) {
      toast.error({
        title: 'Search failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  const selectRoute = async (route: RouteOption) => {
    if (!shipment) return;
    setBusy(true);
    try {
      const updated = await api<Shipment>(`/shipments/${shipment.id}/select-route`, {
        method: 'POST',
        token,
        body: { tripIds: route.legs.map((l) => l.trip.id) },
      });
      setShipment(updated);
      setStep('review');
      toast.success({ title: 'Route requested', description: 'Carriers have been notified.' });
    } catch (err) {
      toast.error({
        title: 'Request failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        New shipment
      </Typography>
      <Stepper
        steps={[
          { id: 'details', label: 'Details' },
          { id: 'routes', label: 'Route' },
          { id: 'review', label: 'Review' },
        ]}
        activeId={step}
      />

      {step === 'details' && (
        <form onSubmit={createDraft} className="grid gap-4 md:grid-cols-2">
          <Input name="origin" label="Origin city" value={form.originCity} onChange={set('originCity')} />
          <Input name="dest" label="Destination city" value={form.destCity} onChange={set('destCity')} />
          <Select
            value={form.category}
            onChange={(v: unknown) => setForm((f) => ({ ...f, category: String(v) }))}
            listValue={CATEGORIES}
            label="Category"
          />
          <Input name="weight" label="Weight (kg)" value={form.weightKg} onChange={set('weightKg')} />
          <Input
            name="value"
            label="Declared value"
            value={form.declaredValue}
            onChange={set('declaredValue')}
            showMiniButton
          />
          <Select
            value={form.currency}
            onChange={(v: unknown) => setForm((f) => ({ ...f, currency: String(v) }))}
            listValue={CURRENCIES}
            label="Currency"
          />
          <Input
            name="receiverName"
            label="Receiver name"
            value={form.receiverName}
            onChange={set('receiverName')}
          />
          <Input
            name="receiverPhone"
            label="Receiver phone"
            value={form.receiverPhone}
            onChange={set('receiverPhone')}
          />
          <div className="flex flex-col gap-2">
            <Typography size="body-m" weight="medium" color="primary" as="p">
              Item photo
            </Typography>
            <ImageUploader imageUrl={photo} setImageUrl={setPhoto} id="item-photo" />
          </div>
          <div className="flex items-end">
            <Button type="submit" label={busy ? 'Searching…' : 'Find routes'} size="lg" disabled={busy} />
          </div>
        </form>
      )}

      {step === 'routes' && (
        <div className="flex flex-col gap-4">
          {busy && <CircularLoader />}
          {!busy && routes.length === 0 && (
            <Typography size="body-l" color="secondary" as="p">
              No routes found for this shipment. Try different cities or dates.
            </Typography>
          )}
          {routes.map((route, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={route.legs.length === 1 ? 'Direct' : `${route.legs.length} legs`} color="harbor" />
                <Typography size="body-m" color="secondary" as="p">
                  Arrives {fmtDate(route.arriveAt)}
                </Typography>
                <Typography size="title-m" weight="semi-bold" color="primary" as="p">
                  {formatMinors(route.totalPrice, route.currency)}
                </Typography>
              </div>
              <div className="flex flex-col gap-2">
                {route.legs.map((leg, j) => (
                  <div key={leg.trip.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Typography size="body-s" weight="medium" customClassName="text-accent-signal" as="span">
                      {j + 1}
                    </Typography>
                    <Typography size="body-m" weight="medium" color="primary" as="span">
                      {leg.trip.originCity} → {leg.trip.destCity}
                    </Typography>
                    <Typography size="body-s" color="secondary" as="span">
                      {fmtDate(leg.trip.departAt)} · {formatMinors(leg.fee, route.currency)}
                      {leg.trip.international ? ' · international' : ''}
                    </Typography>
                  </div>
                ))}
              </div>
              <div>
                <Button label="Select this route" onClick={() => selectRoute(route)} disabled={busy} />
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'review' && shipment && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Typography size="title-l" weight="semi-bold" color="primary" as="h2">
              Requests sent
            </Typography>
            <Badge label={shipment.status} color="auto" />
          </div>
          <Typography size="body-m" color="secondary" as="p">
            Each carrier reviews your item and must accept before their 48-hour deadline. Track
            approvals and chat with carriers on the shipment page.
          </Typography>
          <div>
            <Link href={`/shipments/${shipment.id}`}>
              <Button label="Open shipment" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
