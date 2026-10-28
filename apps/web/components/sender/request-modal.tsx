'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button, ImageUploader, Input, Modal, ModalHeader, Select, Typography, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import type { BoardItem } from '@/lib/dashboard-types';
import type { Shipment } from '@/lib/types';
import { formatMinors, toMinors } from '@/lib/money';
import { JOURNEY_LABEL, estimateFee, journeyBucket, journeyHours } from '@/lib/carrier-filters';
import { HandleAvatar, ModeIcon, PhasePill, RouteStrip, Stars, VerifiedBadge, formatDay, formatTime } from '@/components/dashboard/widgets';

/**
 * Direct request to one chosen courier: shows everything about the carrier
 * and their bag, takes the package weight, prices it live at price-per-kg,
 * then creates the shipment and pushes the request to that courier's trip.
 */
export function RequestModal({
  trip,
  token,
  senderTier,
  onClose,
  onSent,
}: {
  trip: BoardItem | null;
  token: string | null;
  /** The signed-in sender's KYC tier: sending needs T1, international trips T2. */
  senderTier: 'T0' | 'T1' | 'T2';
  onClose: () => void;
  onSent?: (shipmentId: string) => void;
}) {
  const [form, setForm] = useState({ weightKg: '1', category: '', declaredValue: '0', receiverName: '', receiverPhone: '' });
  const [photo, setPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  useEffect(() => {
    if (trip) {
      setForm({ weightKg: '1', category: trip.categories[0] ?? 'other', declaredValue: '0', receiverName: '', receiverPhone: '' });
      setPhoto(undefined);
      setError(null);
      setSentId(null);
    }
  }, [trip]);

  const weight = Number(form.weightKg);
  const fee = useMemo(() => (trip ? estimateFee(trip.pricePerKg, weight) : 0), [trip, weight]);
  const weightProblem =
    !form.weightKg || !Number.isFinite(weight) || weight <= 0
      ? 'Enter a weight above 0 kg.'
      : trip && weight > trip.remainingKg
        ? `Only ${trip.remainingKg} kg left in this bag.`
        : null;

  if (!trip) return <Modal isOpen={false} closeModal={onClose}>{null}</Modal>;

  const handle = trip.handle ?? 'courier';
  // Same rules the API enforces, checked before the sender types anything.
  const tierBlock =
    senderTier === 'T0'
      ? 'Verify your identity (Tier 1) before sending a package.'
      : trip.international && senderTier !== 'T2'
        ? 'International trips need you to be Tier 2 (passport) verified.'
        : trip.international && trip.tier !== 'T2'
          ? 'This courier is not passport verified, so they cannot carry international parcels.'
          : null;
  const hours = Math.round(journeyHours(trip) * 10) / 10;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tierBlock) { setError(tierBlock); return; }
    if (weightProblem) { setError(weightProblem); return; }
    if (!form.receiverName.trim() || !form.receiverPhone.trim()) {
      setError('Add the receiver name and phone so the courier can hand over.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const draft = await api<Shipment>('/shipments', {
        method: 'POST',
        token,
        body: {
          originCity: trip.originCity,
          destCity: trip.destCity,
          category: form.category,
          weightKg: weight,
          declaredValue: toMinors(form.declaredValue || '0'),
          currency: trip.currency,
          receiverName: form.receiverName.trim(),
          receiverPhone: form.receiverPhone.trim(),
          photos: photo ? [photo] : [],
        },
      });
      const updated = await api<Shipment>(`/shipments/${draft.id}/select-route`, {
        method: 'POST',
        token,
        body: { tripIds: [trip.tripId] },
      });
      setSentId(updated.id);
      onSent?.(updated.id);
      toast.success({ title: 'Request sent', description: `@${handle} has been notified and must accept before the deadline.` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send this request. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen closeModal={onClose}>
      <div className="w-full max-w-[560px] text-left md:w-[560px]">
        <ModalHeader title={sentId ? 'Request sent' : `Send with @${handle}`} subtitle={`${trip.originCity} → ${trip.destCity}`} onClose={onClose} />
        {sentId ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <CheckCircle2 size={40} className="text-success" />
            <Typography size="title-m" weight="semi-bold" color="primary" as="p">Your request is with @{handle}</Typography>
            <Typography size="body-m" color="secondary" as="p">
              {weight} kg at {formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}/kg — estimated {formatMinors(fee, trip.currency)}.
              The courier reviews your item and must accept before their 48-hour deadline. You pay into escrow after acceptance.
            </Typography>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button label="Track this shipment" href={`/shipments/${sentId}`} fit />
              <Button label="Done" variant="secondary" fit onClick={onClose} />
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 px-5 py-5 md:px-6">
            {/* All about this carrier and trip */}
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/dashboard/people/${handle}`} className="flex items-center gap-3">
                  <HandleAvatar handle={handle} size={44} />
                  <span>
                    <span className="block text-title-s text-text-primary hover:underline">@{handle}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5"><Stars rating={trip.rating} /><VerifiedBadge tier={trip.tier} /></span>
                  </span>
                </Link>
                <PhasePill phase={trip.phase} mode={trip.mode} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-body-s">
                <div><dt className="text-text-tertiary">Route</dt><dd><RouteStrip from={trip.originCity} to={trip.destCity} size="sm" /></dd></div>
                <div><dt className="text-text-tertiary">Travel</dt><dd className="flex items-center gap-1.5 font-semi-bold text-text-primary"><ModeIcon mode={trip.mode} size={13} />{trip.flightNumber ?? trip.mode}{trip.travelVerified ? ' · verified' : ''}</dd></div>
                <div><dt className="text-text-tertiary">Departs</dt><dd className="font-semi-bold text-text-primary">{formatDay(trip.departAt)}, {formatTime(trip.departAt)}</dd></div>
                <div><dt className="text-text-tertiary">Arrives</dt><dd className="font-semi-bold text-text-primary">{formatDay(trip.arriveAt)}, {formatTime(trip.arriveAt)}</dd></div>
                <div><dt className="text-text-tertiary">Journey length</dt><dd className="font-semi-bold text-text-primary">{hours}h · {JOURNEY_LABEL[journeyBucket(trip)]}</dd></div>
                <div><dt className="text-text-tertiary">Bag space left</dt><dd className="font-semi-bold text-text-primary">{trip.remainingKg} kg of {trip.capacityKg} kg</dd></div>
                <div><dt className="text-text-tertiary">Already carrying</dt><dd className="font-semi-bold text-text-primary">{trip.packagesOnHand} pkg · {trip.kgOnHand} kg</dd></div>
                <div><dt className="text-text-tertiary">Accepts</dt><dd className="font-semi-bold capitalize text-text-primary">{trip.categories.join(', ') || '—'}</dd></div>
              </dl>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                <span className="text-body-s text-text-tertiary">Price per kg of bag space</span>
                <span className="text-title-l font-semi-bold text-text-primary">{formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}<span className="text-body-s font-medium text-text-tertiary">/kg</span></span>
              </div>
              <Link href={`/dashboard/people/${handle}`} className="mt-2 inline-block text-body-s font-semi-bold text-text-link hover:underline">View courier&apos;s full profile →</Link>
            </div>

            {/* Package request form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="weightKg"
                id="request-weight"
                label="Package weight (kg)"
                inputMode="decimal"
                value={form.weightKg}
                onChange={set('weightKg')}
                errorMessage={form.weightKg ? weightProblem ?? undefined : undefined}
                infoMessage={`Up to ${trip.remainingKg} kg fits in this bag`}
              />
              <Select value={form.category} onChange={(v: unknown) => setForm((f) => ({ ...f, category: String(v) }))} listValue={trip.categories.length ? trip.categories : ['other']} label="Category" />
              <Input name="receiverName" label="Receiver name" value={form.receiverName} onChange={set('receiverName')} />
              <Input name="receiverPhone" label="Receiver phone" value={form.receiverPhone} onChange={set('receiverPhone')} />
              <Input name="declaredValue" label={`Declared value (${trip.currency})`} value={form.declaredValue} onChange={set('declaredValue')} />
              <div className="flex flex-col gap-2">
                <Typography size="body-m" weight="medium" color="primary" as="p">Item photo (optional)</Typography>
                <ImageUploader imageUrl={photo} setImageUrl={setPhoto} id="request-photo" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-body-m">
              <span className="text-text-secondary">{form.weightKg || '0'} kg × {formatMinors(trip.pricePerKg, trip.currency).replace(/\.00$/, '')}/kg</span>
              <span className="font-semi-bold text-text-primary">Estimated total: {formatMinors(fee, trip.currency)}</span>
            </div>
            <p className="text-body-s text-text-tertiary">
              Requests close {formatDay(trip.requestBy)}, {formatTime(trip.requestBy)}. You only pay into escrow once @{handle} accepts.
            </p>
            {tierBlock && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-subtle px-4 py-3 text-body-s text-warning-text">
                <span className="flex-1">{tierBlock}</span>
                {senderTier !== 'T2' && (
                  <Link href={senderTier === 'T0' ? '/onboarding' : '/kyc'} className="font-semi-bold underline">
                    {senderTier === 'T0' ? 'Verify now' : 'Upgrade to Tier 2'}
                  </Link>
                )}
              </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-destructive-subtle px-4 py-3 text-body-s font-medium text-destructive">{error}</p>}

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button label="Cancel" variant="secondary" fit onClick={onClose} disabled={busy} />
              <Button type="submit" fit label={busy ? 'Sending…' : `Push request to @${handle}`} disabled={busy || !!weightProblem || !!tierBlock} />
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
