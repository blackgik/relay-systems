'use client';

import React, { useEffect, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import Link from 'next/link';
import { Badge, Button, CircularLoader, Typography, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { Trip } from '@/lib/types';
import { formatMinors } from '@/lib/money';

export default function MyTrips() {
  const { user, token, loading } = useRequireAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ready, setReady] = useState(false);

  const load = async (t: string) => {
    const data = await api<Trip[]>('/trips?mine=true', { token: t });
    setTrips(data);
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

  const cancel = async (id: string) => {
    if (!token) return;
    try {
      await api(`/trips/${id}`, { method: 'PATCH', token, body: { status: 'CANCELLED' } });
      toast.success({ title: 'Trip cancelled' });
      await load(token);
    } catch (err) {
      toast.error({
        title: 'Cancel failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    }
  };

  const verifyTravel = async (trip: Trip) => {
    if (!token) return;
    try {
      await api(`/trips/${trip.id}/travel-proof`, {
        method: 'POST',
        token,
        body: { reference: trip.flightNumber ?? `manual-${trip.id.slice(0, 8)}` },
      });
      toast.success({ title: 'Travel verified' });
      await load(token);
    } catch (err) {
      toast.error({
        title: 'Verification failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          My trips
        </Typography>
        <Link href="/trips/new" className="text-body-m font-medium text-text-brand">
          + Post a trip
        </Link>
      </div>
      {!ready && <CircularLoader />}
      {ready && trips.length === 0 && (
        <EmptyState
          art="route"
          title="No trips posted"
          body="Going somewhere? List the route, date and spare kilos — senders on your way will find you."
          cta={{ href: '/trips/new', label: 'Post your first trip' }}
        />
      )}
      {trips.map((trip) => (
        <div key={trip.id} className="flex flex-col gap-2 rounded-lg border border-border p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Typography size="body-m" weight="medium" color="primary" as="span">
              {trip.originCity} → {trip.destCity}
            </Typography>
            <Badge label={trip.mode} color="neutral" />
            {trip.travelVerified && <Badge label="travel verified" color="success" />}
          </div>
          <Typography size="body-s" color="secondary" as="p">
            {new Date(trip.departAt).toLocaleString('en-GB')} →{' '}
            {new Date(trip.arriveAt).toLocaleString('en-GB')} · {trip.remainingKg}/{trip.capacityKg}{' '}
            kg left · {formatMinors(trip.pricePerKg, trip.currency)}/kg
          </Typography>
          <div className="flex gap-3">
            {!trip.travelVerified && (
              <Button label="Verify travel" variant="text" size="sm" onClick={() => verifyTravel(trip)} />
            )}
            <Button label="Cancel trip" variant="text" size="sm" onClick={() => cancel(trip.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
