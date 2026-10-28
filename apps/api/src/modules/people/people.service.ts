import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { courierScore, tripPhase, tripProgress } from '../dashboard/metrics';
import { ACCEPT_DEADLINE_HOURS } from '@relay/shared';
import { generateHandle, handleProblem } from './handle';

// Everything returned from this service is visible to other users. It is
// keyed by handle only: no user ids, names, phones or emails ever leave here.

const BOOKED = ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY'] as const;
const FAILED_LEGS = ['LOST', 'NO_SHOW', 'DISPUTED'];

const boardTripInclude = {
  carrier: { select: { id: true, handle: true, kycTier: true, rating: true } },
  legs: {
    where: { status: { in: [...BOOKED] } },
    select: { status: true, shipment: { select: { weightKg: true } } },
  },
} satisfies Prisma.TripInclude;

type BoardTrip = Prisma.TripGetPayload<{ include: typeof boardTripInclude }>;

export function toBoardItem(trip: BoardTrip, viewerId: string | null, now = new Date()) {
  const onHand = trip.legs.filter((l) => l.status === 'IN_CUSTODY');
  // Couriers get ACCEPT_DEADLINE_HOURS to answer, so requests close that long
  // before departure. The board says so up front instead of letting a
  // request fail at submit time.
  const requestBy = new Date(trip.departAt.getTime() - ACCEPT_DEADLINE_HOURS * 3600 * 1000);
  return {
    tripId: trip.id,
    handle: trip.carrier.handle,
    tier: trip.carrier.kycTier,
    rating: trip.carrier.rating,
    verified: trip.carrier.kycTier !== 'T0',
    travelVerified: trip.travelVerified,
    isMine: viewerId === trip.carrier.id,
    mode: trip.mode,
    flightNumber: trip.flightNumber,
    originCity: trip.originCity,
    destCity: trip.destCity,
    departAt: trip.departAt,
    arriveAt: trip.arriveAt,
    phase: tripPhase(trip, now),
    progress: tripProgress(trip, now),
    capacityKg: trip.capacityKg,
    remainingKg: trip.remainingKg,
    bookedKg: trip.capacityKg - trip.remainingKg,
    packagesBooked: trip.legs.length,
    packagesOnHand: onHand.length,
    kgOnHand: onHand.reduce((s, l) => s + l.shipment.weightKg, 0),
    pricePerKg: trip.pricePerKg,
    currency: trip.currency,
    categories: trip.categories,
    international: trip.international,
    requestBy,
    bookable: trip.status === 'OPEN' && trip.remainingKg > 0 && requestBy > now,
  };
}

