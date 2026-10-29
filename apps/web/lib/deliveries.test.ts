import { deliveryCounts, orderRequests } from './deliveries';

describe('deliveryCounts', () => {
  it('counts requests to answer as Carrying and shipments needing you as Sending', () => {
    expect(
      deliveryCounts([
        { kind: 'REQUEST', actionable: true },
        { kind: 'REQUEST' },
        { kind: 'SHIPMENT', actionable: true },
        { kind: 'SHIPMENT', actionable: false },
        { kind: 'PAYOUT' },
      ])
    ).toEqual({ carrying: 2, sending: 1 });
  });
});

describe('orderRequests', () => {
  const leg = (id: string, status: string, o: Partial<{ acceptDeadline: string; acceptedAt: string | null; rejectedAt: string | null; departAt: string }> = {}) => ({
    id,
    status,
    acceptDeadline: o.acceptDeadline ?? '2026-11-01T00:00:00Z',
    acceptedAt: o.acceptedAt ?? null,
    rejectedAt: o.rejectedAt ?? null,
    trip: { departAt: o.departAt ?? '2026-11-03T00:00:00Z' },
  });

  it('lists the most urgent waiting request first, then jobs, past and declined', () => {
    const out = orderRequests([
      leg('declined', 'REJECTED', { rejectedAt: '2026-10-29T10:00:00Z' }),
      leg('past-old', 'SETTLED', { acceptedAt: '2026-09-01T00:00:00Z' }),
      leg('waiting-later', 'PROPOSED', { acceptDeadline: '2026-11-02T00:00:00Z' }),
      leg('job', 'IN_CUSTODY', { acceptedAt: '2026-10-20T00:00:00Z' }),
      leg('waiting-soon', 'PROPOSED', { acceptDeadline: '2026-10-30T00:00:00Z' }),
      leg('past-new', 'SETTLED', { acceptedAt: '2026-10-01T00:00:00Z' }),
    ]).map((l) => l.id);
    expect(out).toEqual(['waiting-soon', 'waiting-later', 'job', 'past-new', 'past-old', 'declined']);
  });
});
