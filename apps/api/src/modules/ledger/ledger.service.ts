import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface LedgerAccountRef {
  id: string;
  kind: string;
  ownerId?: string;
  currency: string;
}

export interface LedgerEntryInput {
  account: LedgerAccountRef;
  // Positive credit, negative debit, in minor units. Sums to zero per tx.
  amount: bigint;
}

export interface PostTransactionInput {
  type: string;
  idempotencyKey: string;
  shipmentId?: string;
  fxRate?: number;
  entries: LedgerEntryInput[];
}

export function walletAccountId(userId: string, currency: string) {
  return `user_wallet:${userId}:${currency}`;
}

export function escrowAccountId(shipmentId: string, currency: string) {
  return `escrow:${shipmentId}:${currency}`;
}

export function revenueAccountId(currency: string) {
  return `platform_revenue:${currency}`;
}

export function insurancePoolAccountId(currency: string) {
  return `insurance_pool:${currency}`;
}

export function pspClearingAccountId(currency: string) {
  return `psp_clearing:${currency}`;
}

// Double-entry ledger: the entries are the source of truth, balances are a
// recomputable cache. Every post runs in one database transaction with an
// idempotency key. (Production hardening: SELECT ... FOR UPDATE on the
// touched account rows to serialize concurrent posts to one account.)
@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async post(input: PostTransactionInput) {
    const sum = input.entries.reduce((total, e) => total + e.amount, 0n);
    if (sum !== 0n) {
      throw new BadRequestException('Ledger entries must sum to zero');
    }
    const currencies = new Set(input.entries.map((e) => e.account.currency));
    if (currencies.size !== 1) {
      throw new BadRequestException('One currency per transaction');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.ledgerTransaction.create({
          data: {
            type: input.type,
            idempotencyKey: input.idempotencyKey,
            shipmentId: input.shipmentId,
            fxRate: input.fxRate,
          },
          include: { entries: true },
        });
        for (const entry of input.entries) {
          await tx.ledgerAccount.upsert({
            where: { id: entry.account.id },
            create: {
              id: entry.account.id,
              kind: entry.account.kind,
              ownerId: entry.account.ownerId,
              currency: entry.account.currency,
              balance: BigInt(0),
            },
            update: {},
          });
          await tx.ledgerEntry.create({
            data: {
              transactionId: created.id,
              accountId: entry.account.id,
              amount: entry.amount,
            },
          });
          await tx.ledgerAccount.update({
            where: { id: entry.account.id },
            data: { balance: { increment: entry.amount } },
          });
        }
        return { ...created, duplicate: false };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.ledgerTransaction.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { entries: true },
        });
        return { ...existing, duplicate: true };
      }
      throw e;
    }
  }

  async balance(accountId: string): Promise<bigint> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id: accountId } });
    return account?.balance ?? BigInt(0);
  }

  // Recomputes the cached balance from entries. Used by reconciliation.
  async recompute(accountId: string): Promise<bigint> {
    const entries = await this.prisma.ledgerEntry.findMany({ where: { accountId } });
    const total = entries.reduce((sum, e) => sum + e.amount, BigInt(0));
    await this.prisma.ledgerAccount.update({
      where: { id: accountId },
      data: { balance: total },
    });
    return total;
  }
}

// Bigints do not survive JSON.stringify — ledgers serialize to numbers.
export function serializeLedger<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v)));
}
