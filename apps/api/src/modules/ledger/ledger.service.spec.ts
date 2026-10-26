import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LedgerService } from './ledger.service';

const A = { id: 'user_wallet:u1:NGN', kind: 'USER_WALLET', ownerId: 'u1', currency: 'NGN' };
const B = { id: 'escrow:sh1:NGN', kind: 'ESCROW', ownerId: 'sh1', currency: 'NGN' };

function build() {
  const tx: any = {
    ledgerTransaction: { create: jest.fn() },
    ledgerAccount: { upsert: jest.fn(), update: jest.fn() },
    ledgerEntry: { create: jest.fn() },
  };
  const prisma: any = {
    $transaction: jest.fn((fn: any) => fn(tx)),
    ledgerTransaction: { findUnique: jest.fn() },
    ledgerAccount: { findUnique: jest.fn(), update: jest.fn() },
    ledgerEntry: { findMany: jest.fn() },
  };
  return { prisma, tx, service: new LedgerService(prisma) };
}

describe('LedgerService', () => {
  it('posts balanced entries and updates cached balances', async () => {
    const { tx, service } = build();
    tx.ledgerTransaction.create.mockResolvedValue({ id: 'lt1' });

    const result = await service.post({
      type: 'FUND_ESCROW',
      idempotencyKey: 'k1',
      entries: [
        { account: A, amount: BigInt(-5000) },
        { account: B, amount: BigInt(5000) },
      ],
    });

    expect(tx.ledgerAccount.upsert).toHaveBeenCalledTimes(2);
    expect(tx.ledgerEntry.create).toHaveBeenCalledTimes(2);
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ transactionId: 'lt1', amount: BigInt(5000) }) })
    );
    expect(tx.ledgerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { balance: { increment: BigInt(-5000) } } })
    );
    expect(result).toMatchObject({ id: 'lt1', duplicate: false });
  });

  it('rejects unbalanced and multi-currency transactions', async () => {
    const { prisma, service } = build();
    await expect(
      service.post({
        type: 'X',
        idempotencyKey: 'k2',
        entries: [
          { account: A, amount: BigInt(-5000) },
          { account: B, amount: BigInt(4999) },
        ],
      })
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.post({
        type: 'X',
        idempotencyKey: 'k3',
        entries: [
          { account: A, amount: BigInt(-5000) },
          { account: { ...B, id: 'escrow:sh1:USD', currency: 'USD' }, amount: BigInt(5000) },
        ],
      })
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the existing transaction on idempotency conflict', async () => {
    const { prisma, service } = build();
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    );
    prisma.ledgerTransaction.findUnique.mockResolvedValue({ id: 'lt0' });

    const result = await service.post({
      type: 'FUND_ESCROW',
      idempotencyKey: 'k1',
      entries: [
        { account: A, amount: BigInt(-1) },
        { account: B, amount: BigInt(1) },
      ],
    });

    expect(result).toMatchObject({ id: 'lt0', duplicate: true });
  });

  it('recomputes cached balances from entries', async () => {
    const { prisma, service } = build();
    prisma.ledgerEntry.findMany.mockResolvedValue([{ amount: BigInt(3000) }, { amount: BigInt(-500) }]);

    const total = await service.recompute(A.id);

    expect(total).toBe(BigInt(2500));
    expect(prisma.ledgerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { balance: BigInt(2500) } })
    );
  });
});
