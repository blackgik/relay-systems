import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import {
  LEG_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  assertTransition,
} from '../../common/state-machine/transitions';
import { EscrowService } from '../ledger/escrow.service';
import { DeliverDto, HandoffDto } from './custody.dto';

const TOKEN_TTL = '10m';

function secret() {
  return process.env.JWT_SECRET ?? 'relay-dev-secret';
}

// LocationPing ids are bigints, which JSON.stringify (HTTP and socket.io) rejects.
function serializePing<T extends { id: bigint }>(ping: T) {
  return { ...ping, id: ping.id.toString() };
}

interface HandoffClaims {
  sub: string;
  legId: string;
  shipmentId: string;
  nonce: string;
  code: string;
}

@Injectable()
export class CustodyService {
  constructor(
    private prisma: PrismaService,
    private escrow: EscrowService,
    private outbox: OutboxService
  ) {}

  // The taker (next custodian) requests a token and shows it as a QR. The
  // 6-digit code is a human verification ritual: after scanning, the giver's
  // screen shows the same code the taker sees, like Bluetooth pairing.
  async requestHandoffToken(legId: string, takerId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: { trip: { select: { carrierId: true } }, shipment: { select: { status: true } } },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== takerId) throw new ForbiddenException('Not your leg');
    if (leg.status !== 'AWAITING_PICKUP') {
      throw new BadRequestException(`Leg is ${leg.status}, cannot take custody`);
    }
    if (!['FUNDED', 'IN_TRANSIT'].includes(leg.shipment.status)) {
      throw new BadRequestException(`Shipment is ${leg.shipment.status}`);
    }
    const code = String(randomInt(100000, 1000000));
    const token = jwt.sign(
      { sub: takerId, legId, shipmentId: leg.shipmentId, nonce: randomUUID(), code },
      secret(),
      { expiresIn: TOKEN_TTL, audience: 'handoff' }
    );
    return { token, code, expiresInSeconds: 600 };
  }

  // The giver (current custodian) scans the taker's QR and submits. Seal ID
  // must match from the second handoff on; mismatch freezes escrow.
  async handoff(callerId: string, dto: HandoffDto) {
    const replay = await this.prisma.custodyEvent.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (replay) return { duplicate: true, event: replay, code: null as string | null };

    let claims: HandoffClaims;
    try {
      claims = jwt.verify(dto.token, secret(), { audience: 'handoff' }) as HandoffClaims;
    } catch {
      throw new BadRequestException('Invalid or expired handoff token');
    }
    if (!claims.legId || !claims.sub || !claims.nonce) {
      throw new BadRequestException('Malformed handoff token');
    }

    const leg = await this.prisma.leg.findUnique({
      where: { id: claims.legId },
      include: {
        trip: { select: { carrierId: true } },
        shipment: { include: { legs: { include: { trip: { select: { carrierId: true } } } } } },
      },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    // Rebind: the token must name this leg's carrier, and this leg must be waiting.
    if (claims.sub !== leg.trip.carrierId || leg.status !== 'AWAITING_PICKUP') {
      throw new BadRequestException('Token does not match a pending handoff');
    }
    if (claims.shipmentId !== leg.shipmentId) {
      throw new BadRequestException('Token shipment mismatch');
    }
    await this.assertNoOpenDispute(leg.shipmentId);

    const ordered = [...leg.shipment.legs].sort((a, b) => a.sequence - b.sequence);
    const isPickup = leg.sequence === 0;
    const giverId = isPickup
      ? leg.shipment.senderId
      : ordered.find((l) => l.sequence === leg.sequence - 1)!.trip.carrierId;
    if (callerId !== giverId) {
      throw new ForbiddenException('Only the current custodian can hand off');
    }
    if (!isPickup) {
      const prev = ordered.find((l) => l.sequence === leg.sequence - 1)!;
      if (prev.status !== 'IN_CUSTODY') {
        throw new BadRequestException('Previous leg is not in custody');
      }
      if (!leg.shipment.sealId || leg.shipment.sealId !== dto.sealId) {
        return this.sealMismatch(leg.shipmentId, leg.id, callerId, leg.shipment.sealId, dto.sealId, claims.nonce);
      }
    }

    try {
      const event = await this.prisma.$transaction(async (tx) => {
        await tx.processedEvent.create({ data: { id: `handoff-nonce:${claims.nonce}` } });
        const created = await tx.custodyEvent.create({
          data: {
            shipmentId: leg.shipmentId,
            legId: leg.id,
            type: isPickup ? 'PICKUP' : 'TRANSFER',
            fromUserId: giverId,
            toUserId: claims.sub,
            sealId: dto.sealId,
            photos: dto.photos,
            lat: dto.lat,
            lng: dto.lng,
            idempotencyKey: dto.idempotencyKey,
            occurredAt: new Date(),
          },
        });
        assertTransition(LEG_TRANSITIONS, 'leg', 'AWAITING_PICKUP', 'IN_CUSTODY');
        await tx.leg.updateMany({
          where: { id: leg.id, version: leg.version },
          data: { status: 'IN_CUSTODY', version: { increment: 1 } },
        });
        if (isPickup) {
          assertTransition(SHIPMENT_TRANSITIONS, 'shipment', leg.shipment.status, 'IN_TRANSIT');
          await tx.shipment.update({
            where: { id: leg.shipmentId },
            data: { status: 'IN_TRANSIT', sealId: dto.sealId, version: { increment: 1 } },
          });
        } else {
          const prev = ordered.find((l) => l.sequence === leg.sequence - 1)!;
          assertTransition(LEG_TRANSITIONS, 'leg', 'IN_CUSTODY', 'HANDED_OFF');
          await tx.leg.updateMany({
            where: { id: prev.id, version: prev.version },
            data: { status: 'HANDED_OFF', version: { increment: 1 } },
          });
        }
        await this.outbox.write(tx, 'custody.transferred', {
          shipmentId: leg.shipmentId,
          legId: leg.id,
          from: giverId,
          to: claims.sub,
        });
        return created;
      });

      if (!isPickup) {
        const prev = ordered.find((l) => l.sequence === leg.sequence - 1)!;
        await this.escrow.releasePartial(prev.id);
      }
      return { duplicate: false, event, code: claims.code };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.custodyEvent.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return { duplicate: true, event: existing, code: claims.code };
        throw new ConflictException('Handoff token already used');
      }
      throw e;
    }
  }

  private async sealMismatch(
    shipmentId: string,
    legId: string,
    openedBy: string,
    expected: string | null,
    received: string,
    nonce: string
  ): Promise<never> {
    await this.prisma.$transaction(async (tx) => {
      try {
        await tx.processedEvent.create({ data: { id: `handoff-nonce:${nonce}` } });
      } catch {
        // Nonce already recorded — the dispute still stands.
      }
      await tx.dispute.create({
        data: {
          shipmentId,
          legId,
          openedBy,
          reason: 'SEAL_MISMATCH',
          evidence: { expected, received },
          status: 'OPEN',
        },
      });
      await tx.shipment.updateMany({
        where: { id: shipmentId, status: 'IN_TRANSIT' },
        data: { status: 'DISPUTED', version: { increment: 1 } },
      });
      await this.outbox.write(tx, 'custody.mismatch', { shipmentId, legId, expected, received });
    });
    throw new BadRequestException('Seal mismatch: escrow frozen, dispute opened for the arbiter');
  }

  // Final delivery: the receiver's one-time code confirms receipt. Releases
  // every leg remainder plus the platform fee.
  async deliver(shipmentId: string, carrierId: string, dto: DeliverDto) {
    const replay = await this.prisma.custodyEvent.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (replay) return { duplicate: true, event: replay };

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { legs: { orderBy: { sequence: 'asc' } } },
      omit: { deliveryOtpHash: false },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    const legs = shipment.legs;
    const last = legs[legs.length - 1];
    const lastTrip = await this.prisma.trip.findUnique({ where: { id: last.tripId } });
    if (!lastTrip || lastTrip.carrierId !== carrierId) {
      throw new ForbiddenException('Only the final carrier can deliver');
    }
    if (shipment.status !== 'IN_TRANSIT' || last.status !== 'IN_CUSTODY') {
      throw new BadRequestException('Shipment is not out for final delivery');
    }
    await this.assertNoOpenDispute(shipmentId);
    const ok =
      !!shipment.deliveryOtpHash && (await bcrypt.compare(dto.otp, shipment.deliveryOtpHash));
    if (!ok) throw new BadRequestException('Invalid delivery code');

    try {
      const event = await this.prisma.$transaction(async (tx) => {
        const created = await tx.custodyEvent.create({
          data: {
            shipmentId,
            legId: last.id,
            type: 'DELIVERY',
            fromUserId: carrierId,
            toUserId: null,
            sealId: shipment.sealId ?? 'unrecorded',
            photos: dto.photos,
            idempotencyKey: dto.idempotencyKey,
            occurredAt: new Date(),
          },
        });
        assertTransition(LEG_TRANSITIONS, 'leg', 'IN_CUSTODY', 'HANDED_OFF');
        await tx.leg.updateMany({
          where: { id: last.id, version: last.version },
          data: { status: 'HANDED_OFF', version: { increment: 1 } },
        });
        await tx.leg.updateMany({
          where: { shipmentId, status: 'HANDED_OFF' },
          data: { status: 'SETTLED' },
        });
        assertTransition(SHIPMENT_TRANSITIONS, 'shipment', 'IN_TRANSIT', 'DELIVERED');
        await tx.shipment.updateMany({
          where: { id: shipmentId, version: shipment.version },
          data: { status: 'DELIVERED', version: { increment: 1 } },
        });
        await this.outbox.write(tx, 'shipment.delivered', { shipmentId });
        return created;
      });

      for (const leg of legs) {
        await this.escrow.releaseRemainder(leg.id);
      }
      await this.escrow.releasePlatformFee(shipmentId);
      return { duplicate: false, event };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.custodyEvent.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return { duplicate: true, event: existing };
      }
      throw e;
    }
  }

  // Receiver confirms condition (or the dispute window lapses — a scheduled
  // worker would call this automatically; the sender can confirm early).
  async complete(shipmentId: string, senderId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.senderId !== senderId) throw new ForbiddenException('Not your shipment');
    assertTransition(SHIPMENT_TRANSITIONS, 'shipment', shipment.status, 'COMPLETED');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: 'COMPLETED', version: { increment: 1 } },
      });
      await tx.insurancePolicy.updateMany({
        where: { shipmentId, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      });
      await this.outbox.write(tx, 'shipment.completed', { shipmentId });
      return updated;
    });
  }

  async ping(shipmentId: string, carrierId: string, lat: number, lng: number) {
    const held = await this.prisma.leg.findFirst({
      where: { shipmentId, status: 'IN_CUSTODY', trip: { carrierId } },
    });
    if (!held) throw new ForbiddenException('Only the current custodian shares location');
    const ping = await this.prisma.locationPing.create({
      data: { shipmentId, carrierId, lat, lng, at: new Date() },
    });
    return serializePing(ping);
  }

  async track(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { legs: { include: { trip: { select: { carrierId: true } } } } },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    const isParty =
      shipment.senderId === userId ||
      shipment.legs.some((leg) => leg.trip.carrierId === userId);
    if (!isParty) throw new ForbiddenException('Not your shipment');
    const [custody, pings, legs] = await Promise.all([
      this.prisma.custodyEvent.findMany({
        where: { shipmentId },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.locationPing.findMany({
        where: { shipmentId },
        orderBy: { at: 'desc' },
        take: 100,
      }),
      this.prisma.leg.findMany({
        where: { shipmentId },
        orderBy: { sequence: 'asc' },
        include: { trip: { include: { carrier: { select: { handle: true, kycTier: true, rating: true } } } } },
      }),
    ]);
    // Carriers on the shipment can track it too, so the receiver's
    // delivery-code hash stays server-side.
    const { deliveryOtpHash: _otp, legs: _legs, ...safeShipment } = shipment;
    return { shipment: safeShipment, legs, custody, pings: pings.reverse().map(serializePing) };
  }

  private async assertNoOpenDispute(shipmentId: string) {
    const open = await this.prisma.dispute.findFirst({
      where: { shipmentId, status: 'OPEN' },
    });
    if (open) throw new BadRequestException('Shipment is under dispute; escrow frozen');
  }
}
