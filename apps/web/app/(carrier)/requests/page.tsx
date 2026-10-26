'use client';

import React, { useEffect, useState } from 'react';
import { Badge, Button, CircularLoader, Typography, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { Leg } from '@/lib/types';
import { formatMinors } from '@/lib/money';

interface IncomingLeg extends Leg {
  shipment: {
    id: string;
    status: string;
    originCity: string;
    destCity: string;
    category: string;
    weightKg: number;
    photos: string[];
    sender: { id: string; fullName: string; rating: number; kycTier: string };
  };
}

function hoursLeft(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000));
}

export default function CarrierRequests() {
  const { user, token, loading } = useRequireAuth();
  const [legs, setLegs] = useState<IncomingLeg[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (t: string) => {
    const data = await api<IncomingLeg[]>('/legs/mine', { token: t });
    setLegs(data);
    setReady(true);
  };

  useEffect(() => {
    if (loading || !user || !token) return;
    load(token).catch((err) =>
      toast.error({ title: 'Load failed', description: err instanceof ApiError ? err.message : '' })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, token]);

  if (!loading && !user) {
    return null;
  }

  const decide = async (legId: string, action: 'accept' | 'reject') => {
    if (!token) return;
    setBusy(legId);
    try {
      await api(`/legs/${legId}/${action}`, { method: 'POST', token });
      toast.success({ title: action === 'accept' ? 'Leg accepted' : 'Leg rejected' });
      await load(token);
    } catch (err) {
      toast.error({
        title: 'Action failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        Incoming requests
      </Typography>
      {!ready && <CircularLoader />}
      {ready && legs.length === 0 && (
        <Typography size="body-l" color="secondary" as="p">
          No requests yet. Post a trip to start receiving them.
        </Typography>
      )}
      {legs.map((leg) => (
        <div key={leg.id} className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Typography size="body-m" weight="medium" color="primary" as="span">
              {leg.trip.originCity} → {leg.trip.destCity}
            </Typography>
            <Badge label={leg.status} color="auto" />
            {leg.status === 'PROPOSED' && (
              <Typography size="body-s" color="secondary" as="span">
                {hoursLeft(leg.acceptDeadline)}h left to decide
              </Typography>
            )}
          </div>
          <div className="flex gap-4">
            {leg.shipment.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={leg.shipment.photos[0]}
                alt="Item"
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div className="flex flex-col gap-1">
              <Typography size="body-m" color="secondary" as="p">
                {leg.shipment.category} · {leg.shipment.weightKg} kg · Fee{' '}
                {formatMinors(leg.fee, leg.currency)}
              </Typography>
              <Typography size="body-m" color="secondary" as="p">
                Sender: {leg.shipment.sender.fullName} ({leg.shipment.sender.kycTier})
              </Typography>
              <Typography size="body-s" color="secondary" as="p">
                Departs {new Date(leg.trip.departAt).toLocaleString('en-GB')}
              </Typography>
            </div>
          </div>
          {leg.status === 'PROPOSED' && (
            <div className="flex gap-3">
              <Button
                label="Accept"
                size="sm"
                disabled={busy !== null}
                onClick={() => decide(leg.id, 'accept')}
              />
              <Button
                label="Reject"
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => decide(leg.id, 'reject')}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
