import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { meetsTier } from '../kyc/kyc-tiers';
import { KycService } from '../kyc/kyc.service';
import { CreateTripDto, JOURNEY_STAGES, TravelProofDto, UpdateTripDto } from './trips.dto';

// Leg states that mean the package is (or was) in this carrier's hands.
const CARRIED = ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF', 'SETTLED'] as const;
// Leg states where the fee is earned money, not just a pending request.
const EARNED = ['HANDED_OFF', 'SETTLED'] as const;

interface MyTripLeg {
  id: string;
  status: string;
  fee: number;
  senderRating: number | null;
  shipment: { id: string; category: string; weightKg: number; status: string; attestation: { reference: string } | null };
}

/** What one of the carrier's own trips carried, earned and was rated. */
export function myTripStats(legs: MyTripLeg[]) {
  const carried = legs.filter((l) => (CARRIED as readonly string[]).includes(l.status));
  const rated = carried.filter((l) => l.senderRating !== null);
  return {
    stats: {
      packagesCarried: carried.length,
      kgCarried: Math.round(carried.reduce((s, l) => s + l.shipment.weightKg, 0) * 10) / 10,
      earned: legs.filter((l) => (EARNED as readonly string[]).includes(l.status)).reduce((s, l) => s + l.fee, 0),
      bookedFees: carried.reduce((s, l) => s + l.fee, 0),
      delivered: legs.filter((l) => l.status === 'SETTLED').length,
      rating: rated.length ? Math.round((rated.reduce((s, l) => s + l.senderRating!, 0) / rated.length) * 10) / 10 : null,
      ratings: rated.length,
    },
    // Packages in the bag (and requests waiting on it), by shipment, never by sender.
    packages: legs
      .filter((l) => l.status === 'PROPOSED' || (CARRIED as readonly string[]).includes(l.status))
      .map((l) => ({
        legId: l.id,
        shipmentId: l.shipment.id,
        status: l.status,
        category: l.shipment.category,
        weightKg: l.shipment.weightKg,
        fee: l.fee,
        rating: l.senderRating,
        declaration: l.shipment.attestation?.reference ?? null,
      })),
  };
}

