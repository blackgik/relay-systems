'use client';

import React, { useEffect, useState } from 'react';
import { Gavel, ShieldAlert } from 'lucide-react';
import { Button, Modal, ModalHeader } from '@/ui/elements';
import { formatMinors } from '@/lib/money';
import { useDeclarationStatement } from '@/components/declaration/declaration-panel';
import { RouteStrip, formatDay, formatTime } from '@/components/dashboard/widgets';

export interface AcceptableLeg {
  id: string;
  fee: number;
  currency: string;
  trip: { originCity: string; destCity: string; departAt: string; excludedItems?: string[] };
  shipment: { weightKg: number; category: string; sender: { handle: string | null } };
}

/**
 * Accepting is binding: it unlocks the sender's identity and puts the courier
 * under Part B of the signed declaration. Say so, show the undertaking, and
 * ask for an explicit tick before the request is accepted.
 */
export function AcceptRequestModal({
  leg,
  token,
  busy,
  onClose,
  onAccept,
}: {
  leg: AcceptableLeg | null;
  token: string | null;
  busy: boolean;
  onClose: () => void;
  onAccept: (legId: string) => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const { statement } = useDeclarationStatement(token, !!leg);

  useEffect(() => setAgreed(false), [leg]);

  if (!leg) return <Modal isOpen={false} closeModal={onClose}>{null}</Modal>;
  const banned = leg.trip.excludedItems ?? [];

  return (
    <Modal isOpen closeModal={busy ? () => undefined : onClose}>
      <div className="w-full text-left md:w-[540px] md:max-w-[calc(100vw-2rem)]">
        <ModalHeader title="Accept this request" subtitle={`@${leg.shipment.sender.handle ?? 'sender'} is waiting on your answer`} onClose={onClose} />
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6">
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 text-body-s">
            <div className="col-span-2"><dt className="text-text-tertiary">Route</dt><dd><RouteStrip from={leg.trip.originCity} to={leg.trip.destCity} size="sm" /></dd></div>
            <div><dt className="text-text-tertiary">Package</dt><dd className="font-semi-bold text-text-primary"><span className="capitalize">{leg.shipment.category}</span> · {leg.shipment.weightKg} kg</dd></div>
            <div><dt className="text-text-tertiary">You earn</dt><dd className="font-semi-bold text-text-primary">{formatMinors(leg.fee, leg.currency)}</dd></div>
            <div className="col-span-2"><dt className="text-text-tertiary">You depart</dt><dd className="font-semi-bold text-text-primary">{formatDay(leg.trip.departAt)}, {formatTime(leg.trip.departAt)}</dd></div>
          </dl>

          {banned.length > 0 && (
            <p className="flex gap-2 rounded-xl bg-warning-subtle px-3.5 py-2.5 text-body-s text-warning-text">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>Your cannot-carry list: {banned.join(', ')}. Only accept if this {leg.shipment.category} is none of these.</span>
            </p>
          )}

          <div className="rounded-2xl border border-border p-4">
            <p className="flex items-center gap-2 text-body-s font-semi-bold uppercase tracking-wide text-text-tertiary">
              <Gavel size={15} /> What you are agreeing to
            </p>
            {statement ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body-s text-text-primary">
                {statement.courierClauses.map((c) => <li key={c}>{c}</li>)}
              </ul>
            ) : (
              <div className="mt-2 h-24 animate-pulse rounded-xl bg-muted" />
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 text-body-s text-text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I will carry this package sealed and intact and hand it only to the named receiver. I understand that stealing or opening it is traced and prosecuted.</span>
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button label="Not yet" variant="secondary" fit onClick={onClose} disabled={busy} />
            <Button label={busy ? 'Accepting…' : 'Accept & unlock identity'} fit disabled={busy || !agreed} onClick={() => onAccept(leg.id)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
