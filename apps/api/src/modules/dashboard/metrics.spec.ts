import {
  courierScore,
  historicalFillRate,
  profitAndLoss,
  projections,
  tripPhase,
  tripProgress,
  weeklyCounts,
} from './metrics';

const now = new Date('2026-10-28T12:00:00Z');
const at = (iso: string) => new Date(iso);

describe('tripPhase', () => {
  const trip = (depart: string, arrive: string, status = 'OPEN') => ({ status, departAt: at(depart), arriveAt: at(arrive) });

  it('derives the phase from the schedule', () => {
    expect(tripPhase(trip('2026-11-02T08:00Z', '2026-11-02T16:00Z'), now)).toBe('ACCEPTING');
    expect(tripPhase(trip('2026-10-28T20:00Z', '2026-10-29T04:00Z'), now)).toBe('DEPARTING_SOON');
    expect(tripPhase(trip('2026-10-28T08:00Z', '2026-10-28T16:00Z'), now)).toBe('IN_TRANSIT');
    expect(tripPhase(trip('2026-10-27T08:00Z', '2026-10-27T16:00Z'), now)).toBe('ARRIVED');
    expect(tripPhase(trip('2026-11-02T08:00Z', '2026-11-02T16:00Z', 'CANCELLED'), now)).toBe('CANCELLED');
  });

  it('reports journey progress', () => {
    expect(tripProgress({ departAt: at('2026-10-28T08:00Z'), arriveAt: at('2026-10-28T16:00Z') }, now)).toBe(0.5);
  });
});

describe('profitAndLoss', () => {
  const lines = [
    { type: 'RELEASE_LEG', amount: 700_000, key: 'release:l1:partial', createdAt: at('2026-10-05T10:00Z') },
    { type: 'RELEASE_LEG', amount: 300_000, key: 'release:l1:final', createdAt: at('2026-10-06T10:00Z') },
    { type: 'FUND_ESCROW', amount: -400_000, key: 'fund:s1', createdAt: at('2026-09-10T10:00Z') },
    { type: 'REFUND', amount: 100_000, key: 'refund:s1', createdAt: at('2026-09-12T10:00Z') },
    { type: 'TOPUP', amount: 5_000_000, key: 'topup', createdAt: at('2026-09-01T10:00Z') },
  ];

  it('nets payouts against spend and ignores top-ups', () => {
    const pl = profitAndLoss(lines, 6, now);
    expect(pl.earned).toBe(1_000_000);
    expect(pl.spent).toBe(300_000);
    expect(pl.net).toBe(700_000);
  });

  it('buckets by month, oldest first', () => {
    const { series } = profitAndLoss(lines, 6, now);
    expect(series.map((s) => s.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(series[4]).toMatchObject({ earned: 0, spent: 300_000, net: -300_000 });
    expect(series[5]).toMatchObject({ earned: 1_000_000, spent: 0 });
  });
});

describe('projections', () => {
  it('counts the 30% still owed on handed-off legs', () => {
    const p = projections(
      [
        { fee: 1_000_000, status: 'ACCEPTED' },
        { fee: 1_000_000, status: 'HANDED_OFF' },
        { fee: 1_000_000, status: 'SETTLED' },
      ],
      [{ capacityKg: 10, remainingKg: 4, pricePerKg: 100_000 }],
      0.5
    );
    expect(p.committed).toBe(1_300_000);
    expect(p.openCapacity).toBe(400_000);
    expect(p.estimate).toBe(1_500_000);
  });

  it('falls back to a default fill rate without history', () => {
    expect(historicalFillRate([])).toBeNull();
    expect(projections([], [], null)).toMatchObject({ fillRate: 0.4, fillRateIsDefault: true });
    expect(historicalFillRate([{ capacityKg: 10, remainingKg: 4 }])).toBeCloseTo(0.6);
  });
});

describe('weeklyCounts', () => {
  it('bins dates into Monday-start weeks', () => {
    const weeks = weeklyCounts([at('2026-10-27T09:00Z'), at('2026-10-26T09:00Z'), at('2026-10-20T09:00Z')], 3, now);
    expect(weeks.map((w) => w.count)).toEqual([0, 1, 2]);
    expect(weeks[2].weekStart).toBe('2026-10-26');
  });
});

describe('courierScore', () => {
  it('prefers quality over raw volume and punishes strikes', () => {
    expect(courierScore({ rating: 4.9, deliveries: 10, strikes: 0 })).toBeGreaterThan(
      courierScore({ rating: 4.2, deliveries: 200, strikes: 0 })
    );
    expect(courierScore({ rating: 4.9, deliveries: 10, strikes: 1 })).toBeLessThan(
      courierScore({ rating: 4.9, deliveries: 10, strikes: 0 })
    );
  });
});
