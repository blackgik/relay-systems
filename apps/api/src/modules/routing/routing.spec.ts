import { KycTier } from '@prisma/client';
import { findRoutes, RouteSearch, TripCandidate } from './routing.service';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-11-01T08:00:00Z').getTime();

let seq = 0;
function trip(overrides: Partial<TripCandidate> = {}): TripCandidate {
  seq += 1;
  return {
    id: `trip_${seq}`,
    carrierId: `carrier_${seq}`,
    carrierTier: 'T1' as KycTier,
    originCity: 'Awka',
    destCity: 'Abuja',
    departAt: new Date(NOW + 5 * DAY),
    arriveAt: new Date(NOW + 5 * DAY + 8 * HOUR),
    remainingKg: 20,
    pricePerKg: 1000,
    currency: 'NGN',
    categories: ['fabric'],
    international: false,
    ...overrides,
  };
}

function search(overrides: Partial<RouteSearch> = {}): RouteSearch {
  return {
    originCity: 'Awka',
    destCity: 'Abuja',
    readyAt: new Date(NOW),
    weightKg: 5,
    category: 'fabric',
    currency: 'NGN',
    senderTier: 'T1' as KycTier,
    ...overrides,
  };
}

describe('findRoutes', () => {
  it('returns a direct trip when one covers the route', () => {
    const direct = trip();
    const routes = findRoutes([direct], search());
    expect(routes).toHaveLength(1);
    expect(routes[0].legs).toHaveLength(1);
    expect(routes[0].legs[0].trip.id).toBe(direct.id);
    expect(routes[0].totalPrice).toBe(5000);
    expect(routes[0].currency).toBe('NGN');
  });

  it('chains two legs across a transfer city', () => {
    const first = trip({ destCity: 'Abuja', arriveAt: new Date(NOW + 5 * DAY + 8 * HOUR) });
    const second = trip({
      originCity: 'Abuja',
      destCity: 'Houston',
      departAt: new Date(NOW + 6 * DAY + 8 * HOUR), // 24h after arrival
      arriveAt: new Date(NOW + 7 * DAY),
      international: true,
      carrierTier: 'T2' as KycTier,
    });
    const routes = findRoutes(
      [first, second],
      search({ destCity: 'Houston', senderTier: 'T2' as KycTier })
    );
    expect(routes).toHaveLength(1);
    expect(routes[0].legs.map((l) => l.trip.id)).toEqual([first.id, second.id]);
  });

  it('sorts by earliest arrival, then price', () => {
    const slow = trip({ arriveAt: new Date(NOW + 6 * DAY), pricePerKg: 100 });
    const fast = trip({ arriveAt: new Date(NOW + 5 * DAY + 2 * HOUR), pricePerKg: 9000 });
    const routes = findRoutes([slow, fast], search());
    expect(routes.map((r) => r.legs[0].trip.id)).toEqual([fast.id, slow.id]);
  });

  it('excludes trips whose 48h request window has closed', () => {
    const late = trip({ departAt: new Date(NOW + 24 * HOUR) }); // < 48h out
    expect(findRoutes([late], search())).toHaveLength(0);
  });

  it('excludes trips without capacity, category, or currency match', () => {
    const heavy = trip({ remainingKg: 2 });
    const wrongCat = trip({ categories: ['documents'] });
    const wrongCcy = trip({ currency: 'USD' });
    expect(findRoutes([heavy, wrongCat, wrongCcy], search())).toHaveLength(0);
  });

  it('enforces the 12h transfer buffer between legs', () => {
    const first = trip({ arriveAt: new Date(NOW + 5 * DAY + 8 * HOUR) });
    const tight = trip({
      originCity: 'Abuja',
      destCity: 'Houston',
      departAt: new Date(NOW + 5 * DAY + 8 * HOUR + 6 * HOUR), // 6h gap
      arriveAt: new Date(NOW + 7 * DAY),
    });
    const roomy = trip({
      originCity: 'Abuja',
      destCity: 'Houston',
      departAt: new Date(NOW + 5 * DAY + 8 * HOUR + 12 * HOUR), // exactly 12h
      arriveAt: new Date(NOW + 7 * DAY),
    });
    const routes = findRoutes([first, tight, roomy], search({ destCity: 'Houston' }));
    expect(routes).toHaveLength(1);
    expect(routes[0].legs[1].trip.id).toBe(roomy.id);
  });

  it('requires Tier 2 on both sides for international legs', () => {
    const intl = trip({
      destCity: 'Houston',
      international: true,
      carrierTier: 'T2' as KycTier,
    });
    expect(findRoutes([intl], search({ destCity: 'Houston' }))).toHaveLength(0); // sender T1
    expect(
      findRoutes([intl], search({ destCity: 'Houston', senderTier: 'T2' as KycTier }))
    ).toHaveLength(1);
    const weakCarrier = trip({
      destCity: 'Houston',
      international: true,
      carrierTier: 'T1' as KycTier,
    });
    expect(
      findRoutes([weakCarrier], search({ destCity: 'Houston', senderTier: 'T2' as KycTier }))
    ).toHaveLength(0);
  });

  it('respects maxLegs and result limit', () => {
    const a = trip({ destCity: 'B' });
    const b = trip({ originCity: 'B', destCity: 'C', departAt: new Date(NOW + 7 * DAY), arriveAt: new Date(NOW + 8 * DAY) });
    const c = trip({ originCity: 'C', destCity: 'D', departAt: new Date(NOW + 9 * DAY), arriveAt: new Date(NOW + 10 * DAY) });
    const s = search({ originCity: 'Awka', destCity: 'D' });
    expect(findRoutes([a, b, c], { ...s, maxLegs: 2 })).toHaveLength(0);
    expect(findRoutes([a, b, c], { ...s, maxLegs: 3 })).toHaveLength(1);
    const dupes = [trip(), trip(), trip(), trip()];
    expect(findRoutes(dupes, { ...search(), limit: 2 })).toHaveLength(2);
  });

  it('never reuses the same trip twice in one route', () => {
    const out = trip({ destCity: 'B' });
    const back = trip({
      originCity: 'B',
      destCity: 'Awka',
      departAt: new Date(NOW + 7 * DAY),
      arriveAt: new Date(NOW + 8 * DAY),
    });
    // Without a guard this yields [out, back, out]; with it, only [out].
    const routes = findRoutes(
      [out, back],
      search({ originCity: 'Awka', destCity: 'B', maxLegs: 3 })
    );
    expect(routes).toHaveLength(1);
    expect(routes[0].legs.map((l) => l.trip.id)).toEqual([out.id]);
  });

  it('returns nothing when origin equals destination', () => {
    expect(findRoutes([trip()], search({ destCity: 'Awka' }))).toHaveLength(0);
  });
});
