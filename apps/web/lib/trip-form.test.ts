import {
  JOURNEY_STAGES,
  currencyRule,
  journeyStageIndex,
  modeReferenceLabel,
  nextJourneyStage,
  answerWindow,
  requestBucket,
  resolveRejectionReason,
  totalsByCurrency,
  tripBucket,
} from './trip-form';

describe('modeReferenceLabel', () => {
  it('names the document number after the mode of transport', () => {
    expect(modeReferenceLabel('AIR')).toEqual({ label: 'Flight number', placeholder: 'e.g. RL501' });
    expect(modeReferenceLabel('ROAD').label).toBe('Bus / transport number');
    expect(modeReferenceLabel('RAIL').label).toBe('Train ticket number');
  });
});

describe('currencyRule', () => {
  it('locks a Nigerian local trip to Naira', () => {
    const r = currencyRule('Awka', 'Abuja');
    expect(r).toMatchObject({ international: false, locked: 'NGN', country: 'Nigeria' });
  });

  it('treats a cross-border trip as international with free currency choice', () => {
    const r = currencyRule('Abuja', 'Houston');
    expect(r.international).toBe(true);
    expect(r.locked).toBeNull();
    expect(r.choices).toContain('USD');
  });

  it('uses the origin country currency for other local trips', () => {
    expect(currencyRule('Accra', 'Accra')).toMatchObject({ international: false, locked: 'GHS' });
    expect(currencyRule('Houston', 'Houston')).toMatchObject({ international: false, locked: 'USD' });
  });

  it('leaves unknown cities to the carrier', () => {
    const r = currencyRule('Springfield', 'Shelbyville');
    expect(r).toMatchObject({ international: null, locked: null });
  });
});

describe('resolveRejectionReason', () => {
  it('uses the preset, appends a note, and requires custom text for Other', () => {
    expect(resolveRejectionReason('No space left in my bag', '')).toBe('No space left in my bag');
    expect(resolveRejectionReason('No space left in my bag', '', 'try next week')).toBe('No space left in my bag — try next week');
    expect(resolveRejectionReason('Other', '  Bag is full of glass  ')).toBe('Bag is full of glass');
    expect(resolveRejectionReason('Other', '  ').length).toBeLessThan(3);
  });
});

describe('journey stages', () => {
  it('runs started → almost there → arrived → awaiting pickup → delivered', () => {
    expect(JOURNEY_STAGES.map((s) => s.id)).toEqual([
      'NOT_STARTED', 'STARTED', 'ALMOST_THERE', 'ARRIVED', 'AWAITING_PICKUP', 'DELIVERED',
    ]);
    expect(nextJourneyStage('NOT_STARTED')?.id).toBe('STARTED');
    expect(nextJourneyStage('ARRIVED')?.id).toBe('AWAITING_PICKUP');
    expect(nextJourneyStage('DELIVERED')).toBeNull();
    expect(journeyStageIndex('ALMOST_THERE')).toBe(2);
    expect(journeyStageIndex('bogus')).toBe(0);
  });
});

describe('tripBucket', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  const trip = (o: Partial<{ status: string; journeyStage: string; departAt: string; arriveAt: string }> = {}) => ({
    status: 'OPEN',
    journeyStage: 'NOT_STARTED',
    departAt: '2026-11-02T08:00:00Z',
    arriveAt: '2026-11-02T16:00:00Z',
    ...o,
  });

  it('sorts trips into upcoming, on the road and past', () => {
    expect(tripBucket(trip(), now)).toBe('upcoming');
    expect(tripBucket(trip({ journeyStage: 'STARTED' }), now)).toBe('road');
    expect(tripBucket(trip({ departAt: '2026-10-29T08:00:00Z', arriveAt: '2026-10-29T20:00:00Z' }), now)).toBe('road');
    expect(tripBucket(trip({ departAt: '2026-10-20T08:00:00Z', arriveAt: '2026-10-20T16:00:00Z' }), now)).toBe('past');
    expect(tripBucket(trip({ journeyStage: 'DELIVERED' }), now)).toBe('past');
    expect(tripBucket(trip({ status: 'CANCELLED' }), now)).toBe('past');
  });

  it('keeps a reported journey on the road even after the scheduled arrival', () => {
    expect(tripBucket(trip({ journeyStage: 'AWAITING_PICKUP', arriveAt: '2026-10-28T00:00:00Z' }), now)).toBe('road');
  });
});

describe('totalsByCurrency', () => {
  it('never adds Naira to dollars', () => {
    const rows = [
      { c: 'NGN', v: 5000 },
      { c: 'USD', v: 1200 },
      { c: 'NGN', v: 2500 },
      { c: 'GHS', v: 0 },
    ];
    expect(totalsByCurrency(rows, (r) => r.v, (r) => r.c)).toEqual([
      { currency: 'NGN', value: 7500 },
      { currency: 'USD', value: 1200 },
    ]);
  });
});

describe('requestBucket', () => {
  it('sorts requests into waiting, active, past and declined', () => {
    expect(requestBucket({ status: 'PROPOSED' })).toBe('waiting');
    expect(requestBucket({ status: 'AWAITING_PICKUP', acceptedAt: 'x' })).toBe('active');
    expect(requestBucket({ status: 'SETTLED', acceptedAt: 'x' })).toBe('past');
    expect(requestBucket({ status: 'REJECTED' })).toBe('declined');
    expect(requestBucket({ status: 'EXPIRED', acceptedAt: null })).toBe('declined');
    // Accepted, then cut short: a job that happened, kept for the record.
    expect(requestBucket({ status: 'EXPIRED', acceptedAt: '2026-10-01' })).toBe('past');
  });
});

describe('answerWindow', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  it('counts down the 48-hour answer window', () => {
    expect(answerWindow('2026-10-30T12:00:00Z', now)).toMatchObject({ label: '24h 0m left', share: 0.5, urgent: false });
    expect(answerWindow('2026-10-29T18:30:00Z', now)).toMatchObject({ label: '6h 30m left', urgent: true });
    expect(answerWindow('2026-10-29T12:20:00Z', now).label).toBe('20 min left');
    expect(answerWindow('2026-10-29T11:00:00Z', now)).toMatchObject({ label: 'Expired', share: 0 });
  });
});
