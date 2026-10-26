'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Badge, Button, CircularLoader, Typography, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api, apiBase } from '@/lib/api';
import { Leg, Shipment } from '@/lib/types';

const ShipmentMap = dynamic(
  () => import('@/components/shipment-map').then((m) => m.ShipmentMap),
  { ssr: false }
);

interface CustodyEvent {
  id: string;
  type: string;
  sealId: string;
  photos: string[];
  lat: number | null;
  lng: number | null;
  occurredAt: string;
}

interface Ping {
  lat: number;
  lng: number;
  at: string;
}

interface TrackData {
  shipment: Shipment;
  legs: (Leg & { trip: Leg['trip'] })[];
  custody: CustodyEvent[];
  pings: Ping[];
}

export default function Tracking() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TrackData | null>(null);

  useEffect(() => {
    if (loading || !user || !token) return;
    api<TrackData>(`/tracking/${params.id}`, { token })
      .then(setData)
      .catch((err) =>
        toast.error({ title: 'Load failed', description: err instanceof ApiError ? err.message : '' })
      );
    const socket: Socket = io(`${apiBase()}/tracking`, { transports: ['websocket'] });
    socket.emit('join', { shipmentId: params.id, token });
    socket.on('location', (ping: Ping) => {
      setData((prev) => (prev ? { ...prev, pings: [...prev.pings, ping] } : prev));
    });
    socket.on('status', () => {
      api<TrackData>(`/tracking/${params.id}`, { token }).then(setData).catch(() => {});
    });
    return () => {
      socket.disconnect();
    };
  }, [loading, user, token, params.id]);

  if (!loading && !user) {
    return null;
  }
  if (!data) return <CircularLoader />;

  const complete = async () => {
    if (!token) return;
    try {
      await api(`/shipments/${params.id}/complete`, { method: 'POST', token });
      toast.success({ title: 'Shipment completed' });
      const updated = await api<TrackData>(`/tracking/${params.id}`, { token });
      setData(updated);
    } catch (err) {
      toast.error({
        title: 'Failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          {data.shipment.originCity} → {data.shipment.destCity}
        </Typography>
        <Badge label={data.shipment.status} color="auto" />
      </div>

      {data.shipment.status === 'DELIVERED' && user && data.shipment.senderId === user.id && (
        <div>
          <Button label="Confirm condition and complete" onClick={complete} />
        </div>
      )}

      <ShipmentMap
        pings={data.pings}
        checkpoints={data.custody.map((c) => ({ lat: c.lat, lng: c.lng, label: c.type, at: c.occurredAt }))}
      />

      <div className="flex flex-col gap-3">
        <Typography size="title-l" weight="semi-bold" color="primary" as="h2">
          Checkpoints
        </Typography>
        {data.custody.length === 0 && (
          <Typography size="body-m" color="secondary" as="p">
            No custody events yet — pickup is pending.
          </Typography>
        )}
        {data.custody.map((event) => (
          <div key={event.id} className="flex flex-wrap items-center gap-3 border-b border-border py-2">
            <Badge label={event.type} color="harbor" />
            <Typography size="body-m" color="secondary" as="span">
              {new Date(event.occurredAt).toLocaleString('en-GB')}
            </Typography>
            <Typography size="body-s" color="secondary" as="span">
              Seal {event.sealId} · {event.photos.length} photo(s)
            </Typography>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Typography size="title-l" weight="semi-bold" color="primary" as="h2">
          Legs
        </Typography>
        {data.legs.map((leg) => (
          <div key={leg.id} className="flex flex-wrap items-center gap-3">
            <Typography size="body-m" weight="medium" color="primary" as="span">
              {leg.trip.originCity} → {leg.trip.destCity}
            </Typography>
            <Badge label={leg.status} color="auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
