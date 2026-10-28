import type { BoardItem } from './dashboard-types';
import { estimateFee, filterCarriers, journeyBucket, journeyHours, notBookableReason } from './carrier-filters';

function trip(over: Partial<BoardItem>): BoardItem {
  return {
    tripId: 't1',
    handle: 'amber-otter-14',
    tier: 'T1',
    rating: 4.8,
    verified: true,
    travelVerified: true,
    isMine: false,
    mode: 'ROAD',
    flightNumber: null,
    originCity: 'Awka',
    destCity: 'Abuja',
    departAt: '2099-01-01T08:00:00.000Z',
    arriveAt: '2099-01-01T16:00:00.000Z',
    phase: 'ACCEPTING',
    progress: 0,
    capacityKg: 30,
    remainingKg: 30,
    bookedKg: 0,
    packagesBooked: 0,
    packagesOnHand: 0,
    kgOnHand: 0,
    pricePerKg: 200_000,
    currency: 'NGN',
    categories: ['fabric'],
    international: false,
    requestBy: '2098-12-30T08:00:00.000Z',
    bookable: true,
    ...over,
  };
}

const list = [
  trip({}),
  trip({
    tripId: 't2',
    handle: 'north-falcon-07',
    rating: 4.9,
    mode: 'AIR',
    flightNumber: 'RL501',
    originCity: 'Abuja',
    destCity: 'Houston',
    departAt: '2099-01-03T08:00:00.000Z',
    arriveAt: '2099-01-03T22:00:00.000Z',
    pricePerKg: 900_000,
    international: true,
  }),
  trip({ tripId: 't3', handle: 'steady-kudu-31', phase: 'IN_TRANSIT', remainingKg: 5, bookable: false }),
  trip({ tripId: 't4', handle: 'full-one', remainingKg: 0, bookable: false }),
  // Departs tomorrow: still "accepting" by phase, but the 48h request window has shut.
  trip({ tripId: 't5', handle: 'late-one', phase: 'DEPARTING_SOON', requestBy: '2000-01-01T00:00:00.000Z', bookable: false }),
];

describe('filterCarriers', () => {
  it('keeps only carriers currently accepting with space by default', () => {
    expect(filterCarriers(list, {}).map((t) => t.tripId)).toEqual(['t1', 't2']);
  });

  it('searches a courier name with or without @, case-insensitively', () => {
    expect(filterCarriers(list, { query: '@North-Falcon' }).map((t) => t.tripId)).toEqual(['t2']);
    expect(filterCarriers(list, { query: 'amber' }).map((t) => t.tripId)).toEqual(['t1']);
  });

  it('filters by destination and origin', () => {
    expect(filterCarriers(list, { destination: 'Houston' }).map((t) => t.tripId)).toEqual(['t2']);
    expect(filterCarriers(list, { origin: 'Awka', destination: 'Abuja' })).toHaveLength(1);
    expect(filterCarriers(list, { destination: 'Lagos' })).toHaveLength(0);
  });

  it('filters by journey length (distance proxy: trip duration)', () => {
    expect(journeyHours(list[0])).toBe(8);
    expect(journeyBucket(list[0])).toBe('medium');
    expect(journeyBucket(list[1])).toBe('long');
    expect(filterCarriers(list, { journey: 'long' }).map((t) => t.tripId)).toEqual(['t2']);
    expect(filterCarriers(list, { journey: 'short' })).toHaveLength(0);
  });

  it('sorts by price per kg, rating and soonest departure', () => {
    expect(filterCarriers(list, { sort: 'priceLow' })[0].tripId).toBe('t1');
    expect(filterCarriers(list, { sort: 'rating' })[0].tripId).toBe('t2');
    expect(filterCarriers(list, { sort: 'departSoon' })[0].tripId).toBe('t1');
  });
});

describe('notBookableReason', () => {
  it('explains why a trip cannot take a request', () => {
    expect(notBookableReason(list[0])).toBeNull();
    expect(notBookableReason(list[2])).toBe('Already travelling');
    expect(notBookableReason(list[3])).toBe('Bag is full');
    expect(notBookableReason(list[4])).toBe('Requests closed');
  });
});

describe('estimateFee', () => {
  it('matches the API fee: ceil(pricePerKg x weight) in minor units', () => {
    expect(estimateFee(200_000, 5)).toBe(1_000_000);
    expect(estimateFee(200_000, 2.5)).toBe(500_000);
    expect(estimateFee(100, 0)).toBe(0);
    expect(estimateFee(100, -1)).toBe(0);
  });
});
