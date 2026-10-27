import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  LedgerService,
  pspClearingAccountId,
  serializeLedger,
  walletAccountId,
} from './ledger.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService
  ) {}

  balances(userId: string) {
    return this.prisma.ledgerAccount
      .findMany({ where: { kind: 'USER_WALLET', ownerId: userId } })
      .then((accounts) => serializeLedger(accounts));
  }

  async transactions(userId: string, take = 50) {
    // Backstop for any caller that bypasses the controller's pipes:
    // non-numeric input falls back to the default, numbers clamp to 1..100.
    const limit = Number.isFinite(take) ? Math.min(100, Math.max(1, Math.trunc(take))) : 50;
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { kind: 'USER_WALLET', ownerId: userId },
      select: { id: true },
    });
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      include: { transaction: true },
      orderBy: { transaction: { createdAt: 'desc' } },
      take: limit,
    });
    return serializeLedger(entries);
  }

  // Mock PSP top-up: the provider approves instantly, so credit lands at once.
  // The reference doubles as the idempotency key, which is what the PSP
  // webhook replays to prove duplicate delivery is safe.
  async topup(userId: string, amountMinors: number, currency: string, reference?: string) {
    const ref = reference ?? `topup:${userId}:${Date.now()}`;
    const amount = BigInt(amountMinors);
    const tx = await this.ledger.post({
      type: 'TOPUP',
      idempotencyKey: ref,
      entries: [
        {
          account: { id: pspClearingAccountId(currency), kind: 'PSP_CLEARING', currency },
          amount: -amount,
        },
        {
          account: { id: walletAccountId(userId, currency), kind: 'USER_WALLET', ownerId: userId, currency },
          amount,
        },
      ],
    });
    return { reference: ref, checkoutUrl: `mock://psp/checkout/${ref}`, transaction: serializeLedger(tx) };
  }

  async settleTopup(reference: string) {
    const existing = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: reference },
    });
    if (!existing) throw new NotFoundException('Unknown top-up reference');
    return { duplicate: true, reference };
  }

  async withdraw(userId: string, amountMinors: number, currency: string) {
    const amount = BigInt(amountMinors);
    const balance = await this.ledger.balance(walletAccountId(userId, currency));
    if (balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    const tx = await this.ledger.post({
      type: 'WITHDRAW',
      idempotencyKey: `withdraw:${userId}:${Date.now()}`,
      entries: [
        {
          account: { id: walletAccountId(userId, currency), kind: 'USER_WALLET', ownerId: userId, currency },
          amount: -amount,
        },
        {
          account: { id: pspClearingAccountId(currency), kind: 'PSP_CLEARING', currency },
          amount,
        },
      ],
    });
    return serializeLedger(tx);
  }
}
