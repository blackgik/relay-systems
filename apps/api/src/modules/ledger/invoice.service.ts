import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { serializeLedger } from './ledger.service';

export function invoiceNumber(id: string): string {
  return `INV-${id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`;
}

const CARRIED = ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF', 'SETTLED'] as const;

/**
 * One invoice per accepted carry request. The ledger is the money truth;
 * invoices are the readable paper trail on top of it: issued when a courier
 * accepts, funded when the sender's money enters escrow, paid when delivery
 * releases it into the courier's wallet.
 */
@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  /** Create the invoice for an accepted leg. Idempotent on the leg. */
  async issueForLeg(legId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: {
        trip: { select: { carrierId: true } },
        shipment: { select: { id: true, senderId: true } },
      },
    });
    if (!leg) return null;
    try {
      return await this.prisma.invoice.create({
        data: {
          number: invoiceNumber(leg.id),
          legId: leg.id,
          shipmentId: leg.shipmentId,
          senderId: leg.shipment.senderId,
          carrierId: leg.trip.carrierId,
          currency: leg.currency,
          amount: leg.fee,
          status: 'ISSUED',
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.prisma.invoice.findUnique({ where: { legId } });
      }
      throw e;
    }
  }

  /**
   * Bring a backfilled invoice up to date from the ledger: when the escrow
   * was funded, how much has been released, and when the final release
   * landed in the carrier's wallet.
   */
  async syncFromLedger(legId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { legId } });
    if (!invoice || invoice.status === 'PAID' || invoice.status === 'REFUNDED') return;
    const funded = await this.prisma.ledgerTransaction.findFirst({
      where: { type: 'FUND_ESCROW', shipmentId: invoice.shipmentId },
      select: { createdAt: true },
    });
    if (!funded) return;
    let paid = 0;
    let paidAt: Date | undefined;
    for (const suffix of ['partial', 'final'] as const) {
      const tx = await this.prisma.ledgerTransaction.findUnique({
        where: { idempotencyKey: `release:${legId}:${suffix}` },
        include: { entries: true },
      });
      const entry = tx?.entries.find((e) => e.amount > 0 && e.accountId.startsWith('user_wallet:'));
      if (entry && tx) {
        paid += Number(entry.amount);
        if (suffix === 'final') paidAt = tx.createdAt;
      }
    }
    await this.prisma.invoice.update({
      where: { legId },
      data: {
        escrowFundedAt: invoice.escrowFundedAt ?? funded.createdAt,
        amountPaid: Math.min(invoice.amount, paid),
        status: paid >= invoice.amount ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'FUNDED',
        ...(paid >= invoice.amount && paidAt ? { paidToWalletAt: paidAt } : {}),
      },
    });
  }

  /** Sender funded escrow: stamp every invoice on the shipment. */
  async markFunded(shipmentId: string, at = new Date()) {
    await this.prisma.invoice.updateMany({
      where: { shipmentId, status: 'ISSUED' },
      data: { status: 'FUNDED', escrowFundedAt: at },
    });
  }

  /** Money released into the carrier's wallet (partial or final). */
  async addPayment(legId: string, amount: number, fee: number, at = new Date()) {
    const invoice = await this.prisma.invoice.findUnique({ where: { legId } });
    if (!invoice) return;
    const paid = Math.min(fee, invoice.amountPaid + amount);
    await this.prisma.invoice.update({
      where: { legId },
      data: {
        amountPaid: paid,
        status: paid >= fee ? 'PAID' : 'PARTIALLY_PAID',
        ...(paid >= fee ? { paidToWalletAt: at } : {}),
      },
    });
  }

  async markRefunded(shipmentId: string) {
    await this.prisma.invoice.updateMany({
      where: { shipmentId, status: { in: ['ISSUED', 'FUNDED', 'PARTIALLY_PAID'] } },
      data: { status: 'REFUNDED' },
    });
  }

  /**
   * Invoices for legs accepted before invoices existed: created lazily from
   * the leg and its ledger timestamps the first time either side looks.
   */
  async listForUser(userId: string) {
    const legs = await this.prisma.leg.findMany({
      where: {
        status: { in: [...CARRIED] },
        OR: [{ shipment: { senderId: userId } }, { trip: { carrierId: userId } }],
      },
      select: { id: true },
      take: 200,
    });
    for (const leg of legs) {
      await this.issueForLeg(leg.id);
      await this.syncFromLedger(leg.id);
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { OR: [{ senderId: userId }, { carrierId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    if (invoices.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(invoices.flatMap((i) => [i.senderId, i.carrierId]))] } },
      select: { id: true, handle: true },
    });
    const handles = new Map(users.map((u) => [u.id, u.handle]));
    const shipments = await this.prisma.shipment.findMany({
      where: { id: { in: [...new Set(invoices.map((i) => i.shipmentId))] } },
      select: { id: true, originCity: true, destCity: true, category: true, weightKg: true },
    });
    const routes = new Map(shipments.map((s) => [s.id, s]));

    return serializeLedger(
      invoices.map((i) => ({
        ...i,
        role: i.carrierId === userId ? 'carrier' : 'sender',
        senderHandle: handles.get(i.senderId) ?? null,
        carrierHandle: handles.get(i.carrierId) ?? null,
        route: routes.get(i.shipmentId) ?? null,
      }))
    );
  }
}
