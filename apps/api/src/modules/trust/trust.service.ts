import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { IDENTITY_SELECT, cleanComment, identityUnlocked, legOutcome, revealIdentity } from './trust.rules';

type About = 'OF_COURIER' | 'OF_SENDER';

const REVIEW_INCLUDE = {
  leg: { select: { trip: { select: { originCity: true, destCity: true, mode: true } } } },
} as const;

@Injectable()
export class TrustService {
  constructor(private prisma: PrismaService, private outbox: OutboxService) {}

  /** Average and count of the reviews written about someone in one role. */
  async ratingOf(subjectId: string, about: About) {
    const agg = await this.prisma.review.aggregate({
      where: { subjectId, about },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return {
      rating: agg._avg.rating === null ? null : Math.round(agg._avg.rating * 10) / 10,
      count: agg._count._all,
    };
  }

  /** Recent reviews about someone, by author handle only. */
  async recentReviews(subjectId: string, about: About, take = 10) {
    const rows = await this.prisma.review.findMany({
      where: { subjectId, about },
      orderBy: { createdAt: 'desc' },
      take,
      include: REVIEW_INCLUDE,
    });
    const authors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.authorId))] } },
      select: { id: true, handle: true },
    });
    const handle = new Map(authors.map((a) => [a.id, a.handle]));
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      outcome: r.outcome,
      createdAt: r.createdAt.toISOString(),
      author: handle.get(r.authorId) ?? null,
      route: `${r.leg.trip.originCity} → ${r.leg.trip.destCity}`,
      mode: r.leg.trip.mode,
    }));
  }

  async reviewsForHandle(handle: string, about: About) {
    const user = await this.prisma.user.findUnique({ where: { handle }, select: { id: true } });
    if (!user) throw new NotFoundException('No one goes by that username');
    const [summary, reviews] = await Promise.all([this.ratingOf(user.id, about), this.recentReviews(user.id, about, 20)]);
    return { ...summary, reviews };
  }

  /** The courier rates and comments on the sender once their leg has ended or been terminated. */
  async reviewSender(legId: string, courierId: string, rating: number, comment?: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: { trip: { select: { carrierId: true } }, shipment: { select: { senderId: true } } },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== courierId) throw new ForbiddenException('Not your leg');
    const outcome = legOutcome(leg);
    if (!outcome) throw new BadRequestException('You can review the sender once this trip has ended or been terminated');
    const existing = await this.prisma.review.findUnique({ where: { legId_about: { legId, about: 'OF_SENDER' } } });
    if (existing) throw new ConflictException('You already reviewed this sender for this trip');

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          legId,
          shipmentId: leg.shipmentId,
          authorId: courierId,
          subjectId: leg.shipment.senderId,
          about: 'OF_SENDER',
          rating,
          comment: cleanComment(comment),
          outcome,
        },
      });
      await this.outbox.write(tx, 'review.created', { reviewId: review.id, about: 'OF_SENDER' });
      return review;
    });
  }

  /**
   * What a courier sees about the sender of a leg: their record and what
   * other couriers said, always; their real identity only once this courier
   * has accepted.
   */
  async senderForLeg(legId: string, courierId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: {
        trip: { select: { carrierId: true } },
        shipment: { select: { senderId: true, sender: { select: IDENTITY_SELECT } } },
        reviews: { where: { about: 'OF_SENDER' }, select: { rating: true, comment: true } },
      },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== courierId) throw new ForbiddenException('Not your leg');
    const sender = leg.shipment.sender;

    const [summary, reviews, sent, delivered, cancelled, disputes] = await Promise.all([
      this.ratingOf(sender.id, 'OF_SENDER'),
      this.recentReviews(sender.id, 'OF_SENDER'),
      this.prisma.shipment.count({ where: { senderId: sender.id, status: { notIn: ['DRAFT'] } } }),
      this.prisma.shipment.count({ where: { senderId: sender.id, status: { in: ['DELIVERED', 'COMPLETED'] } } }),
      this.prisma.shipment.count({ where: { senderId: sender.id, status: { in: ['CANCELLED', 'REFUNDED'] } } }),
      this.prisma.shipment
        .findMany({ where: { senderId: sender.id }, select: { id: true } })
        .then((rows) => this.prisma.dispute.count({ where: { shipmentId: { in: rows.map((r) => r.id) } } })),
    ]);
    const unlocked = identityUnlocked(leg);
    return {
      handle: sender.handle,
      tier: sender.kycTier,
      memberSince: sender.createdAt.toISOString().slice(0, 7),
      history: { sent, delivered, cancelled, disputes },
      ...summary,
      reviews,
      unlocked,
      identity: unlocked ? revealIdentity(sender) : null,
      canReview: !!legOutcome(leg) && leg.reviews.length === 0,
      myReview: leg.reviews[0] ?? null,
    };
  }

  /** What the sender sees about each courier on their shipment; identity per leg once accepted. */
  async couriersForShipment(shipmentId: string, senderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        legs: {
          orderBy: { sequence: 'asc' },
          include: {
            trip: { select: { originCity: true, destCity: true, carrier: { select: IDENTITY_SELECT } } },
            reviews: { where: { about: 'OF_COURIER' }, select: { rating: true, comment: true } },
          },
        },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.senderId !== senderId) throw new ForbiddenException('Not your shipment');
    return Promise.all(
      shipment.legs
        .filter((l) => l.status !== 'REJECTED')
        .map(async (l) => {
          const carrier = l.trip.carrier;
          const unlocked = identityUnlocked(l);
          return {
            legId: l.id,
            sequence: l.sequence,
            status: l.status,
            route: `${l.trip.originCity} → ${l.trip.destCity}`,
            handle: carrier.handle,
            tier: carrier.kycTier,
            ...(await this.ratingOf(carrier.id, 'OF_COURIER')),
            unlocked,
            identity: unlocked ? revealIdentity(carrier) : null,
            outcome: legOutcome(l),
            myReview: l.reviews[0] ?? null,
          };
        })
    );
  }
}
