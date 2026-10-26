import { BadRequestException } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { DisputesService } from './disputes.service';

function build() {
  const tx: any = {
    dispute: { create: jest.fn(), update: jest.fn() },
    shipment: { update: jest.fn(), updateMany: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma: any = {
    shipment: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    dispute: { findUnique: jest.fn() },
    insurancePolicy: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const ledger: any = { post: jest.fn(), balance: jest.fn() };
  const escrow: any = { releaseRemainder: jest.fn(), releasePlatformFee: jest.fn() };
  return { prisma, tx, ledger, escrow, service: new DisputesService(prisma, ledger, escrow, new OutboxService()) };
}

const SHIPMENT = {
  id: 'sh1',
  senderId: 'sender1',
  status: 'IN_TRANSIT',
  currency: 'NGN',
  legs: [{ id: 'leg1', trip: { carrierId: 'carrier1' } }],
};

describe('DisputesService', () => {
  it('open moves a moving shipment to DISPUTED', async () => {
    const { prisma, tx, service } = build();
    prisma.shipment.findUnique.mockResolvedValue(SHIPMENT);
    tx.dispute.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'd1', ...data }));

    const dispute = await service.open('sender1', { shipmentId: 'sh1', reason: 'Item damaged' });

    expect(dispute).toMatchObject({ reason: 'Item damaged', status: 'OPEN' });
    expect(prisma.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DISPUTED' }) })
    );
  });

  it('rule RELEASE pays carriers and completes the shipment', async () => {
    const { prisma, escrow, service } = build();
    prisma.dispute.findUnique.mockResolvedValue({ id: 'd1', shipmentId: 'sh1', status: 'OPEN', reason: 'SEAL_MISMATCH' });
    prisma.shipment.findUnique.mockResolvedValue({ ...SHIPMENT, status: 'DISPUTED' });

    await service.rule('d1', 'RELEASE');

    expect(escrow.releaseRemainder).toHaveBeenCalledWith('leg1');
    expect(escrow.releasePlatformFee).toHaveBeenCalledWith('sh1');
    expect(prisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
    );
  });

  it('rule REFUND returns escrow and pays valid claims from the pool', async () => {
    const { prisma, ledger, service } = build();
    prisma.dispute.findUnique.mockResolvedValue({ id: 'd1', shipmentId: 'sh1', status: 'OPEN', reason: 'CLAIM:LOST' });
    prisma.shipment.findUnique.mockResolvedValue({ ...SHIPMENT, status: 'DISPUTED' });
    ledger.balance.mockResolvedValue(BigInt(40000));
    prisma.insurancePolicy.findUnique.mockResolvedValue({ shipmentId: 'sh1', coverage: 100000, status: 'ACTIVE' });

    await service.rule('d1', 'REFUND');

    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REFUND',
        idempotencyKey: 'dispute-refund:d1',
        entries: expect.arrayContaining([expect.objectContaining({ amount: BigInt(40000) })]),
      })
    );
    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CLAIM_PAYOUT',
        idempotencyKey: 'claim:d1',
        entries: expect.arrayContaining([expect.objectContaining({ amount: BigInt(100000) })]),
      })
    );
    expect(prisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REFUNDED' }) })
    );
  });

  it('rule SPLIT is manual in the MVP', async () => {
    const { service } = build();
    await expect(service.rule('d1', 'SPLIT')).rejects.toThrow(BadRequestException);
  });
});
