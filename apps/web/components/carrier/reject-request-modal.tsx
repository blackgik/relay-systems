'use client';

import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalHeader, Textarea, Typography } from '@/ui/elements';
import { REJECTION_REASONS, resolveRejectionReason } from '@/lib/trip-form';
import { RouteStrip } from '@/components/dashboard/widgets';

/** Decline a carry request with a reason the sender will see. */
export function RejectRequestModal({
  leg,
  busy,
  onClose,
  onReject,
}: {
  leg: { id: string; trip: { originCity: string; destCity: string }; shipment: { weightKg: number; category: string } } | null;
  busy: boolean;
  onClose: () => void;
  onReject: (legId: string, reason: string) => void;
}) {
  const [preset, setPreset] = useState<string>(REJECTION_REASONS[0]);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (leg) { setPreset(REJECTION_REASONS[0]); setCustom(''); setNote(''); }
  }, [leg]);

  if (!leg) return <Modal isOpen={false} closeModal={onClose}>{null}</Modal>;
  const reason = resolveRejectionReason(preset, custom, note);
  const valid = reason.length >= 3;

  return (
    <Modal isOpen closeModal={onClose}>
      <div className="w-full text-left md:w-[520px] md:max-w-[calc(100vw-2rem)]">
        <ModalHeader title="Decline this request" subtitle="The sender sees your reason and the package is rerouted" onClose={onClose} />
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-body-s">
            <RouteStrip from={leg.trip.originCity} to={leg.trip.destCity} size="sm" />
            <span className="font-semi-bold text-text-primary">{leg.shipment.weightKg} kg · {leg.shipment.category}</span>
          </div>

          <fieldset>
            <legend className="mb-2 text-body-m font-medium text-text-primary">Why can&apos;t you carry it?</legend>
            <div className="flex flex-col gap-1.5">
              {REJECTION_REASONS.map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-body-m ${preset === r ? 'border-brand bg-brand-subtle font-semi-bold text-text-primary' : 'border-border text-text-secondary hover:bg-surface'}`}>
                  <input type="radio" name="reject-reason" value={r} checked={preset === r} onChange={() => setPreset(r)} className="h-4 w-4 accent-brand" />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>

          {preset === 'Other' ? (
            <Textarea name="customReason" label="Your reason" value={custom} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustom(e.target.value)} placeholder="Tell the sender why, in a sentence" />
          ) : (
            <Textarea name="note" label="Add a note (optional)" value={note} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} placeholder="Anything that helps the sender reroute" />
          )}

          {preset === 'Other' && custom.trim().length > 0 && !valid && (
            <Typography size="body-s" color="secondary" as="p">Give at least 3 characters so the sender understands.</Typography>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button label="Keep request" variant="secondary" fit onClick={onClose} disabled={busy} />
            <Button label={busy ? 'Declining…' : 'Decline with this reason'} variant="error" fit disabled={busy || !valid} onClick={() => onReject(leg.id, reason)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
