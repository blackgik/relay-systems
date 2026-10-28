'use client';

import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { io, type Socket } from 'socket.io-client';
import { ApiError, api, apiBase } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { EmptyState } from '@/components/empty-state';
import { ShipmentList, type ListShipment } from './shipment-list';
import { ShipmentDetail, type TrackData } from './shipment-detail';

// Master–detail shipments view: your sent shipments on the left, the
// selected one tracked live on the right. On small screens the list and the
// detail are separate pages (/shipments and /shipments/[id]).

// Survives client-side navigation between shipments so the list doesn't flash.
let listCache: ListShipment[] | null = null;

export function ShipmentsWorkspace({ selectedId }: { selectedId?: string }) {
  const { user, token, loading } = useRequireAuth();
  const [list, setList] = useState<ListShipment[] | null>(listCache);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(() => {
    if (!token) return;
    api<ListShipment[]>('/shipments', { token })
      .then((rows) => {
        listCache = rows;
        setList(rows);
      })
      .catch(() => setList((prev) => prev ?? []));
  }, [token]);

  useEffect(loadList, [loadList]);

  // Wide screens open the most relevant shipment when none is chosen.
  const activeId = selectedId ?? list?.find((s) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(s.status))?.id ?? list?.[0]?.id ?? null;

  const loadDetail = useCallback(() => {
    if (!token || !activeId) return;
    api<TrackData>(`/tracking/${activeId}`, { token })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this shipment'));
  }, [token, activeId]);

  useEffect(() => {
    setData(null);
    loadDetail();
  }, [loadDetail]);

  // Live updates: GPS pings append, custody/status changes reload.
  useEffect(() => {
    if (!token || !activeId) return;
    const socket: Socket = io(`${apiBase()}/tracking`, { transports: ['websocket'] });
    socket.emit('join', { shipmentId: activeId, token });
    socket.on('location', (ping: TrackData['pings'][number]) =>
      setData((prev) => (prev && prev.shipment.id === activeId ? { ...prev, pings: [...prev.pings, ping] } : prev))
    );
    socket.on('status', () => {
      loadDetail();
      loadList();
    });
    return () => {
      socket.disconnect();
    };
  }, [token, activeId, loadDetail, loadList]);

  if (!loading && !user) return null;

  const refresh = () => {
    loadDetail();
    loadList();
  };

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-4rem)] sm:-mx-6">
      <aside
        className={clsx(
          'w-full shrink-0 border-r border-border bg-card lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-[340px]',
          selectedId ? 'hidden' : 'block'
        )}
      >
        <ShipmentList shipments={list} selectedId={activeId} />
      </aside>

      <section className={clsx('min-w-0 flex-1 bg-card px-4 py-6 sm:px-8', !selectedId && 'hidden lg:block')}>
        {list !== null && list.length === 0 && !selectedId ? (
          <div className="mx-auto max-w-lg pt-10">
            <EmptyState
              art="parcel"
              title="Nothing on the move yet"
              body="When you send a package, you can follow every handoff, seal check and kilometre right here."
              cta={{ href: '/search', label: 'Send your first package' }}
              secondary={{ href: '/dashboard/couriers', label: 'Browse couriers' }}
            />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg pt-10">
            <EmptyState art="error" title="Can't show this shipment" body={error} cta={{ href: '/shipments', label: 'Back to shipments' }} />
          </div>
        ) : !data || !token || !user ? (
          <div className="space-y-5" aria-label="Loading shipment">
            <div className="h-12 w-64 animate-pulse rounded-xl bg-muted" />
            <div className="h-56 animate-pulse rounded-[22px] bg-muted" />
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl bg-muted" />
              <div className="h-72 animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
        ) : (
          <ShipmentDetail key={data.shipment.id} data={data} token={token} userId={user.id} onChanged={refresh} backHref={selectedId ? '/shipments' : undefined} />
        )}
      </section>
    </div>
  );
}