export interface TripSearchFilters {
  origin?: string;
  dest?: string;
  from?: string;
  to?: string;
  carrierId?: string;
}

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private outbox: OutboxService,
    private kyc: KycService
  ) {}

  async create(carrierId: string, dto: CreateTripDto) {
    const carrier = await this.prisma.user.findUnique({ where: { id: carrierId } });
    if (!carrier) throw new NotFoundException('Carrier not found');
    const required = dto.international ? 'T2' : 'T1';
    if (!meetsTier(carrier.kycTier, required)) {
      throw new ForbiddenException(`Carrying this trip requires KYC tier ${required}`);
    }
    const departAt = new Date(dto.departAt);
    const arriveAt = new Date(dto.arriveAt);
    if (!(arriveAt > departAt)) {
      throw new BadRequestException('arriveAt must be after departAt');
    }
    return this.prisma.trip.create({
      data: {
        carrierId,
        originCity: dto.originCity,
        destCity: dto.destCity,
        departAt,
        arriveAt,
        mode: dto.mode,
        flightNumber: dto.flightNumber,
        capacityKg: dto.capacityKg,
        remainingKg: dto.capacityKg,
        pricePerKg: dto.pricePerKg,
        currency: dto.currency.toUpperCase(),
        categories: dto.categories,
        international: dto.international,
        excludedItems: (dto.excludedItems ?? []).map((s) => s.trim()).filter(Boolean),
        excludedFeePerKg: dto.excludedFeePerKg ?? null,
        status: 'OPEN',
      },
    });
  }

  list(filters: TripSearchFilters) {
    // Public search only ever shows open trips. "My trips" (carrierId set)
    // shows the carrier's whole history — former, cancelled and completed
    // trips included — with what each trip carried and earned.
    const where: Prisma.TripWhereInput = filters.carrierId
      ? { carrierId: filters.carrierId }
      : { status: 'OPEN' };
    if (filters.origin) where.originCity = filters.origin;
    if (filters.dest) where.destCity = filters.dest;
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      throw new BadRequestException('from must be before to');
    }
    if (filters.from || filters.to) {
      where.departAt = {};
      if (filters.from) where.departAt.gte = new Date(filters.from);
      if (filters.to) where.departAt.lte = new Date(filters.to);
    }
    return this.prisma.trip
      .findMany({
        where,
        orderBy: { departAt: 'asc' },
        // Public listing: the carrier appears by handle only, and the
        // carrier's account id is stripped so trips can't be linked to a person.
        include: {
          carrier: { select: { handle: true, kycTier: true, rating: true } },
          _count: {
            select: { legs: { where: { status: { in: ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY'] } } } },
          },
          // Only loaded for "My trips"; powers the per-trip kg/earnings.
          ...(filters.carrierId
            ? {
                legs: {
                  orderBy: { acceptDeadline: 'asc' as const },
                  select: {
                    id: true,
                    status: true,
                    fee: true,
                    senderRating: true,
                    shipment: {
                      select: {
                        id: true,
                        category: true,
                        weightKg: true,
                        status: true,
                        attestation: { select: { reference: true } },
                      },
                    },
                  },
                },
              }
            : {}),
        },
      })
      .then((trips) =>
        filters.carrierId
          ? (trips as unknown as (Omit<(typeof trips)[number], 'legs'> & { legs?: MyTripLeg[] })[]).map(
              ({ legs = [], ...trip }) => ({ ...trip, ...myTripStats(legs) })
            )
          : trips.map(({ carrierId: _carrierId, ...trip }) => trip)
      );
  }

  async get(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  // Candidate pool for the routing engine: open trips in the search window
  // with their carrier's tier and rating attached.
  findCandidates(now: Date, horizon: Date) {
    return this.prisma.trip.findMany({
      where: { status: 'OPEN', departAt: { gte: now, lte: horizon }, remainingKg: { gt: 0 } },
      include: { carrier: { select: { handle: true, kycTier: true, rating: true } } },
      orderBy: { departAt: 'asc' },
    });
  }

  async update(id: string, carrierId: string, dto: UpdateTripDto) {
    const trip = await this.get(id);
    if (trip.carrierId !== carrierId) throw new ForbiddenException('Not your trip');

    if (dto.status === 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        const cancelled = await tx.trip.update({ where: { id }, data: { status: 'CANCELLED' } });
        // Release pending legs on this trip; their shipments go back to routing.
        const legs = await tx.leg.findMany({
          where: { tripId: id, status: { in: ['PROPOSED', 'ACCEPTED'] } },
          select: { id: true, shipmentId: true },
        });
        if (legs.length) {
          await tx.leg.updateMany({
            where: { id: { in: legs.map((l) => l.id) } },
            data: { status: 'EXPIRED' },
          });
          const shipmentIds = [...new Set(legs.map((l) => l.shipmentId))];
          await tx.shipment.updateMany({
            where: { id: { in: shipmentIds }, status: 'AWAITING_APPROVAL' },
            data: { status: 'REROUTING' },
          });
        }
        await this.outbox.write(tx, 'trip.cancelled', { tripId: id });
        return cancelled;
      });
    }

    if (dto.journeyStage) {
      if (trip.status === 'CANCELLED') throw new BadRequestException('A cancelled trip cannot move');
      const next = JOURNEY_STAGES.indexOf(dto.journeyStage as (typeof JOURNEY_STAGES)[number]);
      const current = JOURNEY_STAGES.indexOf(
        (trip.journeyStage ?? 'NOT_STARTED') as (typeof JOURNEY_STAGES)[number]
      );
      if (next <= current) {
        throw new BadRequestException(
          `Journey already at ${trip.journeyStage ?? 'NOT_STARTED'}; stages only move forward`
        );
      }
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.trip.update({ where: { id }, data: { journeyStage: dto.journeyStage } });
        await this.outbox.write(tx, 'trip.journey', { tripId: id, stage: dto.journeyStage });
        return updated;
      });
    }

    const data: Prisma.TripUpdateInput = {};
    if (dto.departAt) data.departAt = new Date(dto.departAt);
    if (dto.arriveAt) data.arriveAt = new Date(dto.arriveAt);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({ where: { id }, data });
      await this.outbox.write(tx, 'trip.delayed', {
        tripId: id,
        departAt: updated.departAt.toISOString(),
        arriveAt: updated.arriveAt.toISOString(),
      });
      return updated;
    });
  }

  async travelProof(id: string, carrierId: string, dto: TravelProofDto) {
    const trip = await this.get(id);
    if (trip.carrierId !== carrierId) throw new ForbiddenException('Not your trip');
    await this.kyc.start(carrierId, 'TRAVEL_PROOF');
    return this.prisma.trip.update({ where: { id }, data: { travelVerified: true } });
  }
}
