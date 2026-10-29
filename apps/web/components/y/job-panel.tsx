'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Check, KeyRound, MapPin, PackageCheck, QrCode as QrIcon, ScanLine } from 'lucide-react';
import { Button, ImageUploader, Input, QrCode, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import type { Leg, Shipment } from '@/lib/types';
import { ChatPanel } from '@/components/chat-panel';
import { ScanHandoff } from '@/components/scan-handoff';

const STEPS = [
  { id: 'accepted', label: 'Accepted', icon: Check },
  { id: 'pickup', label: 'Pick up', icon: QrIcon },
  { id: 'carry', label: 'In your bag', icon: MapPin },
  { id: 'handover', label: 'Hand over', icon: PackageCheck },
] as const;

function stepIndex(status: string) {
  if (status === 'ACCEPTED' || status === 'AWAITING_PICKUP') return 1;
  if (status === 'IN_CUSTODY') return 2;
  if (['HANDED_OFF', 'SETTLED'].includes(status)) return 4;
  return 0;
}

/**
 * The courier's job once a request is accepted: show your QR to take custody,
 * share location while it's in your bag, then hand it to the next courier or
 * deliver it to the receiver with their one-time code. Was the separate
 * /legs/[id] page; now it lives inside the request it belongs to.
 */
export function JobPanel({ legId, token, userId, onChanged }: { legId: string; token: string; userId: string; onChanged: () => void }) {
  const [leg, setLeg] = useState<Leg | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [qr, setQr] = useState<{ token: string; code: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [otp, setOtp] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [chat, setChat] = useState(false);
  const shareTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const l = await api<Leg>(`/legs/${legId}`, { token });
    setLeg(l);
    setShipment(await api<Shipment>(`/shipments/${l.shipmentId}`, { token }));
  }, [legId, token]);

  useEffect(() => {
    load().catch((err) => toast.error({ title: 'Could not load this job', description: err instanceof ApiError ? err.message : '' }));
  }, [load]);

  useEffect(() => () => {
    if (shareTimer.current) clearInterval(shareTimer.current);
  }, []);

  if (!leg || !shipment) return <div className="h-48 animate-pulse rounded-[22px] bg-muted" aria-label="Loading job" />;

  const legs = [...shipment.legs].sort((a, b) => a.sequence - b.sequence);
  const prev = legs.find((l) => l.sequence === leg.sequence - 1);
  const isLast = leg.sequence === legs.length - 1;
  const mine = leg.trip.carrierId === userId;
  const takeCustody = mine && leg.status === 'AWAITING_PICKUP';
  const giveCustody = (leg.sequence === 0 && shipment.senderId === userId) || (!!prev && prev.status === 'IN_CUSTODY');
  const canDeliver = isLast && mine && leg.status === 'IN_CUSTODY' && shipment.status === 'IN_TRANSIT';
  const holding = mine && leg.status === 'IN_CUSTODY';
  const nextLegWaiting = !isLast && holding;
  const step = stepIndex(leg.status);

  const after = async () => {
    await load();
    onChanged();
  };

  const showQr = async () => {
    setBusy(true);
    try {
      setQr(await api<{ token: string; code: string }>(`/legs/${leg.id}/handoff-token`, { method: 'POST', token }));
    } catch (err) {
      toast.error({ title: 'Could not make your QR', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    if (otp.trim().length !== 6 || !photo) {
      toast.error({ title: 'Missing details', description: 'Enter the receiver’s 6-digit code and add a delivery photo.' });
      return;
    }
    setBusy(true);
    try {
      await api(`/shipments/${shipment.id}/deliver`, { method: 'POST', token, body: { otp: otp.trim(), photos: [photo], idempotencyKey: crypto.randomUUID() } });
      toast.success({ title: 'Delivered', description: 'The receiver confirmed. Escrow is releasing your fee.' });
      await after();
    } catch (err) {
      toast.error({ title: 'Delivery failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(false);
    }
  };

  const toggleSharing = () => {
    if (sharing) {
      if (shareTimer.current) clearInterval(shareTimer.current);
      shareTimer.current = null;
      setSharing(false);
      return;
    }
    const ping = () =>
      navigator.geolocation?.getCurrentPosition(
        (pos) =>
          void api('/tracking/ping', { method: 'POST', token, body: { shipmentId: shipment.id, lat: pos.coords.latitude, lng: pos.coords.longitude } }).catch(() => undefined),
        () => undefined,
        { timeout: 5000 }
      );
    ping();
    shareTimer.current = setInterval(ping, 30000);
    setSharing(true);
  };

  return (
    <section className="rounded-[22px] border border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-title-base text-text-primary">Your job</p>
        <p className="text-body-s text-text-tertiary">
          Leg {leg.sequence + 1} of {legs.length} · Seal {(shipment as { sealId?: string | null }).sealId ?? 'applied at pickup'}
        </p>
      </div>

      {/* Step tracker */}
      <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Job progress">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          const Icon = s.icon;
          return (
            <li key={s.id} className="flex flex-col items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
              <span className="relative flex w-full items-center">
                <span className={clsx('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || current ? 'bg-brand dark:bg-harbor-300' : 'bg-border')} />
                <motion.span
                  initial={false}
                  animate={{ scale: current ? 1.12 : 1 }}
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    done ? 'border-brand bg-brand text-brand-foreground dark:border-harbor-300 dark:bg-harbor-300' : current ? 'border-accent-signal bg-card text-text-primary' : 'border-border bg-card text-text-tertiary'
                  )}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
                </motion.span>
                <span className={clsx('h-0.5 flex-1', i === STEPS.length - 1 ? 'bg-transparent' : done ? 'bg-brand dark:bg-harbor-300' : 'bg-border')} />
              </span>
              <span className={clsx('text-[11px] leading-tight', current ? 'font-semi-bold text-text-primary' : 'text-text-tertiary')}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={leg.status} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="mt-5 flex flex-col gap-4">
          {mine && leg.status === 'ACCEPTED' && (
            <div className="flex gap-3 rounded-2xl bg-surface p-4">
              <span className="tr-live mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" aria-hidden />
              <div>
                <p className="text-body-m font-semi-bold text-text-primary">Waiting for the sender to pay</p>
                <p className="mt-0.5 text-body-s text-text-secondary">
                  {legs.length > 1 ? 'Once every courier on the route accepts, the sender pays into escrow. ' : 'The sender now pays into escrow. '}
                  Pickup opens here as soon as the money is held, and you get your QR.
                </p>
              </div>
            </div>
          )}

          {takeCustody && (
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-body-m font-semi-bold text-text-primary">Take custody</p>
              <p className="mt-0.5 text-body-s text-text-secondary">
                Meet {leg.sequence === 0 ? 'the sender' : 'the previous courier'}, check the item against the declaration, then show them this QR. They scan it and confirm the seal.
              </p>
              {!qr ? (
                <Button label={busy ? 'Making your QR…' : 'Show my pickup QR'} fit customClassName="mt-3" iconLeading={<QrIcon size={16} />} disabled={busy} onClick={showQr} />
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 flex flex-wrap items-center gap-5">
                  <QrCode value={qr.token} size={168} title="Pickup QR" />
                  <div>
                    <p className="text-body-s text-text-tertiary">Or read out this pairing code (10 min)</p>
                    <p className="font-mono text-[34px] font-semi-bold tracking-[0.2em] text-text-primary">{qr.code}</p>
                    <Button label="Refresh" variant="text" size="sm" fit onClick={showQr} />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {giveCustody && !takeCustody && (
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-body-m font-semi-bold text-text-primary">Hand over to the next courier</p>
              <p className="mt-0.5 text-body-s text-text-secondary">Scan their pickup QR to pass custody on. The seal number is checked on both sides.</p>
              {!scanning ? (
                <Button label="Scan their QR" variant="secondary" fit customClassName="mt-3" iconLeading={<ScanLine size={16} />} onClick={() => setScanning(true)} />
              ) : (
                <div className="mt-3">
                  <ScanHandoff token={token} onDone={() => { setScanning(false); void after(); }} />
                </div>
              )}
            </div>
          )}

          {holding && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-body-m font-semi-bold text-text-primary">
                  {sharing && <span className="tr-live h-2 w-2 rounded-full bg-info" aria-hidden />} Live location
                </p>
                <p className="text-body-s text-text-secondary">
                  {sharing ? 'Sharing every 30 seconds with the sender while the package is with you.' : 'Share your location while the package is in your bag, so the sender can follow it.'}
                </p>
              </div>
              <Button label={sharing ? 'Stop sharing' : 'Share location'} variant={sharing ? 'secondary' : 'primary'} size="sm" fit onClick={toggleSharing} />
            </div>
          )}

          {nextLegWaiting && (
            <p className="rounded-2xl border border-dashed border-border p-4 text-body-s text-text-secondary">
              At {leg.trip.destCity}, the next courier shows you their pickup QR. Scan it from their side of the handover to pass custody on.
            </p>
          )}

          {canDeliver && (
            <div className="rounded-2xl border border-success/30 bg-success-subtle/40 p-4">
              <p className="flex items-center gap-2 text-body-m font-semi-bold text-text-primary"><KeyRound size={16} /> Deliver to the receiver</p>
              <p className="mt-0.5 text-body-s text-text-secondary">Ask {shipment.receiverName} for their 6-digit code and take a photo of the handover.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <Input name="otp" label="Receiver’s 6-digit code" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                <ImageUploader imageUrl={photo} setImageUrl={setPhoto} id={`deliver-photo-${leg.id}`} />
              </div>
              <Button label={busy ? 'Confirming…' : 'Confirm delivery'} fit customClassName="mt-3" disabled={busy || otp.length !== 6 || !photo} onClick={deliver} />
            </div>
          )}

          {step === 4 && (
            <motion.p initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 rounded-2xl bg-success-subtle p-4 text-body-s font-semi-bold text-success-text">
              <PackageCheck size={18} /> {leg.status === 'SETTLED' ? 'Delivered and paid out. Nice work.' : 'Handed over. Your fee releases once the package is delivered.'}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 border-t border-border pt-4">
        <button type="button" onClick={() => setChat((c) => !c)} aria-expanded={chat} className="text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
          {chat ? 'Hide chat' : 'Chat about this package'}
        </button>
        <AnimatePresence initial={false}>
          {chat && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3"><ChatPanel legId={leg.id} token={token} currentUserId={userId} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
