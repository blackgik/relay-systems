import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { TripsService, myTripStats } from './trips.service';

const DAY = 24 * 3600_000;

function buildService() {
  const prisma: any = {
    user: { findUnique: jest.fn() },
    trip: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    leg: { findMany: jest.fn(), updateMany: jest.fn() },
    shipment: { updateMany: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(prisma)),
  };
  const kyc: any = { start: jest.fn() };
  const service = new TripsService(prisma, new OutboxService(), kyc);
  return { prisma, service };
}

function dto(overrides: any = {}) {
  const now = Date.now();
  return {
    originCity: 'Awka',
    destCity: 'Abuja',
    departAt: new Date(now + 5 * DAY).toISOString(),
    arriveAt: new Date(now + 5 * DAY + 8 * 3600_000).toISOString(),
    mode: 'ROAD',
    capacityKg: 20,
    pricePerKg: 1000,
    currency: 'NGN',
    categories: ['fabric'],
    international: false,
    ...overrides,
  };
}

describe('TripsService', () => {
  it('requires T1 for domestic trips and T2 for international ones', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T0' });
    await expect(service.create('u1', dto())).rejects.toThrow(ForbiddenException);

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T1' });
    await expect(service.create('u1', dto({ international: true }))).rejects.toThrow(
      ForbiddenException
    );

    prisma.trip.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data }));
    const created = await service.create('u1', dto());
    expect(created).toMatchObject({ remainingKg: 20, status: 'OPEN' });
  });

  it('rejects arrivals that precede departure', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T1' });
    const now = Date.now();
    await expect(
      service.create(
        'u1',
        dto({
          departAt: new Date(now + 5 * DAY).toISOString(),
          arriveAt: new Date(now + 4 * DAY).toISOString(),
        })
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('cancel releases pending legs and reroutes their shipments', async () => {
    const { prisma, service } = buildService();
    prisma.trip.findUnique.mockResolvedValue({ id: 't1', carrierId: 'u1' });
    prisma.trip.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data }));
    prisma.leg.findMany.mockResolvedValue([
      { id: 'leg1', shipmentId: 'sh1' },
      { id: 'leg2', shipmentId: 'sh1' },
    ]);
    prisma.leg.updateMany.mockResolvedValue({ count: 2 });
    prisma.shipment.updateMany.mockResolvedValue({ count: 1 });
    prisma.outboxEvent = { create: jest.fn() };

    await service.update('t1', 'u1', { status: 'CANCELLED' });

    expect(prisma.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) })
    );
    expect(prisma.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REROUTING' }) })
    );
  });

  it('journey stages only move forward, and never on a cancelled trip', async () => {
    const { prisma, service } = buildService();
    prisma.trip.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data }));
    prisma.outboxEvent = { create: jest.fn().mockResolvedValue({}) };

    prisma.trip.findUnique.mockResolvedValue({ id: 't1', carrierId: 'u1', status: 'OPEN', journeyStage: 'STARTED' });
    await expect(service.update('t1', 'u1', { journeyStage: 'NOT_STARTED' })).rejects.toThrow(BadRequestException);
    await expect(service.update('t1', 'u1', { journeyStage: 'ARRIVED' })).resolves.toMatchObject({ journeyStage: 'ARRIVED' });

    prisma.trip.findUnique.mockResolvedValue({ id: 't1', carrierId: 'u1', status: 'CANCELLED', journeyStage: 'STARTED' });
    await expect(service.update('t1', 'u1', { journeyStage: 'ARRIVED' })).rejects.toThrow(BadRequestException);
  });

  it('stores the cannot-transport list and its added fee on create', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', kycTier: 'T1' });
    prisma.trip.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data }));
    const created = await service.create('u1', dto({ excludedItems: [' glass ', ''], excludedFeePerKg: 500 }));
    expect(created).toMatchObject({ excludedItems: ['glass'], excludedFeePerKg: 500 });
  });
});

describe('myTripStats', () => {
  const leg = (status: string, weightKg: number, fee: number, senderRating: number | null = null) => ({
    id: `l-${status}-${weightKg}`,
    status,
    fee,
    senderRating,
    shipment: { id: `s-${weightKg}`, category: 'fabric', weightKg, status: 'X', attestation: { reference: 'RLY-DEC-1' } },
  });

  it('totals kg and money per trip and averages the delivery ratings', () => {
    const { stats, packages } = myTripStats([
      leg('SETTLED', 2.5, 5000, 5),
      leg('SETTLED', 1, 2000, 4),
      leg('IN_CUSTODY', 3, 6000),
      leg('PROPOSED', 4, 8000),
      leg('REJECTED', 9, 18000),
    ]);
    expect(stats).toEqual({
      packagesCarried: 3,
      kgCarried: 6.5,
      earned: 7000,
      bookedFees: 13000,
      delivered: 2,
      rating: 4.5,
      ratings: 2,
    });
    // Requests waiting on the bag are listed; rejected ones are not.
    expect(packages.map((p) => p.status)).toEqual(['SETTLED', 'SETTLED', 'IN_CUSTODY', 'PROPOSED']);
    expect(packages[0]).toMatchObject({ weightKg: 2.5, rating: 5, declaration: 'RLY-DEC-1' });
  });

  it('has no rating until a sender rates a delivery', () => {
    expect(myTripStats([leg('IN_CUSTODY', 1, 100)]).stats.rating).toBeNull();
  });
});
