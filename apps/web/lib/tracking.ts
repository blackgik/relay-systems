// Pure helpers for the shipments workspace: grouping, progress through the
// journey, and how long the package has spent in each stage. All derived
// from real data (shipment, legs, custody events) — nothing is estimated
// except the remaining time on a leg still in progress.

import { distanceKm } from './cities';

export interface TrackLeg {
  id: string;
  sequence: number;
  status: string;
  fee: number;
  currency: string;
  acceptDeadline: string;
  trip: {
    originCity: string;
    destCity: string;
    departAt: string;
    arriveAt: string;
    mode: string;
    flightNumber?: string | null;
    carrier?: { handle: string | null; kycTier: string; rating: number } | null;
  };
}

export interface TrackEvent {
  id: string;
  legId: string | null;
  type: 'PICKUP' | 'TRANSFER' | 'HUB_DROP' | 'DELIVERY' | string;
  sealId: string;
  photos: string[];
  lat: number | null;
  lng: number | null;
  occurredAt: string;
}

export type ShipmentGroup = 'action' | 'moving' | 'pickup' | 'delivered' | 'closed';

export const GROUPS: { id: ShipmentGroup; label: string }[] = [
  { id: 'action', label: 'Needs you' },
  { id: 'moving', label: 'On the way' },
  { id: 'pickup', label: 'Waiting for pickup' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'closed', label: 'Closed' },
];

export function groupOf(status: string): ShipmentGroup {
  if (['DRAFT', 'ROUTED', 'AWAITING_APPROVAL', 'APPROVED', 'REROUTING', 'DISPUTED'].includes(status)) return 'action';
  if (status === 'IN_TRANSIT') return 'moving';
  if (status === 'FUNDED') return 'pickup';
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 'delivered';
  return 'closed';
}

/** Short status line, as the courier list shows it ("ON THE WAY"). */
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ROUTED: 'Route chosen',
  AWAITING_APPROVAL: 'Awaiting courier',
  APPROVED: 'Ready to pay',
  REROUTING: 'Needs new route',
  FUNDED: 'Awaiting pickup',
  IN_TRANSIT: 'On the way',
  DELIVERED: 'Delivered',
  DISPUTED: 'In dispute',
  COMPLETED: 'Completed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

/** What the sender should do next, if anything. */
export function nextAction(status: string): string | null {
  switch (status) {
    case 'AWAITING_APPROVAL':
    case 'ROUTED':
      return 'Waiting for the courier to accept';
    case 'APPROVED':
      return 'Pay into escrow to start the journey';
    case 'REROUTING':
      return 'A courier dropped out — pick a new route';
    case 'FUNDED':
      return 'Hand the package to your first courier';
    case 'DELIVERED':
      return 'Check the package and confirm completion';
    case 'DISPUTED':
      return 'An arbiter is reviewing this shipment';
    default:
      return null;
  }
}

const HANDED = ['HANDED_OFF', 'SETTLED'];

/** 0–1 through the whole journey: finished legs plus time-based progress on the live one. */
export function journeyProgress(status: string, legs: TrackLeg[], now = Date.now()): number {
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 1;
  if (!legs.length) return 0;
  let done = 0;
  for (const leg of legs) {
    if (HANDED.includes(leg.status)) done += 1;
    else if (leg.status === 'IN_CUSTODY') {
      const start = new Date(leg.trip.departAt).getTime();
      const end = new Date(leg.trip.arriveAt).getTime();
      done += end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
    }
  }
  return Math.min(1, done / legs.length);
}

/** The leg the package is on (or about to be on). */
export function currentLeg(legs: TrackLeg[]): TrackLeg | null {
  return (
    legs.find((l) => l.status === 'IN_CUSTODY') ??
    legs.find((l) => !HANDED.includes(l.status)) ??
    legs[legs.length - 1] ??
    null
  );
}

export interface JourneyFacts {
  distanceKm: number | null;
  /** ms until the current leg is due to arrive; null when nothing is moving. */
  timeLeftMs: number | null;
}

export function journeyFacts(status: string, origin: string, dest: string, legs: TrackLeg[], now = Date.now()): JourneyFacts {
  const leg = currentLeg(legs);
  const moving = status === 'IN_TRANSIT' && leg?.status === 'IN_CUSTODY';
  const last = legs[legs.length - 1];
  return {
    distanceKm: distanceKm(origin, dest),
    timeLeftMs: moving && last ? Math.max(0, new Date(last.trip.arriveAt).getTime() - now) : null,
  };
}

export interface Stage {
  key: string;
  label: string;
  ms: number;
  /** true for time not yet spent (the rest of a leg in progress). */
  projected?: boolean;
  /** Fixed colour slot: 0 = waiting, n = leg n. Follows the stage, never its position. */
  colorIndex: number;
}

/**
 * Where the time went: waiting before the first pickup, then each leg from
 * the custody event that started it to the one that ended it. A leg still in
 * progress adds its remaining scheduled time as a projected stage.
 */
export function journeyStages(createdAt: string, legs: TrackLeg[], events: TrackEvent[], now = Date.now()): Stage[] {
  const sorted = [...events].sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
  const t = (iso: string) => new Date(iso).getTime();
  const stages: Stage[] = [];
  const firstPickup = sorted.find((e) => e.type === 'PICKUP');
  stages.push({ key: 'waiting', label: 'Before pickup', ms: Math.max(0, (firstPickup ? t(firstPickup.occurredAt) : now) - t(createdAt)), colorIndex: 0 });

  // Custody events in order mark leg boundaries: each one starts the next leg.
  const marks = sorted.filter((e) => ['PICKUP', 'TRANSFER', 'HUB_DROP', 'DELIVERY'].includes(e.type));
  legs.forEach((leg, i) => {
    const start = marks[i];
    if (!start || start.type === 'DELIVERY') return;
    const end = marks[i + 1];
    const label = `Leg ${leg.sequence + 1} · ${leg.trip.originCity} → ${leg.trip.destCity}`;
    if (end) {
      stages.push({ key: leg.id, label, ms: Math.max(0, t(end.occurredAt) - t(start.occurredAt)), colorIndex: leg.sequence + 1 });
    } else {
      stages.push({ key: leg.id, label, ms: Math.max(0, now - t(start.occurredAt)), colorIndex: leg.sequence + 1 });
      const remaining = t(leg.trip.arriveAt) - now;
      if (remaining > 0)
        stages.push({ key: `${leg.id}:left`, label: `Leg ${leg.sequence + 1} · still to go`, ms: remaining, projected: true, colorIndex: leg.sequence + 1 });
    }
  });
  return stages.filter((s) => s.ms >= 60_000);
}

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} hr ${mins % 60} min`;
  const days = Math.floor(hrs / 24);
  return `${days} d ${hrs % 24} hr`;
}

/** Display ID like the concept's "ID: 107-591": stable, short, from the shipment id. */
export function shortId(id: string): string {
  const tail = id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
  return `${tail.slice(0, 3)}-${tail.slice(3)}`;
}
