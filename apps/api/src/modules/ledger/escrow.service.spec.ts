import { BadRequestException } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { EscrowService } from './escrow.service';

function build() {
  const tx: any = {
    shipment: { updateMany: jest.fn(), update: jest.fn() },
    leg: { updateMany: jest.fn() },
    insurancePolicy: { upsert: jest.fn(), update: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma: any = {
    shipment: { findUnique: jest.fn() },
    leg: { findUnique: jest.fn() },
    ledgerTransaction: { findUnique: jest.fn() },
    insurancePolicy: { findUnique: jest.fn(), update: jest.fn() },
    dispute: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const ledger: any = { post: jest.fn(), balance: jest.fn() };
  const service = new EscrowService(prisma, ledger, new OutboxService());
  return { prisma, tx, ledger, service };
}

const SHIPMENT = {
  id: 'sh1',
  senderId: 'u1',
  status: 'APPROVED',
  currency: 'NGN',
  declaredValue: 100000,
  version: 0,
  legs: [
    { id: 'leg1', fee: 20000 },
    { id: 'leg2', fee: 25000 },
  ],
};

describe('EscrowService', () => {
  it('quotes leg fees plus platform fee plus premium', () => {
    const { service } = build();
    expect(service.quote(SHIPMENT.legs, 100000)).toEqual({
      legFees: 45000,
      platformFee: 2250,
      premium: 2000,
      total: 49250,
    });
  });

  it('fund moves wallet money into escrow and the pool, then marks FUNDED', async () => {
    const { prisma, tx, ledger, service } = build();
    prisma.shipment.findUnique.mockResolvedValue(SHIPMENT);
    ledger.balance.mockResolvedValue(BigInt(100000));
    ledger.post.mockResolvedValue({ duplicate: false });
    tx.shipment.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.fund('sh1', 'u1');

    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FUND_ESCROW',
        idempotencyKey: 'fund:sh1',
        entries: [
          expect.objectContaining({ amount: BigInt(-49250) }),
          expect.objectContaining({ amount: BigInt(47250) }),
          expect.objectContaining({ amount: BigInt(2000) }),
        ],
      })
    );
    expect(tx.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FUNDED' }) })
    );
    expect(tx.leg.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'AWAITING_PICKUP' } })
    );
    expect(result.deliveryOtp).toMatch(/^\d{6}$/);
    expect(tx.insurancePolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ shipmentId: 'sh1', coverage: 100000, premium: 2000 }),
      })
    );
    expect(result.duplicate).toBe(false);
  });

  it('fund rejects insufficient wallets and replays funded shipments', async () => {
    const { prisma, ledger, service } = build();
    prisma.shipment.findUnique.mockResolvedValue(SHIPMENT);
    ledger.balance.mockResolvedValue(BigInt(100));

    await expect(service.fund('sh1', 'u1')).rejects.toThrow(BadRequestException);
    expect(ledger.post).not.toHaveBeenCalled();

    prisma.shipment.findUnique.mockResolvedValue({ ...SHIPMENT, status: 'FUNDED' });
    const replay = await service.fund('sh1', 'u1');
    expect(replay.duplicate).toBe(true);
    expect(ledger.post).not.toHaveBeenCalled();
  });

  it('releasePartial pays 70% and releaseRemainder pays the rest', async () => {
    const { prisma, ledger, service } = build();
    prisma.leg.findUnique.mockResolvedValue({
      id: 'leg1',
      shipmentId: 'sh1',
      fee: 5000,
      currency: 'NGN',
      trip: { carrierId: 'carrier1' },
    });
    ledger.post.mockResolvedValue({ duplicate: false });

    await service.releasePartial('leg1');
    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RELEASE_LEG',
        idempotencyKey: 'release:leg1:partial',
        entries: expect.arrayContaining([expect.objectContaining({ amount: BigInt(3500) })]),
      })
    );

    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      entries: [{ accountId: 'user_wallet:carrier1:NGN', amount: BigInt(3500) }],
    });
    const remainder = await service.releaseRemainder('leg1');
    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RELEASE_LEG',
        idempotencyKey: 'release:leg1:final',
        entries: expect.arrayContaining([expect.objectContaining({ amount: BigInt(1500) })]),
      })
    );
    expect(remainder).toMatchObject({ legId: 'leg1', released: 1500 });
  });

  it('refundShipment returns escrow and premium before pickup', async () => {
    const { prisma, tx, ledger, service } = build();
    prisma.shipment.findUnique.mockResolvedValue({ ...SHIPMENT, status: 'FUNDED' });
    ledger.balance.mockResolvedValue(BigInt(47250));
    prisma.insurancePolicy.findUnique.mockResolvedValue({ shipmentId: 'sh1', premium: 2000, status: 'ACTIVE' });
    ledger.post.mockResolvedValue({ duplicate: false });

    await service.refundShipment('sh1', 'u1');

    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REFUND',
        idempotencyKey: 'refund:sh1',
        entries: expect.arrayContaining([expect.objectContaining({ amount: BigInt(47250) })]),
      })
    );
    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'premium-refund:sh1',
        entries: expect.arrayContaining([expect.objectContaining({ amount: BigInt(2000) })]),
      })
    );
    expect(prisma.insurancePolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } })
    );
    expect(tx.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REFUNDED' }) })
    );
  });
});
