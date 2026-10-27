import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PeopleService } from '../people/people.service';
import {
  historicalFillRate,
  profitAndLoss,
  projections,
  tripPhase,
  weeklyCounts,
  WalletLine,
} from './metrics';

const SENT_EXCLUDED = ['DRAFT', 'CANCELLED'] as const;
const HANDLED_LEGS = ['HANDED_OFF', 'SETTLED'];
const ACTIVE_LEGS = ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF'];

const startOfMonth = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private people: PeopleService) {}

  private async walletLines(userId: string, currency: string): Promise<WalletLine[]> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { account: { ownerId: userId, kind: 'USER_WALLET', currency } },
      select: { amount: true, transaction: { select: { type: true, idempotencyKey: true, createdAt: true } } },
    });
    return entries.map((e) => ({
      amount: Number(e.amount),
      type: e.transaction.type,
      key: e.transaction.idempotencyKey,
      createdAt: e.transaction.createdAt,
    }));
  }

  async summary(userId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const handle = await this.people.ensureHandle(userId);

    const [user, wallets, shipments, myLegs, myTrips] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { kycTier: true, rating: true, createdAt: true } }),
      this.prisma.ledgerAccount.findMany({ where: { ownerId: userId, kind: 'USER_WALLET' } }),
      this.prisma.shipment.findMany({
        where: { senderId: userId, status: { notIn: [...SENT_EXCLUDED] } },
        include: {
          legs: {
            orderBy: { sequence: 'asc' },
            select: { status: true, trip: { select: { mode: true, carrier: { select: { handle: true } } } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leg.findMany({
        where: { trip: { carrierId: userId } },
        include: {
          shipment: { select: { weightKg: true, category: true, createdAt: true, originCity: true, destCity: true } },
          trip: { select: { originCity: true, destCity: true } },
        },
      }),
      this.prisma.trip.findMany({ where: { carrierId: userId } }),
    ]);

    // Primary currency: the wallet with the most money in it, NGN otherwise.
    const primary = [...wallets].sort((a, b) => Number(b.balance - a.balance))[0];
    const currency = primary?.currency ?? 'NGN';
    const lines = await this.walletLines(userId, currency);
    const pl = profitAndLoss(lines, 6, now);

    const handled = myLegs.filter((l) => HANDLED_LEGS.includes(l.status));
    const onHand = myLegs.filter((l) => l.status === 'IN_CUSTODY');
    const departed = myTrips.filter((t) => t.status !== 'CANCELLED' && t.departAt <= now);
    const finished = myTrips.filter((t) => tripPhase(t, now) === 'ARRIVED');
    const openTrips = myTrips.filter((t) => t.status === 'OPEN' && t.departAt > now);
    const deliveredShipments = shipments.filter((s) => ['DELIVERED', 'COMPLETED'].includes(s.status));
    const finalPayouts = lines.filter((l) => l.type === 'RELEASE_LEG' && l.key.endsWith(':final'));

    const forecast = projections(
      myLegs.filter((l) => ACTIVE_LEGS.includes(l.status)),
      openTrips,
      historicalFillRate(finished)
    );

    return {
      me: { handle, tier: user.kycTier, rating: user.rating, memberSince: user.createdAt.toISOString().slice(0, 7) },
      currency,
      balance: Number(primary?.balance ?? 0),
      sender: {
        sent: shipments.length,
        sentThisMonth: shipments.filter((s) => s.createdAt >= monthStart).length,
        inTransit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
        delivered: deliveredShipments.length,
        needsAction: shipments.filter((s) => ['ROUTED', 'AWAITING_APPROVAL', 'APPROVED', 'REROUTING'].includes(s.status)).length,
        kgSent: Math.round(shipments.reduce((s, x) => s + x.weightKg, 0)),
        recent: shipments.slice(0, 6).map((s) => ({
          id: s.id,
          originCity: s.originCity,
          destCity: s.destCity,
          category: s.category,
          weightKg: s.weightKg,
          status: s.status,
          totalPrice: s.totalPrice,
          currency: s.currency,
          createdAt: s.createdAt,
          legs: s.legs.length,
          couriers: s.legs.map((l) => ({ handle: l.trip.carrier.handle, mode: l.trip.mode, status: l.status })),
          progress: s.legs.length ? s.legs.filter((l) => HANDLED_LEGS.includes(l.status)).length / s.legs.length : 0,
        })),
      },
      courier: {
        carried: handled.length,
        carriedThisMonth: finalPayouts.filter((l) => l.createdAt >= monthStart).length,
        onHand: onHand.length,
        kgOnHand: Math.round(onHand.reduce((s, l) => s + l.shipment.weightKg, 0)),
        kgCarried: Math.round(handled.reduce((s, l) => s + l.shipment.weightKg, 0)),
        pendingRequests: myLegs.filter((l) => l.status === 'PROPOSED' && l.acceptDeadline > now).length,
        routesTaken: new Set(departed.map((t) => `${t.originCity}→${t.destCity}`)).size,
        tripsTaken: departed.length,
        trips: await this.people.tripsFor(userId, userId),
      },
      money: {
        earned: pl.earned,
        spent: pl.spent,
        refunds: pl.refunds,
        net: pl.net,
        earnedChange: pl.earnedChange,
        series: pl.series,
        projection: forecast,
      },
      activity: { weeks: this.activity(shipments.map((s) => s.createdAt), finalPayouts.map((l) => l.createdAt), now) },
    };
  }

  private activity(sentDates: Date[], deliveredDates: Date[], now: Date) {
    const sent = weeklyCounts(sentDates, 8, now);
    const delivered = weeklyCounts(deliveredDates, 8, now);
    return sent.map((w, i) => ({ weekStart: w.weekStart, sent: w.count, delivered: delivered[i].count }));
  }

  /**
   * Notifications are derived from what's actually happening on the
   * account (requests, shipment states, payouts, KYC) rather than stored,
   * so they can never drift from the truth.
   */
  async notifications(userId: string) {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const [requests, shipments, payouts, kyc] = await Promise.all([
      this.prisma.leg.findMany({
        where: { status: 'PROPOSED', acceptDeadline: { gt: now }, trip: { carrierId: userId } },
        include: { shipment: { select: { weightKg: true, category: true, createdAt: true } }, trip: true },
        take: 10,
      }),
      this.prisma.shipment.findMany({
        where: { senderId: userId, status: { in: ['ROUTED', 'APPROVED', 'REROUTING', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED'] } },
        include: { custody: { orderBy: { occurredAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          account: { ownerId: userId, kind: 'USER_WALLET' },
          amount: { gt: 0 },
          transaction: { type: { in: ['RELEASE_LEG', 'REFUND'] }, createdAt: { gte: since } },
        },
        include: { account: { select: { currency: true } }, transaction: true },
        orderBy: { transaction: { createdAt: 'desc' } },
        take: 10,
      }),
      this.prisma.kycProfile.findUnique({ where: { userId }, select: { status: true, updatedAt: true, reviewNote: true } }),
    ]);

    type Note = { id: string; kind: string; title: string; body: string; href: string; at: Date; tone: 'info' | 'success' | 'warning' | 'danger' };
    const notes: Note[] = [];

    for (const l of requests) {
      notes.push({
        id: `req:${l.id}`,
        kind: 'REQUEST',
        tone: 'info',
        title: 'New carry request',
        body: `${l.shipment.weightKg} kg of ${l.shipment.category} on ${l.trip.originCity} → ${l.trip.destCity}. Respond before ${l.acceptDeadline.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
        href: '/requests',
        at: l.shipment.createdAt,
      });
    }

    const SHIPMENT_NOTES: Record<string, Omit<Note, 'id' | 'href' | 'at' | 'kind' | 'body'> & { body: string }> = {
      ROUTED: { tone: 'info', title: 'Route found', body: 'Couriers have been requested for your shipment.' },
      APPROVED: { tone: 'warning', title: 'Ready to pay', body: 'Every courier accepted. Fund escrow to start the journey.' },
      REROUTING: { tone: 'danger', title: 'A courier dropped out', body: 'Pick a backup route — your money is still in escrow.' },
      IN_TRANSIT: { tone: 'info', title: 'On the move', body: 'Your package changed hands and is being tracked.' },
      DELIVERED: { tone: 'success', title: 'Delivered', body: 'The receiver confirmed with their code.' },
      DISPUTED: { tone: 'danger', title: 'Dispute opened', body: 'Escrow is frozen while an arbiter reviews the handoff.' },
    };
    for (const s of shipments) {
      const n = SHIPMENT_NOTES[s.status];
      if (!n) continue;
      notes.push({
        id: `shp:${s.id}:${s.status}`,
        kind: 'SHIPMENT',
        ...n,
        body: `${s.originCity} → ${s.destCity}. ${n.body}`,
        href: s.status === 'APPROVED' ? `/shipments/${s.id}/pay` : `/shipments/${s.id}`,
        at: s.custody[0]?.occurredAt ?? s.createdAt,
      });
    }

    for (const p of payouts) {
      const amount = Number(p.amount);
      notes.push({
        id: `pay:${p.id}`,
        kind: 'PAYOUT',
        tone: 'success',
        title: p.transaction.type === 'REFUND' ? 'Refund received' : 'Payout received',
        body: `${(amount / 100).toLocaleString('en-NG', { style: 'currency', currency: p.account.currency })} landed in your wallet.`,
        href: '/wallet',
        at: p.transaction.createdAt,
      });
    }

    if (kyc && ['SUBMITTED', 'VERIFIED', 'REJECTED'].includes(kyc.status)) {
      const k = {
        SUBMITTED: { tone: 'info' as const, title: 'Verification under review', body: 'A reviewer is checking your details.' },
        VERIFIED: { tone: 'success' as const, title: 'You are verified', body: 'You can now send and carry on domestic routes.' },
        REJECTED: { tone: 'danger' as const, title: 'Verification needs attention', body: kyc.reviewNote ?? 'Update your details and resubmit.' },
      }[kyc.status as 'SUBMITTED' | 'VERIFIED' | 'REJECTED'];
      notes.push({ id: `kyc:${kyc.status}`, kind: 'KYC', ...k, href: '/onboarding', at: kyc.updatedAt });
    }

    return notes.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20);
  }
}
