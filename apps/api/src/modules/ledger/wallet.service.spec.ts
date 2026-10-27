import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';

function build() {
  const prisma: any = {
    ledgerAccount: { findMany: jest.fn() },
    ledgerEntry: { findMany: jest.fn() },
    ledgerTransaction: { findUnique: jest.fn() },
  };
  const ledger: any = { post: jest.fn(), balance: jest.fn() };
  return { prisma, ledger, service: new WalletService(prisma, ledger) };
}

describe('WalletService', () => {
  it('topup credits the wallet from PSP clearing', async () => {
    const { ledger, service } = build();
    ledger.post.mockResolvedValue({ duplicate: false });

    const result = await service.topup('u1', 50000, 'NGN', 'topup:ref1');

    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOPUP',
        idempotencyKey: 'topup:ref1',
        entries: [
          expect.objectContaining({ amount: BigInt(-50000) }),
          expect.objectContaining({ amount: BigInt(50000) }),
        ],
      })
    );
    expect(result.reference).toBe('topup:ref1');
  });

  it('settleTopup replays are duplicates, unknown refs are not found', async () => {
    const { prisma, service } = build();
    prisma.ledgerTransaction.findUnique.mockResolvedValue({ id: 'lt1' });
    await expect(service.settleTopup('topup:ref1')).resolves.toMatchObject({ duplicate: true });
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    await expect(service.settleTopup('topup:nope')).rejects.toThrow(NotFoundException);
  });

  it('withdraw checks the balance before posting', async () => {
    const { ledger, service } = build();
    ledger.balance.mockResolvedValue(BigInt(100));
    await expect(service.withdraw('u1', 50000, 'NGN')).rejects.toThrow(BadRequestException);
    expect(ledger.post).not.toHaveBeenCalled();

    ledger.balance.mockResolvedValue(BigInt(60000));
    ledger.post.mockResolvedValue({ duplicate: false });
    await service.withdraw('u1', 50000, 'NGN');
    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WITHDRAW',
        entries: [
          expect.objectContaining({ amount: BigInt(-50000) }),
          expect.objectContaining({ amount: BigInt(50000) }),
        ],
      })
    );
  });

  it('transactions clamps take into a safe page size', async () => {
    const { prisma, service } = build();
    prisma.ledgerAccount.findMany.mockResolvedValue([{ id: 'wallet:u1:NGN' }]);
    prisma.ledgerEntry.findMany.mockResolvedValue([]);

    await service.transactions('u1', 5000);
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );

    await service.transactions('u1', Number('abc'));
    expect(prisma.ledgerEntry.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 50 })
    );

    await service.transactions('u1', 0);
    expect(prisma.ledgerEntry.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });
});
