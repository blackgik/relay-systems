import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Shipment, ShipmentStatus } from '@prisma/client';
import { ACCEPT_DEADLINE_HOURS, TRANSFER_BUFFER_HOURS } from '@relay/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import {
  LEG_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  assertTransition,
} from '../../common/state-machine/transitions';
import { meetsTier } from '../kyc/kyc-tiers';
import { TripsService } from '../trips/trips.service';
import { RoutingService, TripCandidate } from '../routing/routing.service';
import { CreateShipmentDto } from './shipments.dto';

const HOUR_MS = 3600_000;
const TRANSFER_BUFFER_MS = TRANSFER_BUFFER_HOURS * HOUR_MS;
const DEADLINE_MS = ACCEPT_DEADLINE_HOURS * HOUR_MS;
const SEARCH_HORIZON_DAYS = 30;

type TripWithCarrier = Prisma.TripGetPayload<{ include: { carrier: { select: { kycTier: true } } } }>;

function toCandidate(trip: TripWithCarrier): TripCandidate {
  return {
    id: trip.id,
    carrierId: trip.carrierId,
    carrierTier: trip.carrier.kycTier,
    originCity: trip.originCity,
    destCity: trip.destCity,
    departAt: trip.departAt,
    arriveAt: trip.arriveAt,
    remainingKg: trip.remainingKg,
    pricePerKg: trip.pricePerKg,
    currency: trip.currency,
    categories: trip.categories,
    international: trip.international,
  };
}

