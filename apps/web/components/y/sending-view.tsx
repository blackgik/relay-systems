'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { io, type Socket } from 'socket.io-client';
import { Plus } from 'lucide-react';
import { ApiError, api, apiBase } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { GROUPS, groupOf, type ShipmentGroup } from '@/lib/tracking';
import { Button } from '@/ui/elements';
import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/dashboard/widgets';
import { ShipmentDetail, type TrackData } from '@/components/shipments/shipment-detail';
import { SendingCard, type ListShipment } from './sending-card';
import { DetailPanel, Inbox } from './inbox';

type Row = ListShipment & { totalPrice?: number | null; currency?: string };
type Filter = ShipmentGroup | 'all';

const RANK: Record<ShipmentGroup, number> = { action: 0, moving: 1, pickup: 2, delivered: 3, closed: 4 };

// Survives switching tabs, so coming back to Sending doesn't flash empty.
let listCache: Row[] | null = null;

/** Sending: every package you send, the list on the left and the selected one tracked live on the right. */
export function SendingView() {
  const params = useParams<{ id?: string }>();
  const selectedId = params?.id ?? null;
  const { user, token, loading } = useRequireAuth();
  const [list, setList] = useState<Row[] | null>(listCache);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const loadList = useCallback(() => {
    if (!token) return;
    api<Row[]>('/shipments', { token })
      .then((rows) => {
        listCache = rows;
        setList(rows);
      })
      .catch(() => setList((prev) => prev ?? []));
  }, [token]);
  useEffect(loadList, [loadList]);

  const sorted = useMemo(
    () => (list ? [...list].sort((a, b) => RANK[groupOf(a.status)] - RANK[groupOf(b.status)] || b.createdAt.localeCompare(a.createdAt)) : null),
    [list]
  );
  const visible = useMemo(() => {
    if (!sorted) return null;
    const term = q.trim().toLowerCase().replace(/^@/, '');
    return sorted.filter(
      (s) =>
        (filter === 'all' || groupOf(s.status) === filter) &&
        (!term || [s.originCity, s.destCity, s.category, ...s.legs.map((l) => l.trip.carrier?.handle ?? '')].some((v) => v.toLowerCase().includes(term)))
    );
  }, [sorted, filter, q]);

  // Wide screens open the most relevant shipment when none is chosen.
  const activeId = selectedId ?? sorted?.find((s) => groupOf(s.status) !== 'closed')?.id ?? sorted?.[0]?.id ?? null;

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
    setData((prev) => (prev?.shipment.id === activeId ? prev : null));
    loadDetail();
  }, [loadDetail, activeId]);

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
    window.dispatchEvent(new Event('relay:requests-changed'));
  };

  const counts = (f: Filter) => (f === 'all' ? list?.length ?? 0 : list?.filter((s) => groupOf(s.status) === f).length ?? 0);
  const filters = [{ value: 'all' as Filter, label: 'All', count: counts('all') }, ...GROUPS.map((g) => ({ value: g.id as Filter, label: g.label, count: counts(g.id) }))].filter(
    (f) => f.value === 'all' || f.value === filter || f.count > 0
  );

  if (list !== null && list.length === 0) {
    return (
      <Card>
        <EmptyState
          art="parcel"
          title="Nothing on the move yet"
          body="When you send a package, you can follow every handoff, seal check and kilometre right here."
          cta={{ href: '/search', label: 'Send your first package' }}
        />
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <Inbox<Row, Filter>
        className={clsx(selectedId && 'hidden lg:block')}
        eyebrow="Needs you first"
        title="Your packages"
        filters={filters}
        filter={filter}
        onFilter={setFilter}
        search={q}
        onSearch={setQ}
        searchPlaceholder="City, item or @courier"
        items={visible}
        selectedId={activeId}
        hrefFor={(s) => `/deliveries/sending/${s.id}`}
        renderItem={(s, active) => <SendingCard s={s} active={active} />}
        empty={<EmptyState art="search" size="sm" title="Nothing matches" body={q ? `No package for “${q}”.` : 'No packages in this group.'} cta={{ onClick: () => { setFilter('all'); setQ(''); }, label: 'Show all' }} />}
        footer={<Button label="Send a new package" iconLeading={<Plus size={16} />} href="/search" />}
      />

      <Card bodyClassName="p-5 sm:p-6" className={clsx('min-h-[480px]', !selectedId && 'hidden lg:block')}>
        {error ? (
          <EmptyState art="error" title="Can't show this shipment" body={error} cta={{ href: '/deliveries/sending', label: 'Back to your packages' }} />
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
          <DetailPanel id={data.shipment.id}>
            <ShipmentDetail data={data} token={token} userId={user.id} onChanged={refresh} backHref={selectedId ? '/deliveries/sending' : undefined} />
          </DetailPanel>
        )}
      </Card>
    </div>
  );
}
