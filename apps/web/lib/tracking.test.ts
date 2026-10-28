import { distanceKm } from './cities';
import {
  currentLeg,
  formatDuration,
  groupOf,
  journeyFacts,
  journeyProgress,
  journeyStages,
  shortId,
  type TrackEvent,
  type TrackLeg,
} from './tracking';

const H = 3600_000;
const now = Date.parse('2026-10-28T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

const leg = (sequence: number, status: string, departAt: number, arriveAt: number, from: string, to: string): TrackLeg => ({
  id: `leg${sequence}`,
  sequence,
  status,
  fee: 1000,
  currency: 'NGN',
  acceptDeadline: iso(departAt - 48 * H),
  trip: { originCity: from, destCity: to, departAt: iso(departAt), arriveAt: iso(arriveAt), mode: 'ROAD' },
});
const event = (type: string, at: number, legId: string | null = null): TrackEvent => ({
  id: `${type}-${at}`,
  legId,
  type,
  sealId: 'SEAL-1',
  photos: [],
  lat: null,
  lng: null,
  occurredAt: iso(at),
});

describe('groupOf', () => {
  it('sorts statuses into the list sections', () => {
    expect(groupOf('APPROVED')).toBe('action');
    expect(groupOf('IN_TRANSIT')).toBe('moving');
    expect(groupOf('FUNDED')).toBe('pickup');
    expect(groupOf('COMPLETED')).toBe('delivered');
    expect(groupOf('CANCELLED')).toBe('closed');
  });
});

describe('journey progress', () => {
  // Leg 1 done; leg 2 is half way (left 4h ago, lands in 4h).
  const legs = [leg(0, 'SETTLED', now - 20 * H, now - 12 * H, 'Awka', 'Abuja'), leg(1, 'IN_CUSTODY', now - 4 * H, now + 4 * H, 'Abuja', 'Houston')];

  it('counts finished legs plus time-based progress on the live one', () => {
    expect(journeyProgress('IN_TRANSIT', legs, now)).toBeCloseTo(0.75);
    expect(journeyProgress('DELIVERED', legs, now)).toBe(1);
    expect(currentLeg(legs)?.id).toBe('leg1');
  });

  it('reports distance and time left while moving', () => {
    const facts = journeyFacts('IN_TRANSIT', 'Awka', 'Houston', legs, now);
    expect(facts.timeLeftMs).toBe(4 * H);
    expect(facts.distanceKm).toBeGreaterThan(10_000);
    expect(journeyFacts('FUNDED', 'Awka', 'Houston', legs, now).timeLeftMs).toBeNull();
  });
});

describe('journeyStages', () => {
  it('splits elapsed time at custody events and projects the rest of a live leg', () => {
    const legs = [leg(0, 'HANDED_OFF', now - 20 * H, now - 12 * H, 'Awka', 'Abuja'), leg(1, 'IN_CUSTODY', now - 4 * H, now + 4 * H, 'Abuja', 'Houston')];
    const events = [event('PICKUP', now - 20 * H), event('TRANSFER', now - 6 * H)];
    const stages = journeyStages(iso(now - 30 * H), legs, events, now);
    expect(stages.map((s) => s.colorIndex)).toEqual([0, 1, 2, 2]);
    expect(stages.map((s) => [s.label, s.ms / H, !!s.projected])).toEqual([
      ['Before pickup', 10, false],
      ['Leg 1 · Awka → Abuja', 14, false],
      ['Leg 2 · Abuja → Houston', 6, false],
      ['Leg 2 · still to go', 4, true],
    ]);
  });

  it('is all waiting before the first pickup', () => {
    const stages = journeyStages(iso(now - 5 * H), [leg(0, 'ACCEPTED', now + 10 * H, now + 18 * H, 'Awka', 'Abuja')], [], now);
    expect(stages).toEqual([{ key: 'waiting', label: 'Before pickup', ms: 5 * H, colorIndex: 0 }]);
  });
});

describe('formatting', () => {
  it('formats durations and ids', () => {
    expect(formatDuration(70 * 60000)).toBe('1 hr 10 min');
    expect(formatDuration(25 * 60000)).toBe('25 min');
    expect(formatDuration(50 * H)).toBe('2 d 2 hr');
    expect(shortId('cmvs8f1e800010vuodbsgmd12')).toBe('SGM-D12');
    expect(distanceKm('Lagos', 'Abuja')).toBeGreaterThan(450);
    expect(distanceKm('Lagos', 'Atlantis')).toBeNull();
  });
});
