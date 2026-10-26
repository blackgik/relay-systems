import { Injectable } from '@nestjs/common';
import { KycTier } from '@prisma/client';
import {
  ACCEPT_DEADLINE_HOURS,
  MAX_LEGS,
  TRANSFER_BUFFER_HOURS,
} from '@relay/shared';

export interface TripCandidate {
  id: string;
  carrierId: string;
  carrierTier: KycTier;
  originCity: string;
  destCity: string;
  departAt: Date;
  arriveAt: Date;
  remainingKg: number;
  pricePerKg: number;
  currency: string;
  categories: string[];
  international: boolean;
}

export interface RouteSearch {
  originCity: string;
  destCity: string;
  readyAt: Date;
  weightKg: number;
  category: string;
  currency: string;
  senderTier: KycTier;
  maxLegs?: number;
  limit?: number;
}

export interface FoundRouteLeg {
  trip: TripCandidate;
  fee: number;
}

export interface FoundRoute {
  legs: FoundRouteLeg[];
  totalPrice: number;
  currency: string;
  departAt: Date;
  arriveAt: Date;
}

const HOUR_MS = 3600_000;
const TRANSFER_BUFFER_MS = TRANSFER_BUFFER_HOURS * HOUR_MS;
const DEADLINE_MS = ACCEPT_DEADLINE_HOURS * HOUR_MS;
// Pruning slack: keep alternatives arriving up to 1h after the best time seen,
// so cheaper routes are not pruned by a slightly faster one.
const ROUTE_SLACK_MS = HOUR_MS;

export function legFee(trip: TripCandidate, weightKg: number): number {
  return Math.ceil(trip.pricePerKg * weightKg);
}

interface SearchState {
  city: string;
  time: number;
  legs: TripCandidate[];
  cost: number;
}

// Minimal binary min-heap ordered by (arrival time, cost).
class StateHeap {
  private items: SearchState[] = [];

  get size() {
    return this.items.length;
  }

  push(state: SearchState) {
    this.items.push(state);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.less(this.items[i], this.items[parent])) {
        [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
        i = parent;
      } else break;
    }
  }

  pop(): SearchState {
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      this.items[0] = last;
      this.sink(0);
    }
    return top;
  }

  private sink(i: number) {
    for (;;) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.items.length && this.less(this.items[left], this.items[smallest])) {
        smallest = left;
      }
      if (right < this.items.length && this.less(this.items[right], this.items[smallest])) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }

  private less(a: SearchState, b: SearchState) {
    return a.time !== b.time ? a.time < b.time : a.cost < b.cost;
  }
}

// Earliest-arrival search over the time-dependent trip graph (spec section 10).
export function findRoutes(trips: TripCandidate[], search: RouteSearch): FoundRoute[] {
  if (search.originCity === search.destCity) return [];
  const maxLegs = search.maxLegs ?? MAX_LEGS;
  const limit = search.limit ?? 5;
  const now = search.readyAt.getTime();

  const byOrigin = new Map<string, TripCandidate[]>();
  for (const trip of trips) {
    if (trip.remainingKg < search.weightKg) continue;
    if (!trip.categories.includes(search.category)) continue;
    if (trip.currency !== search.currency) continue;
    // Request window closes 48h before departure.
    if (trip.departAt.getTime() - DEADLINE_MS < now) continue;
    // International legs need Tier 2 on both sides.
    if (trip.international && (search.senderTier !== 'T2' || trip.carrierTier !== 'T2')) {
      continue;
    }
    const list = byOrigin.get(trip.originCity) ?? [];
    list.push(trip);
    byOrigin.set(trip.originCity, list);
  }

  const heap = new StateHeap();
  heap.push({ city: search.originCity, time: now, legs: [], cost: 0 });
  const bestArrival = new Map<string, number>();
  const results: FoundRoute[] = [];

  while (heap.size && results.length < limit) {
    const state = heap.pop();
    if (state.city === search.destCity && state.legs.length > 0) {
      const legs = state.legs.map((trip) => ({ trip, fee: legFee(trip, search.weightKg) }));
      results.push({
        legs,
        totalPrice: legs.reduce((sum, leg) => sum + leg.fee, 0),
        currency: search.currency,
        departAt: state.legs[0].departAt,
        arriveAt: new Date(state.time),
      });
      continue;
    }
    if (state.legs.length === maxLegs) continue;

    const minDepart =
      state.legs.length === 0 ? state.time : state.time + TRANSFER_BUFFER_MS;
    const used = new Set(state.legs.map((leg) => leg.id));
    for (const trip of byOrigin.get(state.city) ?? []) {
      if (used.has(trip.id)) continue;
      if (trip.departAt.getTime() < minDepart) continue;
      const arrival = trip.arriveAt.getTime();
      const key = `${trip.destCity}:${state.legs.length + 1}`;
      if ((bestArrival.get(key) ?? Infinity) < arrival - ROUTE_SLACK_MS) continue;
      bestArrival.set(key, Math.min(bestArrival.get(key) ?? Infinity, arrival));
      heap.push({
        city: trip.destCity,
        time: arrival,
        legs: [...state.legs, trip],
        cost: state.cost + legFee(trip, search.weightKg),
      });
    }
  }

  results.sort(
    (a, b) =>
      a.arriveAt.getTime() - b.arriveAt.getTime() ||
      a.totalPrice - b.totalPrice ||
      a.legs.length - b.legs.length
  );
  return results;
}

@Injectable()
export class RoutingService {
  search(trips: TripCandidate[], search: RouteSearch): FoundRoute[] {
    return findRoutes(trips, search);
  }
}
