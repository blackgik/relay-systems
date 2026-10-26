import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { SHIPMENT_TRANSITIONS, assertTransition } from '../../common/state-machine/transitions';
import { EscrowService } from '../ledger/escrow.service';
import {
  LedgerService,
  escrowAccountId,
  insurancePoolAccountId,
  walletAccountId,
} from '../ledger/ledger.service';

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private escrow: EscrowService,
    private outbox: OutboxService
  ) {}

  private async shipmentForParty(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        legs: { include: { trip: { select: { carrierId: true } } } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    const isParty =
      shipment.senderId === userId ||
      shipment.legs.some((leg) => leg.trip.carrierId === userId);
    if (!isParty) throw new ForbiddenException('Not your shipment');
    return shipment;
  }

  private async moveToDisputed(shipmentId: string, status: string) {
    if (status === 'IN_TRANSIT' || status === 'DELIVERED') {
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', status, 'DISPUTED');
      await this.prisma.shipment.updateMany({
        where: { id: shipmentId },
        data: { status: 'DISPUTED', version: { increment: 1 } },
      });
    }
    // FUNDED shipments keep their status; open disputes block handoffs,
    // delivery, and payouts via explicit checks instead.
  }

  async open(userId: string, input: { shipmentId: string; legId?: string; reason: string }) {
    const shipment = await this.shipmentForParty(input.shipmentId, userId);
    const dispute = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          shipmentId: input.shipmentId,
          legId: input.legId,
          openedBy: userId,
          reason: input.reason,
          evidence: {},
          status: 'OPEN',
        },
      });
      await this.outbox.write(tx, 'dispute.opened', { disputeId: created.id, shipmentId: input.shipmentId });
      return created;
    });
    await this.moveToDisputed(input.shipmentId, shipment.status);
    return dispute;
  }

  async fileClaim(userId: string, input: { shipmentId: string; type: string; description: string }) {
    const shipment = await this.shipmentForParty(input.shipmentId, userId);
    const dispute = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          shipmentId: input.shipmentId,
          openedBy: userId,
          reason: `CLAIM:${input.type}`,
          evidence: { description: input.description },
          status: 'OPEN',
        },
      });
      await this.outbox.write(tx, 'claim.filed', { disputeId: created.id, shipmentId: input.shipmentId });
      return created;
    });
    await this.moveToDisputed(input.shipmentId, shipment.status);
    return dispute;
  }

  async rule(disputeId: string, ruling: string) {
    if (!['RELEASE', 'REFUND', 'SPLIT'].includes(ruling)) {
      throw new BadRequestException('Ruling must be RELEASE, REFUND, or SPLIT');
    }
    if (ruling === 'SPLIT') {
      throw new BadRequestException('Split rulings are manual in the MVP');
    }
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN') throw new BadRequestException('Dispute already ruled');
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: dispute.shipmentId },
      include: { legs: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');

    if (ruling === 'RELEASE') {
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', shipment.status, 'COMPLETED');
      for (const leg of shipment.legs) {
        await this.escrow.releaseRemainder(leg.id);
      }
      await this.escrow.releasePlatformFee(shipment.id);
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: 'COMPLETED', version: { increment: 1 } },
      });
    } else {
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', shipment.status, 'REFUNDED');
      const currency = shipment.currency;
      const escrowBalance = await this.ledger.balance(escrowAccountId(shipment.id, currency));
      await this.ledger.post({
        type: 'REFUND',
        idempotencyKey: `dispute-refund:${disputeId}`,
        shipmentId: shipment.id,
        entries: [
          {
            account: { id: escrowAccountId(shipment.id, currency), kind: 'ESCROW', ownerId: shipment.id, currency },
            amount: -escrowBalance,
          },
          {
            account: { id: walletAccountId(shipment.senderId, currency), kind: 'USER_WALLET', ownerId: shipment.senderId, currency },
            amount: escrowBalance,
          },
        ],
      });
      if (dispute.reason.startsWith('CLAIM:')) {
        const policy = await this.prisma.insurancePolicy.findUnique({
          where: { shipmentId: shipment.id },
        });
        if (policy && policy.status === 'ACTIVE') {
          await this.ledger.post({
            type: 'CLAIM_PAYOUT',
            idempotencyKey: `claim:${disputeId}`,
            shipmentId: shipment.id,
            entries: [
              {
                account: { id: insurancePoolAccountId(currency), kind: 'INSURANCE_POOL', currency },
                amount: -BigInt(policy.coverage),
              },
              {
                account: { id: walletAccountId(shipment.senderId, currency), kind: 'USER_WALLET', ownerId: shipment.senderId, currency },
                amount: BigInt(policy.coverage),
              },
            ],
          });
          await this.prisma.insurancePolicy.update({
            where: { shipmentId: shipment.id },
            data: { status: 'EXPIRED' },
          });
        }
      }
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: 'REFUNDED', version: { increment: 1 } },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const ruled = await tx.dispute.update({
        where: { id: disputeId },
        data: { status: 'RULED', ruling },
      });
      await this.outbox.write(tx, 'dispute.resolved', { disputeId, ruling });
      return ruled;
    });
  }
}
