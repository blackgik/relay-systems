import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FIRST_RELEASE_BPS, INSURANCE_RATE_BPS, PLATFORM_FEE_BPS } from '@relay/shared';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { SHIPMENT_TRANSITIONS, assertTransition } from '../../common/state-machine/transitions';
import {
  LedgerService,
  escrowAccountId,
  insurancePoolAccountId,
  revenueAccountId,
  serializeLedger,
  walletAccountId,
} from './ledger.service';

export function platformFeeFor(legFees: number): number {
  return Math.floor((legFees * PLATFORM_FEE_BPS) / 10000);
}

export function premiumFor(declaredValue: number): number {
  return Math.floor((declaredValue * INSURANCE_RATE_BPS) / 10000);
}

@Injectable()
export class EscrowService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private outbox: OutboxService
  ) {}

  quote(legs: { fee: number }[], declaredValue: number) {
    const legFees = legs.reduce((sum, leg) => sum + leg.fee, 0);
    const platformFee = platformFeeFor(legFees);
    const premium = premiumFor(declaredValue);
    return { legFees, platformFee, premium, total: legFees + platformFee + premium };
  }

  async quoteFor(shipmentId: string, senderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { legs: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.senderId !== senderId) throw new ForbiddenException('Not your shipment');
    return { shipmentId, currency: shipment.currency, ...this.quote(shipment.legs, shipment.declaredValue) };
  }

  // Sender funds an APPROVED shipment: wallet -> escrow + insurance pool.
  // Idempotent on `fund:{shipmentId}` (or a caller key) and crash-safe: the
  // completion step only fires while the shipment is still APPROVED.
  async fund(shipmentId: string, senderId: string, idempotencyKey?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { legs: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.senderId !== senderId) throw new ForbiddenException('Not your shipment');
    if (shipment.status === 'FUNDED') {
      return { duplicate: true, shipment: serializeLedger(shipment) };
    }
    assertTransition(SHIPMENT_TRANSITIONS, 'shipment', shipment.status, 'FUNDED');

    const { legFees, platformFee, premium, total } = this.quote(
      shipment.legs,
      shipment.declaredValue
    );
    const currency = shipment.currency;
    const balance = await this.ledger.balance(walletAccountId(senderId, currency));
    if (balance < BigInt(total)) {
      throw new BadRequestException(
        `Insufficient wallet balance: need ${total}, have ${balance}`
      );
    }

    const posted = await this.ledger.post({
      type: 'FUND_ESCROW',
      idempotencyKey: idempotencyKey ?? `fund:${shipmentId}`,
      shipmentId,
      entries: [
        {
          account: { id: walletAccountId(senderId, currency), kind: 'USER_WALLET', ownerId: senderId, currency },
          amount: -BigInt(total),
        },
        {
          account: { id: escrowAccountId(shipmentId, currency), kind: 'ESCROW', ownerId: shipmentId, currency },
          amount: BigInt(legFees + platformFee),
        },
        {
          account: { id: insurancePoolAccountId(currency), kind: 'INSURANCE_POOL', currency },
          amount: BigInt(premium),
        },
      ],
    });

    // Demo only: the OTP is returned once here (mock SMS). Production sends
    // it to the receiver out of band. Replays get null — the code was issued.
    const otp = String(randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 4);
    let otpIssued: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.updateMany({
        where: { id: shipmentId, status: 'APPROVED' },
        data: { status: 'FUNDED', version: { increment: 1 } },
      });
      const stamped = await tx.shipment.updateMany({
        where: { id: shipmentId, deliveryOtpHash: null },
        data: { deliveryOtpHash: otpHash },
      });
      if (stamped.count === 1) otpIssued = otp;
      await tx.leg.updateMany({
        where: { shipmentId, status: 'ACCEPTED' },
        data: { status: 'AWAITING_PICKUP' },
      });
      await tx.insurancePolicy.upsert({
        where: { shipmentId },
        create: { shipmentId, coverage: shipment.declaredValue, premium, currency, status: 'ACTIVE' },
        update: {},
      });
      await this.outbox.write(tx, 'escrow.funded', { shipmentId, total });
    });

    const updated = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    return { duplicate: posted.duplicate, deliveryOtp: otpIssued, shipment: serializeLedger(updated) };
  }

  private async assertNotFrozen(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (shipment?.status === 'DISPUTED') {
      throw new BadRequestException('Escrow frozen by dispute');
    }
    const open = await this.prisma.dispute.findFirst({
      where: { shipmentId, status: 'OPEN' },
    });
    if (open) throw new BadRequestException('Escrow frozen by dispute');
  }

  // Hybrid payout part 1: release the configured fraction of a leg fee to the
  // carrier at verified handoff. Remainder follows at final delivery.
  async releasePartial(legId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: { trip: { select: { carrierId: true } } },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    await this.assertNotFrozen(leg.shipmentId);
    const amount = (BigInt(leg.fee) * BigInt(FIRST_RELEASE_BPS)) / BigInt(10000);
    const currency = leg.currency;
    const carrierId = leg.trip.carrierId;
    await this.ledger.post({
      type: 'RELEASE_LEG',
      idempotencyKey: `release:${legId}:partial`,
      shipmentId: leg.shipmentId,
      entries: [
        {
          account: { id: escrowAccountId(leg.shipmentId, currency), kind: 'ESCROW', ownerId: leg.shipmentId, currency },
          amount: -amount,
        },
        {
          account: { id: walletAccountId(carrierId, currency), kind: 'USER_WALLET', ownerId: carrierId, currency },
          amount,
        },
      ],
    });
    return serializeLedger({ legId, released: amount });
  }

  // Hybrid payout part 2: release whatever of the leg fee remains in escrow.
  async releaseRemainder(legId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: { trip: { select: { carrierId: true } } },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    await this.assertNotFrozen(leg.shipmentId);
    const currency = leg.currency;
    const carrierId = leg.trip.carrierId;
    const carrierWallet = walletAccountId(carrierId, currency);
    const partial = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: `release:${legId}:partial` },
      include: { entries: true },
    });
    const already = partial
      ? (partial.entries.find((e) => e.accountId === carrierWallet)?.amount ?? BigInt(0))
      : BigInt(0);
    const remainder = BigInt(leg.fee) - already;
    if (remainder <= BigInt(0)) {
      return serializeLedger({ legId, released: BigInt(0), duplicate: true });
    }
    await this.ledger.post({
      type: 'RELEASE_LEG',
      idempotencyKey: `release:${legId}:final`,
      shipmentId: leg.shipmentId,
      entries: [
        {
          account: { id: escrowAccountId(leg.shipmentId, currency), kind: 'ESCROW', ownerId: leg.shipmentId, currency },
          amount: -remainder,
        },
        {
          account: { id: carrierWallet, kind: 'USER_WALLET', ownerId: carrierId, currency },
          amount: remainder,
        },
      ],
    });
    return serializeLedger({ legId, released: remainder });
  }

  async releasePlatformFee(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { legs: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    await this.assertNotFrozen(shipmentId);
    const currency = shipment.currency;
    const fee = platformFeeFor(shipment.legs.reduce((sum, leg) => sum + leg.fee, 0));
    await this.ledger.post({
      type: 'PLATFORM_FEE',
      idempotencyKey: `platform:${shipmentId}`,
      shipmentId,
      entries: [
        {
          account: { id: escrowAccountId(shipmentId, currency), kind: 'ESCROW', ownerId: shipmentId, currency },
          amount: -BigInt(fee),
        },
        {
          account: { id: revenueAccountId(currency), kind: 'REVENUE', currency },
          amount: BigInt(fee),
        },
      ],
    });
    return serializeLedger({ shipmentId, released: fee });
  }

  // Full refund before pickup: escrow and premium both return to the sender.
  // Anything in transit or later goes through disputes instead.
  async refundShipment(shipmentId: string, senderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { legs: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.senderId !== senderId) throw new ForbiddenException('Not your shipment');
    if (shipment.status !== 'FUNDED') {
      throw new BadRequestException(`Refund needs a FUNDED shipment, got ${shipment.status}`);
    }
    const currency = shipment.currency;
    const escrowBalance = await this.ledger.balance(escrowAccountId(shipmentId, currency));
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { shipmentId } });

    await this.ledger.post({
      type: 'REFUND',
      idempotencyKey: `refund:${shipmentId}`,
      shipmentId,
      entries: [
        {
          account: { id: escrowAccountId(shipmentId, currency), kind: 'ESCROW', ownerId: shipmentId, currency },
          amount: -escrowBalance,
        },
        {
          account: { id: walletAccountId(senderId, currency), kind: 'USER_WALLET', ownerId: senderId, currency },
          amount: escrowBalance,
        },
      ],
    });
    if (policy && policy.status === 'ACTIVE') {
      await this.ledger.post({
        type: 'REFUND',
        idempotencyKey: `premium-refund:${shipmentId}`,
        shipmentId,
        entries: [
          {
            account: { id: insurancePoolAccountId(currency), kind: 'INSURANCE_POOL', currency },
            amount: -BigInt(policy.premium),
          },
          {
            account: { id: walletAccountId(senderId, currency), kind: 'USER_WALLET', ownerId: senderId, currency },
            amount: BigInt(policy.premium),
          },
        ],
      });
      await this.prisma.insurancePolicy.update({
        where: { shipmentId },
        data: { status: 'CANCELLED' },
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.updateMany({
        where: { id: shipmentId, status: 'FUNDED' },
        data: { status: 'REFUNDED', version: { increment: 1 } },
      });
      await this.outbox.write(tx, 'escrow.refunded', { shipmentId });
    });
    return { shipmentId, refunded: serializeLedger(escrowBalance) };
  }
}
