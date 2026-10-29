import type { BoardItem } from './dashboard-types';

// Pure helpers for the "Send a package" carrier browser. Trips carry no
// coordinates, so "distance" is shown honestly as journey length (hours on
// the road/in the air, derived from depart/arrive), never invented kilometres.

export type JourneyBucket = 'short' | 'medium' | 'long';
export type CarrierSort = 'departSoon' | 'priceLow' | 'priceHigh' | 'rating' | 'journeyShort';

export interface CarrierFilters {
  /** Courier name search — matches the public @handle, with or without "@". */
  query?: string;
  origin?: string; // 'All origins' / undefined = any
  destination?: string; // 'All destinations' / undefined = any
  journey?: JourneyBucket | 'all';
  sort?: CarrierSort;
  /** Only trips that can still take a parcel right now. Default true. */
  acceptingOnly?: boolean;
}

export function journeyHours(trip: Pick<BoardItem, 'departAt' | 'arriveAt'>): number {
  const ms = new Date(trip.arriveAt).getTime() - new Date(trip.departAt).getTime();
  return ms > 0 ? ms / 3600_000 : 0;
}

export function journeyBucket(trip: Pick<BoardItem, 'departAt' | 'arriveAt'>): JourneyBucket {
  const h = journeyHours(trip);
  if (h <= 6) return 'short';
  if (h <= 12) return 'medium';
  return 'long';
}

export const JOURNEY_LABEL: Record<JourneyBucket, string> = {
  short: 'Short (≤ 6h)',
  medium: 'Medium (6–12h)',
  long: 'Long (12h+)',
};

/**
 * Can a request to this trip succeed right now? The API decides (open, has
 * space, and before the 48h answer window closes); this just reads it.
 */
export function isAccepting(trip: BoardItem): boolean {
  return trip.bookable;
}

/** Why a trip can't take a request, for the card's disabled button. */
export function notBookableReason(trip: BoardItem, now = Date.now()): string | null {
  if (trip.bookable) return null;
  if (trip.remainingKg <= 0) return 'Bag is full';
  if (trip.phase === 'IN_TRANSIT' || trip.phase === 'ARRIVED') return 'Already travelling';
  if (new Date(trip.requestBy).getTime() <= now) return 'Requests closed';
  return 'Not accepting';
}

export function filterCarriers(trips: BoardItem[], filters: CarrierFilters = {}): BoardItem[] {
  const acceptingOnly = filters.acceptingOnly !== false;
  const q = (filters.query ?? '').trim().replace(/^@/, '').toLowerCase();
  const out = trips.filter((t) => {
    if (acceptingOnly && !isAccepting(t)) return false;
    // One box searches the courier's username and the cities on the trip.
    if (q && ![t.handle ?? '', t.originCity, t.destCity].some((v) => v.toLowerCase().includes(q))) return false;
    if (filters.origin && filters.origin !== 'all' && t.originCity !== filters.origin) return false;
    if (filters.destination && filters.destination !== 'all' && t.destCity !== filters.destination)
      return false;
    if (filters.journey && filters.journey !== 'all' && journeyBucket(t) !== filters.journey)
      return false;
    return true;
  });
  const sort = filters.sort ?? 'departSoon';
  return [...out].sort((a, b) => {
    switch (sort) {
      case 'priceLow':
        return a.pricePerKg - b.pricePerKg;
      case 'priceHigh':
        return b.pricePerKg - a.pricePerKg;
      case 'rating':
        return b.rating - a.rating;
      case 'journeyShort':
        return journeyHours(a) - journeyHours(b);
      default:
        return new Date(a.departAt).getTime() - new Date(b.departAt).getTime();
    }
  });
}

export function distinctCities(trips: BoardItem[], key: 'originCity' | 'destCity'): string[] {
  return [...new Set(trips.map((t) => t[key]))].sort((a, b) => a.localeCompare(b));
}

/** Same formula the API uses for a leg fee: ceil(pricePerKg × weightKg), minor units. */
export function estimateFee(pricePerKg: number, weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  return Math.ceil(pricePerKg * weightKg);
}
