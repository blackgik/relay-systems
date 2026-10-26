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
import { CreateTripDto, TravelProofDto, UpdateTripDto } from './trips.dto';

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
        status: 'OPEN',
      },
    });
  }

  list(filters: TripSearchFilters) {
    const where: Prisma.TripWhereInput = { status: 'OPEN' };
    if (filters.carrierId) where.carrierId = filters.carrierId;
    if (filters.origin) where.originCity = filters.origin;
    if (filters.dest) where.destCity = filters.dest;
    if (filters.from || filters.to) {
      where.departAt = {};
      if (filters.from) where.departAt.gte = new Date(filters.from);
      if (filters.to) where.departAt.lte = new Date(filters.to);
    }
    return this.prisma.trip.findMany({ where, orderBy: { departAt: 'asc' } });
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
      include: { carrier: { select: { kycTier: true, rating: true } } },
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
