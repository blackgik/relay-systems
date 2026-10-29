import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { TrustService } from './trust.service';

const sender = {
  id: 'sender',
  fullName: 'Ada Okafor',
  handle: 'harbor-heron-21',
  kycTier: 'T2',
  createdAt: new Date('2025-01-01'),
  kycProfile: { status: 'VERIFIED', firstName: 'Ada', middleName: null, lastName: 'Okafor', dateOfBirth: new Date('1994-03-12'), address: '12 Zik Ave', city: 'Awka', state: 'Anambra' },
  bankAccount: { bankName: 'GTBank', accountName: 'ADA OKAFOR', accountLast4: '4821', nameMatches: true },
};

function build(leg: any) {
  const tx: any = { review: { create: jest.fn((a: any) => Promise.resolve({ id: 'r1', ...a.data })) }, outboxEvent: { create: jest.fn() } };
  const prisma: any = {
    leg: { findUnique: jest.fn().mockResolvedValue(leg) },
    review: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 2 } }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    shipment: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn().mockResolvedValue([]) },
    dispute: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  return { prisma, tx, service: new TrustService(prisma, new OutboxService()) };
}

const leg = (o: any = {}) => ({
  id: 'l1',
  shipmentId: 's1',
  status: 'PROPOSED',
  acceptedAt: null,
  trip: { carrierId: 'courier' },
  shipment: { senderId: 'sender', sender },
  reviews: [],
  ...o,
});

describe('TrustService', () => {
  it('shows a deciding courier the sender’s record and reviews, but not who they are', async () => {
    const out = await build(leg()).service.senderForLeg('l1', 'courier');
    expect(out).toMatchObject({ handle: 'harbor-heron-21', rating: 4.5, count: 2, unlocked: false, identity: null });
    expect(out.history).toEqual({ sent: 3, delivered: 3, cancelled: 3, disputes: 0 });
  });

  it('reveals the sender’s identity once the courier has accepted', async () => {
    const out = await build(leg({ status: 'ACCEPTED', acceptedAt: new Date() })).service.senderForLeg('l1', 'courier');
    expect(out.identity).toMatchObject({ firstName: 'Ada', lastName: 'Okafor', city: 'Awka', bank: { nameMatches: true } });
  });

  it('refuses other couriers', async () => {
    await expect(build(leg()).service.senderForLeg('l1', 'someone')).rejects.toThrow(ForbiddenException);
  });

  it('lets the courier review the sender only after the leg ended or was terminated, once', async () => {
    await expect(build(leg({ status: 'IN_CUSTODY', acceptedAt: new Date() })).service.reviewSender('l1', 'courier', 5)).rejects.toThrow(/ended or been terminated/);

    const { service, tx } = build(leg({ status: 'NO_SHOW', acceptedAt: new Date() }));
    await service.reviewSender('l1', 'courier', 2, ' Never showed up ');
    expect(tx.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ about: 'OF_SENDER', subjectId: 'sender', rating: 2, comment: 'Never showed up', outcome: 'TERMINATED' }),
    });

    const again = build(leg({ status: 'SETTLED', acceptedAt: new Date() }));
    again.prisma.review.findUnique.mockResolvedValue({ id: 'r0' });
    await expect(again.service.reviewSender('l1', 'courier', 5)).rejects.toThrow(ConflictException);
  });
});
