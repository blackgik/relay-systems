'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Badge,
  Button,
  CircularLoader,
  ImageUploader,
  Input,
  QrCode,
  Typography,
  toast,
} from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { Leg, Shipment } from '@/lib/types';
import { ChatPanel } from '@/components/chat-panel';
import { ScanHandoff } from '@/components/scan-handoff';
import { formatMinors } from '@/lib/money';

export default function LegWorkspace() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [leg, setLeg] = useState<Leg | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [qr, setQr] = useState<{ token: string; code: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [otp, setOtp] = useState('');
  const [deliverPhoto, setDeliverPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api<Leg>(`/legs/${params.id}`, { token });
    setLeg(data);
    const full = await api<Shipment>(`/shipments/${data.shipmentId}`, { token });
    setShipment(full);
  }, [token, params.id]);

  useEffect(() => {
    if (loading || !user || !token) return;
    load().catch((err) =>
      toast.error({ title: 'Load failed', description: err instanceof ApiError ? err.message : '' })
    );
  }, [loading, user, token, load]);

  useEffect(
    () => () => {
      if (shareTimer.current) clearInterval(shareTimer.current);
    },
    []
  );

  if (!loading && !user) {
    return null;
  }
  if (!leg || !shipment || !token || !user) return <CircularLoader />;

  const siblings = [...shipment.legs].sort((a, b) => a.sequence - b.sequence);
  const prev = siblings.find((l) => l.sequence === leg.sequence - 1);
  const isLast = leg.sequence === siblings.length - 1;
  const amTaker = leg.trip.carrierId === user.id && leg.status === 'AWAITING_PICKUP';
  const amGiver =
    (leg.sequence === 0 && shipment.senderId === user.id) ||
    (!!prev && prev.status === 'IN_CUSTODY');
  const canDeliver =
    isLast && leg.status === 'IN_CUSTODY' && leg.trip.carrierId === user.id && shipment.status === 'IN_TRANSIT';
  const holdCustody = leg.status === 'IN_CUSTODY' && leg.trip.carrierId === user.id;

  const showQr = async () => {
    setBusy(true);
    try {
      const result = await api<{ token: string; code: string }>(`/legs/${leg.id}/handoff-token`, {
        method: 'POST',
        token,
      });
      setQr(result);
    } catch (err) {
      toast.error({
        title: 'Token failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    if (!otp || !deliverPhoto) {
      toast.error({ title: 'Missing details', description: 'OTP and a photo are required.' });
      return;
    }
    setBusy(true);
    try {
      await api(`/shipments/${shipment.id}/deliver`, {
        method: 'POST',
        token,
        body: { otp, photos: [deliverPhoto], idempotencyKey: crypto.randomUUID() },
      });
      toast.success({ title: 'Delivered', description: 'Escrow released.' });
      await load();
    } catch (err) {
      toast.error({
        title: 'Delivery failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
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
    const ping = () => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          api('/tracking/ping', {
            method: 'POST',
            token,
            body: { shipmentId: shipment.id, lat: pos.coords.latitude, lng: pos.coords.longitude },
          }).catch(() => {});
        },
        () => {},
        { timeout: 5000 }
      );
    };
    ping();
    shareTimer.current = setInterval(ping, 30000);
    setSharing(true);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          Leg {leg.sequence + 1}: {leg.trip.originCity} → {leg.trip.destCity}
        </Typography>
        <Badge label={leg.status} color="auto" />
      </div>
      <Typography size="body-m" color="secondary" as="p">
        Fee {formatMinors(leg.fee, leg.currency)} · Shipment {shipment.status} · Seal:{' '}
        {(shipment as { sealId?: string | null }).sealId ?? 'not yet applied'}
      </Typography>

      {amTaker && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <Typography size="title-m" weight="semi-bold" color="primary" as="h2">
            Take custody
          </Typography>
          <Typography size="body-m" color="secondary" as="p">
            Show this QR to the current custodian. They scan it, confirm the seal, and custody
            moves to you.
          </Typography>
          {!qr ? (
            <div>
              <Button label={busy ? '…' : 'Show my QR'} disabled={busy} onClick={showQr} />
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <QrCode value={qr.token} size={180} />
              <div className="flex flex-col gap-1">
                <Typography size="body-s" color="secondary" as="p">
                  Pairing code (expires in 10 min)
                </Typography>
                <Typography size="display-s" weight="bold" color="primary" as="p">
                  {qr.code}
                </Typography>
                <Button label="Refresh" variant="text" size="sm" onClick={showQr} />
              </div>
            </div>
          )}
        </div>
      )}

      {amGiver && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <Typography size="title-m" weight="semi-bold" color="primary" as="h2">
            Hand off
          </Typography>
          {!scanning ? (
            <div>
              <Button label="Scan taker QR" variant="secondary" onClick={() => setScanning(true)} />
            </div>
          ) : (
            <ScanHandoff
              token={token}
              onDone={() => {
                setScanning(false);
                void load();
              }}
            />
          )}
        </div>
      )}

      {holdCustody && (
        <div className="flex items-center justify-between rounded-lg border border-border p-5">
          <Typography size="body-m" color="secondary" as="p">
            Share live location while you hold this item (every 30s).
          </Typography>
          <Button
            label={sharing ? 'Stop sharing' : 'Share location'}
            variant="secondary"
            size="sm"
            onClick={toggleSharing}
          />
        </div>
      )}

      {canDeliver && (
        <div className="flex max-w-md flex-col gap-4 rounded-lg border border-border p-5">
          <Typography size="title-m" weight="semi-bold" color="primary" as="h2">
            Deliver to receiver
          </Typography>
          <Input name="otp" label="Receiver 6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <ImageUploader imageUrl={deliverPhoto} setImageUrl={setDeliverPhoto} id="deliver-photo" />
          <div>
            <Button label={busy ? 'Delivering…' : 'Confirm delivery'} disabled={busy} onClick={deliver} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <Typography size="title-m" weight="semi-bold" color="primary" as="h2">
          Chat
        </Typography>
        <ChatPanel legId={leg.id} token={token} currentUserId={user.id} />
      </div>
    </div>
  );
}