export type BoardItem = ReturnType<typeof toBoardItem>;

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  /** Make sure a user has a handle, generating a unique one if needed. */
  async ensureHandle(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { handle: true } });
    if (user.handle) return user.handle;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const handle = generateHandle();
        await this.prisma.user.update({ where: { id: userId }, data: { handle } });
        return handle;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ConflictException('Could not generate a username, try again');
  }

  async setHandle(userId: string, raw: string) {
    const handle = raw.trim().toLowerCase();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const problem = handleProblem(handle, user.fullName);
    if (problem) throw new BadRequestException(problem);
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { handle } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('That username is taken');
      }
      throw e;
    }
    return { handle };
  }

  /** Trips that are open for booking or currently on the road. */
  async board(viewerId: string, filters: { q?: string; phase?: string; take?: number }) {
    const now = new Date();
    const where: Prisma.TripWhereInput = { status: 'OPEN', arriveAt: { gt: now } };
    if (filters.phase === 'accepting') where.departAt = { gt: now };
    if (filters.phase === 'in_transit') where.departAt = { lte: now };
    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { originCity: { contains: q, mode: 'insensitive' } },
        { destCity: { contains: q, mode: 'insensitive' } },
        { carrier: { handle: { contains: q.toLowerCase() } } },
      ];
    }
    const trips = await this.prisma.trip.findMany({
      where,
      include: boardTripInclude,
      orderBy: { departAt: 'asc' },
      take: Math.min(filters.take ?? 24, 60),
    });
    return trips.map((t) => toBoardItem(t, viewerId, now));
  }

  async tripsFor(carrierId: string, viewerId: string, onlyActive = true) {
    const now = new Date();
    const trips = await this.prisma.trip.findMany({
      where: { carrierId, ...(onlyActive ? { status: 'OPEN', arriveAt: { gt: now } } : {}) },
      include: boardTripInclude,
      orderBy: { departAt: 'asc' },
    });
    return trips.map((t) => toBoardItem(t, viewerId, now));
  }

  /** Top verified couriers, ranked by rating with delivery volume as confidence. */
  async top(limit = 20) {
    const couriers = await this.prisma.user.findMany({
      where: { kycTier: { not: 'T0' }, handle: { not: null }, trips: { some: {} } },
      select: {
        handle: true,
        kycTier: true,
        rating: true,
        strikes: true,
        createdAt: true,
        trips: {
          select: {
            originCity: true,
            destCity: true,
            mode: true,
            status: true,
            departAt: true,
            arriveAt: true,
            legs: { select: { status: true, shipment: { select: { weightKg: true } } } },
          },
        },
      },
      take: 500,
    });
    const now = new Date();
    return couriers
      .map((c) => {
        const legs = c.trips.flatMap((t) => t.legs);
        const settled = legs.filter((l) => l.status === 'SETTLED');
        const failed = legs.filter((l) => FAILED_LEGS.includes(l.status)).length;
        const active = c.trips.find((t) => t.status === 'OPEN' && t.arriveAt > now);
        return {
          handle: c.handle!,
          tier: c.kycTier,
          rating: c.rating,
          deliveries: settled.length,
          kgCarried: Math.round(settled.reduce((s, l) => s + l.shipment.weightKg, 0)),
          routes: new Set(c.trips.map((t) => `${t.originCity}→${t.destCity}`)).size,
          completionRate: settled.length + failed ? settled.length / (settled.length + failed) : null,
          modes: [...new Set(c.trips.map((t) => t.mode))],
          activeTrip: active
            ? { originCity: active.originCity, destCity: active.destCity, phase: tripPhase(active, now) }
            : null,
          score: courierScore({ rating: c.rating, deliveries: settled.length, strikes: c.strikes }),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score: _score, ...rest }, i) => ({ rank: i + 1, ...rest }));
  }

  /** Public profile: courier and sender facets of one person, by handle. */
  async profile(handle: string, viewerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { handle: handle.toLowerCase() },
      select: { id: true, handle: true, kycTier: true, rating: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('No one goes by that username');

    const [trips, shipments, settlements] = await Promise.all([
      this.prisma.trip.findMany({
        where: { carrierId: user.id },
        select: {
          originCity: true,
          destCity: true,
          mode: true,
          status: true,
          departAt: true,
          arriveAt: true,
          legs: { select: { id: true, status: true, shipment: { select: { weightKg: true, category: true } } } },
        },
      }),
      this.prisma.shipment.findMany({
        where: { senderId: user.id, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        select: { status: true, category: true, createdAt: true, originCity: true, destCity: true },
      }),
      // Delivery dates come from the final payout of each leg.
      this.prisma.ledgerEntry.findMany({
        where: {
          account: { ownerId: user.id, kind: 'USER_WALLET' },
          transaction: { type: 'RELEASE_LEG', idempotencyKey: { endsWith: ':final' } },
        },
        select: { transaction: { select: { createdAt: true } } },
      }),
    ]);

    const now = new Date();
    const legs = trips.flatMap((t) => t.legs);
    const settled = legs.filter((l) => l.status === 'SETTLED');
    const failed = legs.filter((l) => FAILED_LEGS.includes(l.status)).length;

    const routeMap = new Map<string, { originCity: string; destCity: string; trips: number; modes: Set<string> }>();
    for (const t of trips.filter((t) => t.status !== 'CANCELLED' && t.departAt <= now)) {
      const key = `${t.originCity}→${t.destCity}`;
      const r = routeMap.get(key) ?? { originCity: t.originCity, destCity: t.destCity, trips: 0, modes: new Set() };
      r.trips += 1;
      r.modes.add(t.mode);
      routeMap.set(key, r);
    }

    const monthly = (dates: Date[]) => {
      const out: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        out.push({ month: key, count: dates.filter((x) => x.toISOString().slice(0, 7) === key).length });
      }
      return out;
    };

    const categories = new Map<string, number>();
    for (const s of shipments) categories.set(s.category, (categories.get(s.category) ?? 0) + 1);

    return {
      handle: user.handle,
      tier: user.kycTier,
      verified: user.kycTier !== 'T0',
      rating: user.rating,
      memberSince: user.createdAt.toISOString().slice(0, 7),
      isMe: user.id === viewerId,
      courier: {
        deliveries: settled.length,
        kgCarried: Math.round(settled.reduce((s, l) => s + l.shipment.weightKg, 0)),
        completionRate: settled.length + failed ? settled.length / (settled.length + failed) : null,
        tripsTaken: trips.filter((t) => t.status !== 'CANCELLED' && t.departAt <= now).length,
        routes: [...routeMap.values()]
          .map((r) => ({ ...r, modes: [...r.modes] }))
          .sort((a, b) => b.trips - a.trips),
        monthly: monthly(settlements.map((s) => s.transaction.createdAt)),
        activeTrips: await this.tripsFor(user.id, viewerId),
      },
      sender: {
        sent: shipments.length,
        delivered: shipments.filter((s) => ['DELIVERED', 'COMPLETED'].includes(s.status)).length,
        inTransit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
        corridors: new Set(shipments.map((s) => `${s.originCity}→${s.destCity}`)).size,
        categories: [...categories].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
        monthly: monthly(shipments.map((s) => s.createdAt)),
      },
    };
  }
}
