// Pure rules for the interactive trip form and the My Trips journey tracker.

export const CITY_COUNTRY: Record<string, { country: string; currency: string }> = {
  Abuja: { country: 'Nigeria', currency: 'NGN' },
  Awka: { country: 'Nigeria', currency: 'NGN' },
  Enugu: { country: 'Nigeria', currency: 'NGN' },
  Ibadan: { country: 'Nigeria', currency: 'NGN' },
  Kano: { country: 'Nigeria', currency: 'NGN' },
  Lagos: { country: 'Nigeria', currency: 'NGN' },
  Onitsha: { country: 'Nigeria', currency: 'NGN' },
  'Port Harcourt': { country: 'Nigeria', currency: 'NGN' },
  Accra: { country: 'Ghana', currency: 'GHS' },
  Houston: { country: 'United States', currency: 'USD' },
  London: { country: 'United Kingdom', currency: 'GBP' },
};

export function modeReferenceLabel(mode: string): { label: string; placeholder: string } {
  if (mode === 'AIR') return { label: 'Flight number', placeholder: 'e.g. RL501' };
  if (mode === 'RAIL') return { label: 'Train ticket number', placeholder: 'e.g. TR-8841' };
  return { label: 'Bus / transport number', placeholder: 'e.g. BUS-12 or plate no.' };
}

export interface CurrencyRule {
  /** true/false when both cities are known, null when the carrier must decide. */
  international: boolean | null;
  /** Currency the price is locked to on a local trip, else null. */
  locked: string | null;
  country: string | null;
  choices: string[];
}

/**
 * Local trip (same country): charge in that country's currency — Naira for a
 * Nigerian local trip. International: the carrier picks, USD first.
 */
export function currencyRule(originCity: string, destCity: string): CurrencyRule {
  const from = CITY_COUNTRY[originCity.trim()];
  const to = CITY_COUNTRY[destCity.trim()];
  if (from && to) {
    if (from.country === to.country) {
      return { international: false, locked: from.currency, country: from.country, choices: [from.currency] };
    }
    return { international: true, locked: null, country: from.country, choices: ['USD', from.currency, to.currency] };
  }
  return { international: null, locked: null, country: from?.country ?? null, choices: ['NGN', 'USD'] };
}

/** Preset decline reasons; "Other" unlocks a free-text reason. */
export const REJECTION_REASONS = [
  'No space left in my bag',
  'Item is on my cannot-carry list',
  'Too heavy for me on this trip',
  'The timing no longer works',
  'My route has changed',
  'Other',
] as const;

/** The reason actually sent: the preset, or the custom text for "Other", plus an optional note. */
export function resolveRejectionReason(preset: string, custom: string, note = ''): string {
  const base = preset === 'Other' ? custom.trim() : preset.trim();
  const extra = note.trim();
  const out = extra && preset !== 'Other' ? `${base} — ${extra}` : base;
  return out.slice(0, 300);
}

export const JOURNEY_STAGES = [
  { id: 'NOT_STARTED', label: 'Not started', action: 'Start trip' },
  { id: 'STARTED', label: 'Trip started', action: 'Mark almost there' },
  { id: 'ALMOST_THERE', label: 'Almost there', action: 'Mark arrived' },
  { id: 'ARRIVED', label: 'Arrived', action: 'Mark awaiting pickup' },
  { id: 'AWAITING_PICKUP', label: 'Awaiting delivery pickup', action: 'Mark package delivered' },
  { id: 'DELIVERED', label: 'Package delivered', action: '' },
] as const;

export type JourneyStageId = (typeof JOURNEY_STAGES)[number]['id'];

export function journeyStageIndex(stage: string | undefined | null): number {
  const i = JOURNEY_STAGES.findIndex((s) => s.id === stage);
  return i < 0 ? 0 : i;
}

export function nextJourneyStage(stage: string | undefined | null) {
  const i = journeyStageIndex(stage);
  return i < JOURNEY_STAGES.length - 1 ? JOURNEY_STAGES[i + 1] : null;
}

export type TripFilter = 'all' | 'upcoming' | 'road' | 'past';

/** Where a carrier's own trip sits on the My Trips list. */
export function tripBucket(
  trip: { status: string; journeyStage?: string | null; departAt: string; arriveAt: string },
  now = Date.now()
): Exclude<TripFilter, 'all'> {
  const stage = journeyStageIndex(trip.journeyStage);
  if (trip.status === 'CANCELLED' || trip.status === 'COMPLETED' || stage === JOURNEY_STAGES.length - 1) return 'past';
  if (stage > 0) return 'road';
  const depart = new Date(trip.departAt).getTime();
  const arrive = new Date(trip.arriveAt).getTime();
  if (arrive < now) return 'past';
  return depart <= now ? 'road' : 'upcoming';
}

/** Sum money per currency: Naira and dollar trips never get added together. */
export function totalsByCurrency<T>(items: T[], amount: (t: T) => number, currency: (t: T) => string) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(currency(item), (totals.get(currency(item)) ?? 0) + amount(item));
  return [...totals.entries()].filter(([, v]) => v > 0).map(([cur, value]) => ({ currency: cur, value }));
}

export const PACKAGE_STATUS: Record<string, string> = {
  PROPOSED: 'Request',
  ACCEPTED: 'Accepted',
  AWAITING_PICKUP: 'Awaiting pickup',
  IN_CUSTODY: 'In your bag',
  HANDED_OFF: 'Handed off',
  SETTLED: 'Delivered',
};

export type RequestFilter = 'waiting' | 'active' | 'past' | 'declined';

/** Where a carry request sits on the Carry requests list. */
export function requestBucket(leg: { status: string; acceptedAt?: string | null }): RequestFilter {
  if (leg.status === 'PROPOSED') return 'waiting';
  if (['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY'].includes(leg.status)) return 'active';
  // Declined, or lapsed without an answer: the request never became a job.
  if (leg.status === 'REJECTED' || (leg.status === 'EXPIRED' && !leg.acceptedAt)) return 'declined';
  return 'past';
}

/** Time left to answer a request, as hours and as a share of the 48-hour window. */
export function answerWindow(deadline: string, now = Date.now(), windowHours = 48) {
  const ms = new Date(deadline).getTime() - now;
  const hours = Math.max(0, ms / 3_600_000);
  return {
    hours,
    label: hours <= 0 ? 'Expired' : hours < 1 ? `${Math.max(1, Math.round(hours * 60))} min left` : `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m left`,
    share: Math.min(1, hours / windowHours),
    urgent: hours < 12,
  };
}
