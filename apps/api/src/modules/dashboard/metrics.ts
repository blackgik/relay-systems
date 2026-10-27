// Pure dashboard maths, kept free of Prisma so it can be unit-tested.
// All money is in minor units (kobo / cents).

export type TripPhase = 'ACCEPTING' | 'DEPARTING_SOON' | 'IN_TRANSIT' | 'ARRIVED' | 'CANCELLED';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** Trip status stays OPEN until closed, so "started" is derived from the schedule. */
export function tripPhase(trip: { status: string; departAt: Date; arriveAt: Date }, now = new Date()): TripPhase {
  if (trip.status === 'CANCELLED') return 'CANCELLED';
  if (trip.status === 'COMPLETED' || trip.arriveAt <= now) return 'ARRIVED';
  if (trip.departAt <= now) return 'IN_TRANSIT';
  if (trip.departAt.getTime() - now.getTime() < DAY) return 'DEPARTING_SOON';
  return 'ACCEPTING';
}

/** 0–1 progress through the journey (0 before departure, 1 on arrival). */
export function tripProgress(trip: { departAt: Date; arriveAt: Date }, now = new Date()) {
  const span = trip.arriveAt.getTime() - trip.departAt.getTime();
  if (span <= 0) return now >= trip.arriveAt ? 1 : 0;
  return Math.min(1, Math.max(0, (now.getTime() - trip.departAt.getTime()) / span));
}

export interface WalletLine {
  amount: number;
  type: string;
  key: string;
  createdAt: Date;
}

export interface MonthPoint {
  month: string; // YYYY-MM
  earned: number;
  spent: number;
  net: number;
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Last `months` calendar months, oldest first, including the current one. */
export function monthBuckets(months: number, now = new Date()) {
  const out: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return out;
}

const isEarning = (l: WalletLine) => l.type === 'RELEASE_LEG' && l.amount > 0;
const isSpend = (l: WalletLine) => l.type === 'FUND_ESCROW' && l.amount < 0;
const isRefund = (l: WalletLine) => l.type === 'REFUND' && l.amount > 0;

/**
 * Profit & loss from the wallet ledger. Earned = courier payouts; spent =
 * escrow funded as a sender (fees + premiums); refunds offset spend.
 * Top-ups and withdrawals just move your own money, so they are excluded.
 */
export function profitAndLoss(lines: WalletLine[], months = 6, now = new Date()) {
  const earned = lines.filter(isEarning).reduce((s, l) => s + l.amount, 0);
  const spent = lines.filter(isSpend).reduce((s, l) => s - l.amount, 0);
  const refunds = lines.filter(isRefund).reduce((s, l) => s + l.amount, 0);

  const buckets = new Map(monthBuckets(months, now).map((m) => [m, { earned: 0, spent: 0 }]));
  for (const l of lines) {
    const b = buckets.get(monthKey(l.createdAt));
    if (!b) continue;
    if (isEarning(l)) b.earned += l.amount;
    else if (isSpend(l)) b.spent -= l.amount;
    else if (isRefund(l)) b.spent -= l.amount;
  }
  const series: MonthPoint[] = [...buckets].map(([month, v]) => ({ month, ...v, net: v.earned - v.spent }));

  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2];
  return {
    earned,
    spent: spent - refunds,
    refunds,
    net: earned - (spent - refunds),
    series,
    earnedChange: lastMonth ? change(thisMonth.earned, lastMonth.earned) : null,
  };
}

function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export interface ActiveLeg {
  fee: number;
  status: string;
}

export interface OpenTrip {
  capacityKg: number;
  remainingKg: number;
  pricePerKg: number;
}

/**
 * Forward-looking earnings.
 * - committed: fees on legs you've accepted but not been fully paid for.
 *   70% lands at handoff, so a HANDED_OFF leg only has 30% left to come.
 * - openCapacity: what the unbooked space on your open trips is worth if it all fills.
 * - estimate: committed + openCapacity scaled by your historical fill rate.
 */
export function projections(legs: ActiveLeg[], openTrips: OpenTrip[], historicalFill: number | null) {
  const committed = legs.reduce((s, l) => {
    if (['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY'].includes(l.status)) return s + l.fee;
    if (l.status === 'HANDED_OFF') return s + Math.round(l.fee * 0.3);
    return s;
  }, 0);
  const openCapacity = openTrips.reduce((s, t) => s + Math.round(t.remainingKg * t.pricePerKg), 0);
  const fillRate = historicalFill ?? 0.4;
  return {
    committed,
    openCapacity,
    fillRate,
    fillRateIsDefault: historicalFill === null,
    estimate: committed + Math.round(openCapacity * fillRate),
  };
}

/** Booked share of capacity across finished trips, or null with no history. */
export function historicalFillRate(trips: { capacityKg: number; remainingKg: number }[]) {
  const capacity = trips.reduce((s, t) => s + t.capacityKg, 0);
  if (capacity === 0) return null;
  return trips.reduce((s, t) => s + (t.capacityKg - t.remainingKg), 0) / capacity;
}

/** Counts per ISO week (Mon start) for the last `weeks` weeks, oldest first. */
export function weeklyCounts(dates: Date[], weeks = 8, now = new Date()) {
  const startOfWeek = (d: Date) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x.getTime();
  };
  const current = startOfWeek(now);
  const out = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(current - (weeks - 1 - i) * 7 * DAY).toISOString().slice(0, 10),
    count: 0,
  }));
  for (const d of dates) {
    const idx = weeks - 1 - Math.round((current - startOfWeek(d)) / (7 * DAY));
    if (idx >= 0 && idx < weeks) out[idx].count += 1;
  }
  return out;
}

/**
 * Ranking score for the Top 20: rating dominates, completed deliveries add
 * confidence (log-scaled so volume can't swamp quality), strikes subtract.
 */
export function courierScore(c: { rating: number; deliveries: number; strikes: number }) {
  return c.rating * 30 + Math.log2(1 + c.deliveries) * 4 - c.strikes * 15;
}
