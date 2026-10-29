import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaystackClient } from '../integrations/paystack/paystack.client';
import { decrypt } from '../../common/crypto/pii';
import {
  LedgerService,
  escrowAccountId,
  pspClearingAccountId,
  serializeLedger,
  walletAccountId,
} from './ledger.service';

function orderRef(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
}

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    @Optional() private paystack?: PaystackClient
  ) {}

  get paystackConfigured() {
    return Boolean(this.paystack?.configured);
  }

  /**
   * Whether top-ups and withdrawals move real money through Paystack. A test
   * key always may. A live key only may in production, or when someone has
   * deliberately set PAYSTACK_ALLOW_LIVE=true: a developer clicking "Add
   * money" on localhost must never charge a real card or send a real transfer.
   * Read-only calls (bank list, account-name lookup) use Paystack either way.
   */
  get moneyLive() {
    if (!this.paystackConfigured) return false;
    const liveKey = (process.env.PAYSTACK_SECRET_KEY ?? '').startsWith('sk_live_');
    return !liveKey || process.env.NODE_ENV === 'production' || process.env.PAYSTACK_ALLOW_LIVE === 'true';
  }

  /** How money moves right now, for the wallet screen to explain. */
  get mode(): 'paystack' | 'simulated' | 'mock' {
    if (this.moneyLive) return 'paystack';
    return this.paystackConfigured ? 'simulated' : 'mock';
  }

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

  // ── Add money (card or bank transfer) ───────────────────────────────
  /**
   * Start a top-up. With Paystack configured this creates a real checkout
   * (card or transfer channel) and the wallet is credited on verify/webhook.
   * Without it, the mock PSP settles instantly, as before.
   */
  async startTopup(userId: string, dto: { amountMinors: number; currency: string; method: 'card' | 'transfer' }) {
    const currency = dto.currency.toUpperCase();
    const reference = orderRef('top');
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId, kind: 'TOPUP', reference, amountMinors: dto.amountMinors, currency,
        method: dto.method, provider: this.moneyLive ? 'paystack' : 'mock', status: 'PENDING',
      },
    });
    if (!this.moneyLive) {
      await this.topup(userId, dto.amountMinors, currency, reference);
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'SUCCESS', settledAt: new Date() } });
      return { reference, provider: 'mock', mode: this.mode, status: 'SUCCESS', checkoutUrl: null };
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new NotFoundException('User not found');
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    const init = await this.paystack!.initializeTransaction({
      email: user.email,
      amountMinors: dto.amountMinors,
      reference,
      callbackUrl: `${webUrl}/wallet?funding=${reference}`,
      channels: [dto.method === 'transfer' ? 'bank_transfer' : 'card'],
    });
    return { reference, provider: 'paystack', status: 'PENDING', checkoutUrl: init.authorization_url };
  }

  /** Confirm a Paystack top-up and credit the wallet (idempotent). */
  async verifyTopup(userId: string, reference: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { reference } });
    if (!order || order.userId !== userId || order.kind !== 'TOPUP') {
      throw new NotFoundException('Unknown top-up reference');
    }
    if (order.status === 'SUCCESS') return { reference, status: 'SUCCESS', duplicate: true };
    if (order.provider === 'mock') return { reference, status: order.status };
    const tx = await this.paystack!.verifyTransaction(reference);
    if (tx.status !== 'success') return { reference, status: 'PENDING' };
    if (tx.amount !== order.amountMinors) {
      throw new BadRequestException('Paid amount does not match the top-up amount');
    }
    await this.creditOrder(order);
    return { reference, status: 'SUCCESS', duplicate: false };
  }

  /** Webhook path: a verified charge.success settles its order. */
  async settleCharge(reference: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { reference } });
    if (!order || order.kind !== 'TOPUP') return { settled: false };
    if (order.status === 'SUCCESS') return { settled: true, duplicate: true };
    await this.creditOrder(order);
    return { settled: true, duplicate: false };
  }

  private async creditOrder(order: { id: string; userId: string; amountMinors: number; currency: string; reference: string }) {
    await this.topup(order.userId, order.amountMinors, order.currency, order.reference);
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'SUCCESS', settledAt: new Date() },
    });
  }

  // ── Withdraw to bank ────────────────────────────────────────────────
  /**
   * Withdraw to a Nigerian bank account. With Paystack configured this
   * creates a transfer recipient and initiates a real transfer; the wallet
   * is debited once the transfer is initiated and re-credited if Paystack
   * later reports it failed. Without Paystack, the mock settles instantly.
   */
  async startWithdraw(userId: string, dto: { amountMinors: number; currency: string }) {
    const currency = dto.currency.toUpperCase();
    // Money only ever leaves to the payout account verified at KYC (its
    // holder name matched by Paystack), never to an account typed in here.
    const payout = await this.prisma.bankAccount.findUnique({ where: { userId } });
    if (!payout) throw new BadRequestException('Add a payout bank account in Verification before withdrawing');
    const balance = await this.ledger.balance(walletAccountId(userId, currency));
    if (balance < BigInt(dto.amountMinors)) throw new BadRequestException('Insufficient wallet balance');
    const reference = orderRef('wd');
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId, kind: 'WITHDRAWAL', reference, amountMinors: dto.amountMinors, currency,
        method: 'transfer', provider: this.moneyLive ? 'paystack' : 'mock', status: 'PENDING',
        bankCode: payout.bankCode, accountName: payout.accountName, accountLast4: payout.accountLast4,
      },
    });
    if (!this.moneyLive) {
      await this.debitWithdrawal(userId, dto.amountMinors, currency, reference);
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'SUCCESS', settledAt: new Date() } });
      return { reference, provider: 'mock', mode: this.mode, status: 'SUCCESS' };
    }
    try {
      const recipient = await this.paystack!.createTransferRecipient({
        name: payout.accountName, accountNumber: decrypt(payout.accountNumberEnc), bankCode: payout.bankCode,
      });
      await this.paystack!.initiateTransfer({
        amountMinors: dto.amountMinors, recipientCode: recipient.recipient_code,
        reference, reason: 'Relay wallet withdrawal',
      });
    } catch (e) {
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      throw e;
    }
    await this.debitWithdrawal(userId, dto.amountMinors, currency, reference);
    return { reference, provider: 'paystack', mode: this.mode, status: 'PENDING' };
  }

  /** Top-ups and withdrawals with their provider status, newest first. */
  orders(userId: string, take = 50) {
    return this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, take)),
      select: {
        id: true, kind: true, reference: true, amountMinors: true, currency: true, method: true,
        provider: true, status: true, accountName: true, accountLast4: true, createdAt: true, settledAt: true,
      },
    });
  }

  /** Where withdrawals go: the KYC payout account (never the full number). */
  async payoutAccount(userId: string) {
    const a = await this.prisma.bankAccount.findUnique({
      where: { userId },
      select: { bankName: true, accountName: true, accountLast4: true, nameMatches: true },
    });
    return { account: a, mode: this.mode };
  }

  /** Webhook path: transfer.success / transfer.failed settles a withdrawal. */
  async settleTransfer(reference: string, success: boolean) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { reference } });
    if (!order || order.kind !== 'WITHDRAWAL' || order.status === 'SUCCESS') return { settled: false };
    if (success) {
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'SUCCESS', settledAt: new Date() } });
      return { settled: true };
    }
    // Transfer failed after the debit: put the money back.
    await this.ledger.post({
      type: 'WITHDRAW_REVERSAL',
      idempotencyKey: `wd-reversal:${reference}`,
      entries: [
        { account: { id: pspClearingAccountId(order.currency), kind: 'PSP_CLEARING', currency: order.currency }, amount: -BigInt(order.amountMinors) },
        { account: { id: walletAccountId(order.userId, order.currency), kind: 'USER_WALLET', ownerId: order.userId, currency: order.currency }, amount: BigInt(order.amountMinors) },
      ],
    });
    await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    return { settled: true, reversed: true };
  }

  private async debitWithdrawal(userId: string, amountMinors: number, currency: string, reference: string) {
    const amount = BigInt(amountMinors);
    await this.ledger.post({
      type: 'WITHDRAW',
      idempotencyKey: reference,
      entries: [
        { account: { id: walletAccountId(userId, currency), kind: 'USER_WALLET', ownerId: userId, currency }, amount: -amount },
        { account: { id: pspClearingAccountId(currency), kind: 'PSP_CLEARING', currency }, amount },
      ],
    });
  }

  async banks() {
    if (!this.paystackConfigured) return { provider: 'mock', banks: [] };
    return { provider: 'paystack', banks: await this.paystack!.listBanks() };
  }

  /** Balances, escrow positions, all-time in/out and 6-month money flow. */
  async summary(userId: string) {
    const balances = await this.balances(userId);
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { kind: 'USER_WALLET', ownerId: userId }, select: { id: true },
    });
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      include: { transaction: { select: { type: true, createdAt: true, shipmentId: true } } },
      orderBy: { transaction: { createdAt: 'asc' } },
      take: 2000,
    });

    let toppedUp = 0, withdrawn = 0;
    // Six-month totals by where money came from and went.
    const sinceFlow = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
    const breakdown = { topups: 0, payouts: 0, refunds: 0, withdrawals: 0, intoEscrow: 0, other: 0 };
    const flowMap = new Map<string, { inflow: number; outflow: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      flowMap.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, { inflow: 0, outflow: 0 });
    }
    for (const e of entries) {
      const amount = Number(e.amount);
      if (e.transaction.type === 'TOPUP' && amount > 0) toppedUp += amount;
      if (e.transaction.type === 'WITHDRAW' && amount < 0) withdrawn += -amount;
      if (e.transaction.createdAt >= sinceFlow) {
        const t = e.transaction.type;
        if (t === 'TOPUP' && amount > 0) breakdown.topups += amount;
        else if (t === 'RELEASE_LEG' && amount > 0) breakdown.payouts += amount;
        else if ((t === 'REFUND' || t === 'WITHDRAW_REVERSAL') && amount > 0) breakdown.refunds += amount;
        else if (t === 'WITHDRAW' && amount < 0) breakdown.withdrawals += -amount;
        else if (t === 'FUND_ESCROW' && amount < 0) breakdown.intoEscrow += -amount;
        else breakdown.other += Math.abs(amount);
      }
      const key = e.transaction.createdAt.toISOString().slice(0, 7);
      const bucket = flowMap.get(key);
      if (bucket) {
        if (amount > 0) bucket.inflow += amount;
        else bucket.outflow += -amount;
      }
    }

    // Escrow still holding money for shipments I sent.
    const myShipments = await this.prisma.shipment.findMany({ where: { senderId: userId }, select: { id: true, currency: true } });
    let escrowForMyShipments = 0;
    if (myShipments.length) {
      const escrowAccounts = await this.prisma.ledgerAccount.findMany({
        where: { kind: 'ESCROW', ownerId: { in: myShipments.map((s) => s.id) } },
        select: { balance: true },
      });
      escrowForMyShipments = escrowAccounts.reduce((s, a) => s + Number(a.balance), 0);
    }

    // Escrow that will land in my wallet when my carried packages deliver:
    // accepted/in-hand leg fees minus what has already been released to me.
    const myLegs = await this.prisma.leg.findMany({
      where: { trip: { carrierId: userId }, status: { in: ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF'] } },
      select: { id: true, fee: true, currency: true, shipmentId: true },
      take: 200,
    });
    let awaitingWallet = 0;
    for (const leg of myLegs) {
      let released = 0;
      for (const suffix of ['partial', 'final'] as const) {
        const tx = await this.prisma.ledgerTransaction.findUnique({
          where: { idempotencyKey: `release:${leg.id}:${suffix}` },
          include: { entries: true },
        });
        const mine = tx?.entries.find((e) => e.accountId === walletAccountId(userId, leg.currency));
        if (mine) released += Number(mine.amount);
      }
      awaitingWallet += Math.max(0, leg.fee - released);
    }

    return serializeLedger({
      balances,
      currency: (balances[0] as { currency?: string } | undefined)?.currency ?? 'NGN',
      toppedUp,
      withdrawn,
      escrowForMyShipments,
      escrowAwaitingWallet: awaitingWallet,
      awaitingLegs: myLegs.length,
      breakdown,
      mode: this.mode,
      flow: [...flowMap].map(([month, v]) => ({ month, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow })),
    });
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
