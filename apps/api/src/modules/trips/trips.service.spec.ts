import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { TripsService } from './trips.service';

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
});
