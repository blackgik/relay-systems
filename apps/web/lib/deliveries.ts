// Pure rules behind Deliveries: what's waiting on you on each side, and the
// order requests and jobs are listed in.
import type { Notification } from './dashboard-types';
import { type RequestFilter, requestBucket } from './trip-form';

/** What's waiting on you, per side of Deliveries (from the shell's notifications). */
export function deliveryCounts(notes: Pick<Notification, 'kind' | 'actionable'>[]) {
  return {
    carrying: notes.filter((n) => n.kind === 'REQUEST' && n.actionable !== false).length,
    sending: notes.filter((n) => n.kind === 'SHIPMENT' && n.actionable).length,
  };
}

const RANK: Record<RequestFilter, number> = { waiting: 0, active: 1, past: 2, declined: 3 };

export interface OrderableLeg {
  status: string;
  acceptDeadline: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  trip: { departAt: string };
}

/** Waiting first (soonest deadline), then in progress, past and declined, each latest decision first. */
export function orderRequests<T extends OrderableLeg>(legs: T[]): T[] {
  const decided = (l: T) => l.rejectedAt ?? l.acceptedAt ?? l.trip.departAt;
  return [...legs].sort((a, b) => {
    const ra = RANK[requestBucket(a)];
    const rb = RANK[requestBucket(b)];
    if (ra !== rb) return ra - rb;
    return ra === 0 ? a.acceptDeadline.localeCompare(b.acceptDeadline) : decided(b).localeCompare(decided(a));
  });
}
