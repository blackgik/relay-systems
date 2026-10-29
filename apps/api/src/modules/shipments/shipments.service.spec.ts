import { BadRequestException, ConflictException } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { STATEMENT_VERSION } from '../attestations/attestation.statement';
import { ShipmentsService } from './shipments.service';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function buildMocks() {
  const tx: any = {
    leg: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    trip: { update: jest.fn() },
    user: { update: jest.fn() },
    attestation: { create: jest.fn() },
    shipment: { update: jest.fn(), updateMany: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma: any = {
    user: { findUnique: jest.fn() },
    shipment: { findUnique: jest.fn(), create: jest.fn() },
    trip: { findMany: jest.fn() },
    leg: { findUnique: jest.fn(), findMany: jest.fn() },
    attestation: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const trips: any = { findCandidates: jest.fn() };
  const routing: any = { search: jest.fn() };
  const service = new ShipmentsService(prisma, trips, routing, new OutboxService());
  return { prisma, tx, trips, routing, service };
}

function shipment(overrides: any = {}) {
  return {
    id: 'sh1',
    senderId: 'u1',
    status: 'DRAFT',
    originCity: 'Awka',
    destCity: 'Houston',
    category: 'fabric',
    weightKg: 5,
    currency: 'NGN',
    version: 0,
    ...overrides,
  };
}

const SIGNED = { accepted: true, signedName: 'ada okafor', statementVersion: STATEMENT_VERSION };

function trip(id: string, overrides: any = {}) {
  const now = Date.now();
  return {
    id,
    carrierId: `carrier_${id}`,
    status: 'OPEN',
    originCity: 'Awka',
    destCity: 'Abuja',
    departAt: new Date(now + 5 * DAY),
    arriveAt: new Date(now + 5 * DAY + 8 * HOUR),
    remainingKg: 20,
    pricePerKg: 1000,
    currency: 'NGN',
    categories: ['fabric'],
    international: false,
    carrier: { kycTier: 'T1' },
    ...overrides,
  };
}

describe('ShipmentsService', () => {
  it('selectRoute reserves a valid chain and requests each leg', async () => {
    const { prisma, tx, service } = buildMocks();
    const now = Date.now();
    const t1 = trip('t1');
    const t2 = trip('t2', {
      originCity: 'Abuja',
      destCity: 'Houston',
      departAt: new Date(now + 6 * DAY + 8 * HOUR),
      arriveAt: new Date(now + 7 * DAY),
      international: true,
      carrier: { kycTier: 'T2' },
    });
    prisma.shipment.findUnique.mockResolvedValue(shipment());
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T2', fullName: 'Ada Okafor', kycProfile: null });
    prisma.trip.findMany.mockResolvedValue([t1, t2]);
    tx.leg.findMany.mockResolvedValue([]);
    tx.leg.create.mockImplementation(({ data }: any) => Promise.resolve({ id: `leg_${data.tripId}`, ...data }));
    tx.shipment.update.mockImplementation(({ data }: any) => Promise.resolve({ ...shipment(), ...data }));

    const result = await service.selectRoute('sh1', 'u1', ['t1', 't2'], SIGNED);

    expect(tx.leg.create).toHaveBeenCalledTimes(2);
    expect(tx.leg.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          shipmentId: 'sh1',
          tripId: 't1',
          sequence: 0,
          fee: 5000,
          status: 'PROPOSED',
          acceptDeadline: new Date(t1.departAt.getTime() - 48 * HOUR),
        }),
      })
    );
    expect(tx.trip.update).toHaveBeenCalledTimes(2);
    expect(tx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { remainingKg: { decrement: 5 } } })
    );
    expect(tx.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'AWAITING_APPROVAL', totalPrice: 10000 }),
      })
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('AWAITING_APPROVAL');
  });

  it('selectRoute rejects a broken chain without touching the database', async () => {
    const { prisma, service } = buildMocks();
    const t1 = trip('t1');
    const t2 = trip('t2', { originCity: 'Lagos', destCity: 'Houston' });
    prisma.shipment.findUnique.mockResolvedValue(shipment());
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T2', fullName: 'Ada Okafor', kycProfile: null });
    prisma.trip.findMany.mockResolvedValue([t1, t2]);

    await expect(service.selectRoute('sh1', 'u1', ['t1', 't2'], SIGNED)).rejects.toThrow(
      BadRequestException
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('selectRoute stores the signed declaration before any courier is asked', async () => {
    const { prisma, tx, service } = buildMocks();
    prisma.shipment.findUnique.mockResolvedValue(shipment({ destCity: 'Abuja' }));
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T2', fullName: 'Ada Okafor', kycProfile: null });
    prisma.trip.findMany.mockResolvedValue([trip('t1')]);
    tx.leg.findMany.mockResolvedValue([]);
    tx.shipment.update.mockImplementation(({ data }: any) => Promise.resolve({ ...shipment(), ...data }));

    await service.selectRoute('sh1', 'u1', ['t1'], SIGNED);
    expect(tx.attestation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shipmentId: 'sh1',
        senderId: 'u1',
        signedName: 'ada okafor',
        statementVersion: STATEMENT_VERSION,
        reference: expect.stringMatching(/^RLY-DEC-[0-9A-F]{8}$/),
      }),
    });
  });

  it('selectRoute refuses an unsigned or mis-signed first request, and keeps the signature on reroute', async () => {
    const { prisma, tx, service } = buildMocks();
    prisma.shipment.findUnique.mockResolvedValue(shipment({ destCity: 'Abuja' }));
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T2', fullName: 'Ada Okafor', kycProfile: null });
    prisma.trip.findMany.mockResolvedValue([trip('t1')]);

    await expect(service.selectRoute('sh1', 'u1', ['t1'])).rejects.toThrow(/declaration/);
    await expect(
      service.selectRoute('sh1', 'u1', ['t1'], { ...SIGNED, signedName: 'Someone Else' })
    ).rejects.toThrow(/full legal name/);
    await expect(
      service.selectRoute('sh1', 'u1', ['t1'], { ...SIGNED, statementVersion: 'old' })
    ).rejects.toThrow(/updated/);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    // Already signed (a reroute): no new signature needed, none stored.
    prisma.attestation.findUnique.mockResolvedValue({ id: 'att1' });
    tx.leg.findMany.mockResolvedValue([]);
    tx.shipment.update.mockImplementation(({ data }: any) => Promise.resolve({ ...shipment(), ...data }));
    await service.selectRoute('sh1', 'u1', ['t1']);
    expect(tx.attestation.create).not.toHaveBeenCalled();
  });

  it('rateDelivery reviews every finished leg once, with the comment, and refreshes the courier average', async () => {
    const { prisma, tx, service } = buildMocks();
    tx.review = { create: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.25 } }) };
    tx.leg.update = jest.fn();
    prisma.shipment.findUnique.mockResolvedValue(shipment({ status: 'DELIVERED' }));
    prisma.leg.findMany.mockResolvedValue([
      { id: 'l1', status: 'SETTLED', acceptedAt: new Date(), trip: { carrierId: 'c1' }, reviews: [] },
      { id: 'l2', status: 'NO_SHOW', acceptedAt: new Date(), trip: { carrierId: 'c2' }, reviews: [] },
      { id: 'l3', status: 'PROPOSED', acceptedAt: null, trip: { carrierId: 'c3' }, reviews: [] },
    ]);

    await expect(service.rateDelivery('sh1', 'u1', 5, '  Careful   and on time ')).resolves.toEqual({
      shipmentId: 'sh1',
      rating: 5,
      comment: 'Careful and on time',
    });
    expect(tx.review.create).toHaveBeenCalledTimes(2);
    expect(tx.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ legId: 'l2', subjectId: 'c2', about: 'OF_COURIER', outcome: 'TERMINATED', comment: 'Careful and on time' }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { rating: 4.3 } });

    prisma.leg.findMany.mockResolvedValue([
      { id: 'l1', status: 'SETTLED', acceptedAt: new Date(), trip: { carrierId: 'c1' }, reviews: [{ id: 'r1' }] },
    ]);
    await expect(service.rateDelivery('sh1', 'u1', 4)).rejects.toThrow(ConflictException);

    prisma.leg.findMany.mockResolvedValue([
      { id: 'l1', status: 'IN_CUSTODY', acceptedAt: new Date(), trip: { carrierId: 'c1' }, reviews: [] },
    ]);
    await expect(service.rateDelivery('sh1', 'u1', 4)).rejects.toThrow(/ended or been terminated/);
  });

  it('acceptLeg approves the shipment when the last leg accepts', async () => {
    const { prisma, tx, service } = buildMocks();
    const now = Date.now();
    prisma.leg.findUnique.mockResolvedValue({
      id: 'leg1',
      shipmentId: 'sh1',
      tripId: 't1',
      status: 'PROPOSED',
      version: 0,
      acceptDeadline: new Date(now + DAY),
      trip: { carrierId: 'u2' },
      shipment: { ...shipment(), status: 'AWAITING_APPROVAL', version: 3 },
    });
    tx.leg.updateMany.mockResolvedValue({ count: 1 });
    tx.leg.count.mockResolvedValue(0);
    tx.shipment.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.acceptLeg('leg1', 'u2');

    expect(tx.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACCEPTED' }) })
    );
    expect(tx.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) })
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'shipment.approved' }) })
    );
    expect(result).toEqual({ legId: 'leg1', shipmentStatus: 'APPROVED' });
  });

  it('acceptLeg past the deadline expires the leg and reroutes', async () => {
    const { prisma, tx, service } = buildMocks();
    const now = Date.now();
    prisma.leg.findUnique.mockResolvedValue({
      id: 'leg1',
      shipmentId: 'sh1',
      tripId: 't1',
      status: 'PROPOSED',
      version: 0,
      acceptDeadline: new Date(now - HOUR),
      trip: { carrierId: 'u2' },
      shipment: { ...shipment(), status: 'AWAITING_APPROVAL', version: 3 },
    });

    await expect(service.acceptLeg('leg1', 'u2')).rejects.toThrow(BadRequestException);
    expect(tx.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) })
    );
    expect(tx.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REROUTING' }) })
    );
  });

  it('rejectLeg releases capacity and reroutes the shipment', async () => {
    const { prisma, tx, service } = buildMocks();
    prisma.leg.findUnique.mockResolvedValue({
      id: 'leg1',
      shipmentId: 'sh1',
      tripId: 't1',
      status: 'PROPOSED',
      version: 0,
      trip: { carrierId: 'u2' },
      shipment: { ...shipment(), status: 'AWAITING_APPROVAL', version: 3 },
    });
    tx.leg.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.rejectLeg('leg1', 'u2')).rejects.toThrow(/reason/);
    await expect(service.rejectLeg('leg1', 'u2', '  ')).rejects.toThrow(/reason/);

    const result = await service.rejectLeg('leg1', 'u2', '  No space left in my bag  ');

    expect(tx.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'No space left in my bag' }),
      })
    );
    expect(tx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { remainingKg: { increment: 5 } } })
    );
    expect(tx.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REROUTING' }) })
    );
    expect(result).toEqual({ legId: 'leg1', shipmentStatus: 'REROUTING', rejectionReason: 'No space left in my bag' });
  });

  it('routes() maps trips to candidates and returns shaped options', async () => {
    const { prisma, trips, routing, service } = buildMocks();
    const t1 = trip('t1');
    prisma.shipment.findUnique.mockResolvedValue(shipment());
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T1' });
    trips.findCandidates.mockResolvedValue([t1]);
    routing.search.mockReturnValue([
      {
        legs: [{ trip: { ...t1, carrierTier: 'T1' }, fee: 5000 }],
        totalPrice: 5000,
        currency: 'NGN',
        departAt: t1.departAt,
        arriveAt: t1.arriveAt,
      },
    ]);

    const result = await service.routes('sh1', 'u1');

    expect(routing.search).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: 't1',
          carrierId: 'carrier_t1',
          carrierTier: 'T1',
          remainingKg: 20,
        }),
      ],
      expect.objectContaining({
        originCity: 'Awka',
        destCity: 'Houston',
        weightKg: 5,
        senderTier: 'T1',
      })
    );
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].legs[0].fee).toBe(5000);
    expect(result.routes[0].legs[0].acceptDeadline).toEqual(
      new Date(t1.departAt.getTime() - 48 * HOUR)
    );
  });
});