function publicTrip<T extends { carrierId: string }>(trip: T): Omit<T, 'carrierId'> {
  const { carrierId: _carrierId, ...rest } = trip;
  return rest;
}

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma: PrismaService,
    private trips: TripsService,
    private routing: RoutingService,
    private outbox: OutboxService
  ) {}

  async create(senderId: string, dto: CreateShipmentDto) {
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');
    if (!meetsTier(sender.kycTier, 'T1')) {
      throw new ForbiddenException('Sending requires KYC tier T1');
    }
    return this.prisma.shipment.create({
      data: {
        senderId,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        originCity: dto.originCity,
        destCity: dto.destCity,
        category: dto.category,
        weightKg: dto.weightKg,
        declaredValue: dto.declaredValue,
        currency: dto.currency.toUpperCase(),
        photos: dto.photos,
        receiptUrl: dto.receiptUrl,
        sourceUrl: dto.sourceUrl,
        status: 'DRAFT',
      },
    });
  }

  async routes(shipmentId: string, senderId: string) {
    const shipment = await this.owned(shipmentId, senderId);
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');

    const now = new Date();
    const horizon = new Date(now.getTime() + SEARCH_HORIZON_DAYS * 24 * HOUR_MS);
    const trips = await this.trips.findCandidates(now, horizon);
    const byId = new Map(trips.map((t) => [t.id, t]));
    const found = this.routing.search(
      trips.map(toCandidate),
      {
        originCity: shipment.originCity,
        destCity: shipment.destCity,
        readyAt: now,
        weightKg: shipment.weightKg,
        category: shipment.category,
        currency: shipment.currency,
        senderTier: sender.kycTier,
      }
    );
    return {
      shipmentId,
      routes: found.map((route) => ({
        legs: route.legs.map((leg) => ({
          // Senders browsing routes see couriers by handle; the account id stays server-side.
          trip: publicTrip(byId.get(leg.trip.id)!),
          fee: leg.fee,
          acceptDeadline: new Date(leg.trip.departAt.getTime() - DEADLINE_MS),
        })),
        totalPrice: route.totalPrice,
        currency: route.currency,
        departAt: route.departAt,
        arriveAt: route.arriveAt,
      })),
    };
  }

  async selectRoute(shipmentId: string, senderId: string, tripIds: string[]) {
    const shipment = await this.owned(shipmentId, senderId);
    if (!['DRAFT', 'ROUTED', 'REROUTING'].includes(shipment.status)) {
      throw new BadRequestException(`Cannot select a route while shipment is ${shipment.status}`);
    }
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');

    const found = await this.prisma.trip.findMany({
      where: { id: { in: tripIds } },
      include: { carrier: { select: { kycTier: true } } },
    });
    if (found.length !== tripIds.length) {
      throw new NotFoundException('One or more trips not found');
    }
    const trips = tripIds.map((id) => found.find((t) => t.id === id)!);
    this.validateChain(shipment, sender.kycTier, trips);

    const now = new Date();
    const weight = Math.ceil(shipment.weightKg);
    const legs = trips.map((trip, sequence) => ({
      tripId: trip.id,
      sequence,
      fee: Math.ceil(trip.pricePerKg * shipment.weightKg),
      currency: trip.currency,
      acceptDeadline: new Date(trip.departAt.getTime() - DEADLINE_MS),
    }));

    return this.prisma.$transaction(async (tx) => {
      // Release any previous attempt's legs before reserving the new chain.
      const old = await tx.leg.findMany({
        where: { shipmentId, status: { in: ['PROPOSED', 'ACCEPTED'] } },
        select: { id: true, tripId: true },
      });
      if (old.length) {
        await tx.leg.updateMany({
          where: { id: { in: old.map((l) => l.id) } },
          data: { status: 'EXPIRED' },
        });
        for (const leg of old) {
          await tx.trip.update({
            where: { id: leg.tripId },
            data: { remainingKg: { increment: weight } },
          });
        }
      }
      for (const trip of trips) {
        await tx.trip.update({
          where: { id: trip.id },
          data: { remainingKg: { decrement: weight } },
        });
      }
      for (const leg of legs) {
        await tx.leg.create({ data: { shipmentId, ...leg, status: 'PROPOSED' } });
        await this.outbox.write(tx, 'leg.requested', { shipmentId, tripId: leg.tripId });
      }
      let status = shipment.status;
      const steps = (
        status === 'DRAFT' ? ['ROUTED', 'AWAITING_APPROVAL'] : ['AWAITING_APPROVAL']
      ) as ShipmentStatus[];
      for (const next of steps) {
        assertTransition(SHIPMENT_TRANSITIONS, 'shipment', status, next);
        status = next;
      }
      const totalPrice = legs.reduce((sum, leg) => sum + leg.fee, 0);
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status, totalPrice, version: { increment: 1 } },
        include: { legs: { orderBy: { sequence: 'asc' } } },
      });
      await this.outbox.write(tx, 'shipment.routed', { shipmentId, tripIds, at: now.toISOString() });
      return updated;
    });
  }

  private validateChain(
    shipment: Shipment,
    senderTier: 'T0' | 'T1' | 'T2',
    trips: TripWithCarrier[]
  ) {
    const now = Date.now();
    const weight = Math.ceil(shipment.weightKg);
    trips.forEach((trip, i) => {
      if (trip.status !== 'OPEN') throw new BadRequestException(`Trip ${trip.id} is not open`);
      if (trip.currency !== shipment.currency) {
        throw new BadRequestException(`Trip ${trip.id} is priced in ${trip.currency}`);
      }
      if (trip.remainingKg < weight) {
        throw new BadRequestException(`Trip ${trip.id} lacks capacity`);
      }
      if (!trip.categories.includes(shipment.category)) {
        throw new BadRequestException(`Trip ${trip.id} does not accept ${shipment.category}`);
      }
      if (trip.departAt.getTime() - DEADLINE_MS < now) {
        throw new BadRequestException(`Trip ${trip.id} is past its request window`);
      }
      if (trip.international && (senderTier !== 'T2' || trip.carrier.kycTier !== 'T2')) {
        throw new BadRequestException(`Trip ${trip.id} requires Tier 2 on both sides`);
      }
      if (i === 0 && trip.originCity !== shipment.originCity) {
        throw new BadRequestException('First leg must start at the shipment origin');
      }
      if (i > 0) {
        const prev = trips[i - 1];
        if (prev.destCity !== trip.originCity) {
          throw new BadRequestException(`Leg ${i} does not continue from leg ${i - 1}`);
        }
        if (trip.departAt.getTime() - prev.arriveAt.getTime() < TRANSFER_BUFFER_MS) {
          throw new BadRequestException(`Leg ${i} leaves too soon after the previous arrival`);
        }
      }
      if (i === trips.length - 1 && trip.destCity !== shipment.destCity) {
        throw new BadRequestException('Last leg must end at the shipment destination');
      }
    });
  }

  // The sender's own shipments, newest first. Powers the dashboard's
  // "packages sent" stats; capped so a heavy sender can't page unbounded.
  async listMine(senderId: string) {
    return this.prisma.shipment.findMany({
      where: { senderId },
      include: { legs: { include: { trip: true }, orderBy: { sequence: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async get(id: string, userId: string) {
    const shipment = await this.visible(id, userId);
    return shipment;
  }

  async timeline(id: string, userId: string) {
    const shipment = await this.visible(id, userId);
    const custody = await this.prisma.custodyEvent.findMany({
      where: { shipmentId: id },
      orderBy: { occurredAt: 'asc' },
    });
    return { shipment, custody };
  }

  async getLeg(legId: string, userId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: {
        trip: true,
        shipment: { select: { id: true, senderId: true, status: true, originCity: true, destCity: true } },
      },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== userId && leg.shipment.senderId !== userId) {
      throw new ForbiddenException('Not your leg');
    }
    return leg;
  }

  async acceptLeg(legId: string, carrierId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: { trip: true, shipment: true },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== carrierId) throw new ForbiddenException('Not your leg');
    if (leg.status !== 'PROPOSED') {
      throw new BadRequestException(`Leg is ${leg.status}, cannot accept`);
    }
    if (Date.now() > leg.acceptDeadline.getTime()) {
      await this.expireLeg(leg.shipment, leg.id, leg.tripId, leg.shipment.weightKg);
      throw new BadRequestException('Accept deadline passed; shipment returned to routing');
    }

    return this.prisma.$transaction(async (tx) => {
      assertTransition(LEG_TRANSITIONS, 'leg', 'PROPOSED', 'ACCEPTED');
      const accepted = await tx.leg.updateMany({
        where: { id: legId, version: leg.version },
        data: { status: 'ACCEPTED', version: { increment: 1 } },
      });
      if (accepted.count === 0) throw new ConflictException('Leg changed concurrently');
      await this.outbox.write(tx, 'leg.accepted', { legId, shipmentId: leg.shipmentId });

      const pending = await tx.leg.count({
        where: { shipmentId: leg.shipmentId, status: 'PROPOSED' },
      });
      let shipmentStatus = leg.shipment.status;
      if (pending === 0) {
        assertTransition(SHIPMENT_TRANSITIONS, 'shipment', shipmentStatus, 'APPROVED');
        const approved = await tx.shipment.updateMany({
          where: { id: leg.shipmentId, version: leg.shipment.version },
          data: { status: 'APPROVED', version: { increment: 1 } },
        });
        if (approved.count === 0) throw new ConflictException('Shipment changed concurrently');
        shipmentStatus = 'APPROVED';
        await this.outbox.write(tx, 'shipment.approved', { shipmentId: leg.shipmentId });
      }
      return { legId, shipmentStatus };
    });
  }

  async rejectLeg(legId: string, carrierId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: { shipment: true, trip: { select: { carrierId: true } } },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== carrierId) throw new ForbiddenException('Not your leg');
    if (leg.status !== 'PROPOSED') {
      throw new BadRequestException(`Leg is ${leg.status}, cannot reject`);
    }

    return this.prisma.$transaction(async (tx) => {
      assertTransition(LEG_TRANSITIONS, 'leg', 'PROPOSED', 'REJECTED');
      const rejected = await tx.leg.updateMany({
        where: { id: legId, version: leg.version },
        data: { status: 'REJECTED', version: { increment: 1 } },
      });
      if (rejected.count === 0) throw new ConflictException('Leg changed concurrently');
      await tx.trip.update({
        where: { id: leg.tripId },
        data: { remainingKg: { increment: Math.ceil(leg.shipment.weightKg) } },
      });
      let shipmentStatus = leg.shipment.status;
      if (shipmentStatus === 'AWAITING_APPROVAL') {
        assertTransition(SHIPMENT_TRANSITIONS, 'shipment', shipmentStatus, 'REROUTING');
        await tx.shipment.updateMany({
          where: { id: leg.shipmentId, version: leg.shipment.version },
          data: { status: 'REROUTING', version: { increment: 1 } },
        });
        shipmentStatus = 'REROUTING';
      }
      await this.outbox.write(tx, 'leg.rejected', { legId, shipmentId: leg.shipmentId });
      return { legId, shipmentStatus };
    });
  }

  private async expireLeg(
    shipment: Shipment,
    legId: string,
    tripId: string,
    weightKg: number
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.leg.updateMany({
        where: { id: legId, status: 'PROPOSED' },
        data: { status: 'EXPIRED', version: { increment: 1 } },
      });
      await tx.trip.update({
        where: { id: tripId },
        data: { remainingKg: { increment: Math.ceil(weightKg) } },
      });
      if (shipment.status === 'AWAITING_APPROVAL') {
        await tx.shipment.updateMany({
          where: { id: shipment.id, version: shipment.version },
          data: { status: 'REROUTING', version: { increment: 1 } },
        });
      }
      await this.outbox.write(tx, 'leg.expired', { legId, shipmentId: shipment.id });
    });
  }

  async myLegs(carrierId: string) {
    return this.prisma.leg.findMany({
      where: { trip: { carrierId } },
      include: {
        trip: true,
        shipment: {
          select: {
            id: true,
            status: true,
            originCity: true,
            destCity: true,
            category: true,
            weightKg: true,
            photos: true,
            sender: { select: { handle: true, rating: true, kycTier: true } },
          },
        },
      },
      orderBy: { acceptDeadline: 'asc' },
    });
  }

  private async owned(shipmentId: string, senderId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.senderId !== senderId) throw new ForbiddenException('Not your shipment');
    return shipment;
  }

  private async visible(id: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        legs: {
          orderBy: { sequence: 'asc' },
          include: {
            trip: {
              include: { carrier: { select: { id: true, handle: true, rating: true, kycTier: true } } },
            },
          },
        },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    const isCarrier = shipment.legs.some((leg) => leg.trip.carrierId === userId);
    if (shipment.senderId !== userId && !isCarrier) {
      throw new ForbiddenException('Not your shipment');
    }
    return shipment;
  }
}
