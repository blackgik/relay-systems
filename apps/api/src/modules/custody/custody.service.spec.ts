import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { OutboxService } from '../../common/outbox/outbox.service';
import { CustodyService } from './custody.service';

process.env.JWT_SECRET = 'test-secret';

function build() {
  const tx: any = {
    processedEvent: { create: jest.fn() },
    custodyEvent: { create: jest.fn() },
    leg: { updateMany: jest.fn() },
    shipment: { update: jest.fn(), updateMany: jest.fn() },
    dispute: { create: jest.fn() },
    insurancePolicy: { updateMany: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma: any = {
    leg: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    shipment: { findUnique: jest.fn() },
    trip: { findUnique: jest.fn() },
    custodyEvent: { findUnique: jest.fn(), findMany: jest.fn() },
    dispute: { findFirst: jest.fn() },
    locationPing: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const escrow: any = {
    releasePartial: jest.fn(),
    releaseRemainder: jest.fn(),
    releasePlatformFee: jest.fn(),
  };
  return { prisma, tx, escrow, service: new CustodyService(prisma, escrow, new OutboxService()) };
}

function leg(overrides: any = {}) {
  return {
    id: 'leg1',
    shipmentId: 'sh1',
    tripId: 't1',
    sequence: 0,
    status: 'AWAITING_PICKUP',
    version: 0,
    trip: { carrierId: 'carrier1' },
    shipment: {
      id: 'sh1',
      senderId: 'sender1',
      status: 'FUNDED',
      sealId: null,
      version: 0,
      legs: [],
    },
    ...overrides,
  };
}

describe('CustodyService', () => {
  it('issues a signed token only to the waiting taker', async () => {
    const { prisma, service } = build();
    prisma.leg.findUnique.mockResolvedValue(leg());

    const { token, code } = await service.requestHandoffToken('leg1', 'carrier1');
    expect(code).toMatch(/^\d{6}$/);
    const claims = jwt.verify(token, 'test-secret', { audience: 'handoff' }) as any;
    expect(claims).toMatchObject({ legId: 'leg1', sub: 'carrier1', code });

    await expect(service.requestHandoffToken('leg1', 'stranger')).rejects.toThrow(
      ForbiddenException
    );
    prisma.leg.findUnique.mockResolvedValue(leg({ status: 'IN_CUSTODY' }));
    await expect(service.requestHandoffToken('leg1', 'carrier1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('pickup moves the first leg into custody and records the seal', async () => {
    const { prisma, tx, escrow, service } = build();
    prisma.leg.findUnique.mockResolvedValue(leg());
    prisma.custodyEvent.findUnique.mockResolvedValue(null);
    prisma.dispute.findFirst.mockResolvedValue(null);
    tx.custodyEvent.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'ev1', ...data })
    );

    const { token } = await service.requestHandoffToken('leg1', 'carrier1');
    const result = await service.handoff('sender1', {
      token,
      sealId: 'SEAL-1',
      photos: ['p1'],
      idempotencyKey: 'h1',
    });

    expect(tx.custodyEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'PICKUP', fromUserId: 'sender1', toUserId: 'carrier1', sealId: 'SEAL-1' }),
      })
    );
    expect(tx.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'IN_CUSTODY' }) })
    );
    expect(tx.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'IN_TRANSIT', sealId: 'SEAL-1' }) })
    );
    expect(escrow.releasePartial).not.toHaveBeenCalled();
    expect(result.duplicate).toBe(false);
  });

  it('transfer requires a matching seal and pays the previous leg', async () => {
    const { prisma, tx, escrow, service } = build();
    const prev = { id: 'leg1', sequence: 0, status: 'IN_CUSTODY', version: 0, trip: { carrierId: 'carrier1' } };
    const current = leg({
      id: 'leg2',
      sequence: 1,
      trip: { carrierId: 'carrier2' },
      shipment: {
        id: 'sh1',
        senderId: 'sender1',
        status: 'IN_TRANSIT',
        sealId: 'SEAL-1',
        version: 1,
        legs: [prev],
      },
    });
    prisma.leg.findUnique.mockResolvedValue(current);
    prisma.custodyEvent.findUnique.mockResolvedValue(null);
    prisma.dispute.findFirst.mockResolvedValue(null);
    tx.custodyEvent.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'ev2', ...data })
    );

    const { token } = await service.requestHandoffToken('leg2', 'carrier2');
    await service.handoff('carrier1', { token, sealId: 'SEAL-1', photos: ['p1'], idempotencyKey: 'h2' });

    expect(tx.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'leg1' }), data: expect.objectContaining({ status: 'HANDED_OFF' }) })
    );
    expect(escrow.releasePartial).toHaveBeenCalledWith('leg1');
  });

  it('seal mismatch freezes escrow and opens a dispute', async () => {
    const { prisma, service } = build();
    const prev = { id: 'leg1', sequence: 0, status: 'IN_CUSTODY', version: 0, trip: { carrierId: 'carrier1' } };
    prisma.leg.findUnique.mockResolvedValue(
      leg({
        id: 'leg2',
        sequence: 1,
        trip: { carrierId: 'carrier2' },
        shipment: { id: 'sh1', senderId: 'sender1', status: 'IN_TRANSIT', sealId: 'SEAL-1', version: 1, legs: [prev] },
      })
    );
    prisma.custodyEvent.findUnique.mockResolvedValue(null);
    prisma.dispute.findFirst.mockResolvedValue(null);

    const { token } = await service.requestHandoffToken('leg2', 'carrier2');
    await expect(
      service.handoff('carrier1', { token, sealId: 'SEAL-X', photos: ['p1'], idempotencyKey: 'h3' })
    ).rejects.toThrow(/Seal mismatch/);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('replays the original event for a duplicate idempotency key', async () => {
    const { prisma, service } = build();
    prisma.custodyEvent.findUnique.mockResolvedValue({ id: 'ev1' });

    const result = await service.handoff('sender1', {
      token: 'bogus',
      sealId: 'SEAL-1',
      photos: ['p1'],
      idempotencyKey: 'h1',
    });

    expect(result).toMatchObject({ duplicate: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deliver verifies the OTP, settles legs, and releases everything', async () => {
    const { prisma, tx, escrow, service } = build();
    const otpHash = await bcrypt.hash('123456', 4);
    const legs = [
      { id: 'leg1', sequence: 0, status: 'HANDED_OFF', version: 1, tripId: 't1', fee: 5000 },
      { id: 'leg2', sequence: 1, status: 'IN_CUSTODY', version: 0, tripId: 't2', fee: 6000 },
    ];
    prisma.custodyEvent.findUnique.mockResolvedValue(null);
    prisma.shipment.findUnique.mockResolvedValue({
      id: 'sh1',
      status: 'IN_TRANSIT',
      version: 2,
      sealId: 'SEAL-1',
      deliveryOtpHash: otpHash,
      legs,
    });
    prisma.trip.findUnique.mockResolvedValue({ id: 't2', carrierId: 'carrier2' });
    prisma.dispute.findFirst.mockResolvedValue(null);
    tx.custodyEvent.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'ev3', ...data })
    );

    const result = await service.deliver('sh1', 'carrier2', {
      otp: '123456',
      photos: ['p1'],
      idempotencyKey: 'd1',
    });

    expect(tx.custodyEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'DELIVERY' }) })
    );
    expect(tx.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DELIVERED' }) })
    );
    expect(escrow.releaseRemainder).toHaveBeenCalledWith('leg1');
    expect(escrow.releaseRemainder).toHaveBeenCalledWith('leg2');
    expect(escrow.releasePlatformFee).toHaveBeenCalledWith('sh1');
    expect(result.duplicate).toBe(false);

    await expect(
      service.deliver('sh1', 'carrier2', { otp: '000000', photos: ['p1'], idempotencyKey: 'd2' })
    ).rejects.toThrow(/Invalid delivery code/);
  });
});
