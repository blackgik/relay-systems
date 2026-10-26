'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, CircularLoader, Typography } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { Shipment } from '@/lib/types';
import { ChatPanel } from '@/components/chat-panel';
import { ScanHandoff } from '@/components/scan-handoff';
import { formatMinors } from '@/lib/money';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ShipmentDetail() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (loading || !user || !token) return;
    api<Shipment>(`/shipments/${params.id}`, { token })
      .then(setShipment)
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
  if (!shipment || !token || !user) return <CircularLoader />;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          {shipment.originCity} → {shipment.destCity}
        </Typography>
        <Badge label={shipment.status} color="auto" />
        <Link href={`/shipments/${shipment.id}/tracking`} className="text-body-m font-medium text-text-brand">
          Track →
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1">
        <Typography size="body-m" color="secondary" as="p">
          {shipment.category} · {shipment.weightKg} kg ·{' '}
          {formatMinors(shipment.declaredValue, shipment.currency)} declared
        </Typography>
        <Typography size="body-m" color="secondary" as="p">
          Receiver: {shipment.receiverName} ({shipment.receiverPhone})
        </Typography>
      </div>

      {shipment.status === 'APPROVED' && (
        <div>
          <Link href={`/shipments/${shipment.id}/pay`}>
            <Button label="Review & pay into escrow" />
          </Link>
        </div>
      )}

      {shipment.status === 'FUNDED' &&
        shipment.legs[0]?.sequence === 0 &&
        shipment.legs[0]?.status === 'AWAITING_PICKUP' && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <Typography size="title-m" weight="semi-bold" color="primary" as="h2">
              Hand off to the first carrier
            </Typography>
            {!scanning ? (
              <div>
                <Button label="Scan carrier QR" variant="secondary" onClick={() => setScanning(true)} />
              </div>
            ) : (
              <ScanHandoff token={token} onDone={() => window.location.reload()} />
            )}
          </div>
        )}

      <div className="flex flex-col gap-4">
        <Typography size="title-l" weight="semi-bold" color="primary" as="h2">
          Legs
        </Typography>
        {shipment.legs.map((leg) => (
          <div key={leg.id} className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Typography size="body-m" weight="medium" customClassName="text-accent-signal" as="span">
                Leg {leg.sequence + 1}
              </Typography>
              <Typography size="body-m" weight="medium" color="primary" as="span">
                {leg.trip.originCity} → {leg.trip.destCity}
              </Typography>
              <Badge label={leg.status} color="auto" />
            </div>
            <Typography size="body-s" color="secondary" as="p">
              Departs {fmtDate(leg.trip.departAt)} · Fee {formatMinors(leg.fee, leg.currency)} ·
              Accept by {fmtDate(leg.acceptDeadline)}
              {leg.trip.carrier ? ` · Carrier: ${leg.trip.carrier.fullName}` : ''}
            </Typography>
            <div>
              <Button
                label={openChat === leg.id ? 'Hide chat' : 'Chat with carrier'}
                variant="text"
                size="sm"
                onClick={() => setOpenChat(openChat === leg.id ? null : leg.id)}
              />
            </div>
            {openChat === leg.id && (
              <ChatPanel legId={leg.id} token={token} currentUserId={user.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
