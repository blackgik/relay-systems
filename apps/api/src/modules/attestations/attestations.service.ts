import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { COURIER_CLAUSES, SENDER_CLAUSES, legalName, publicStatement, statementHash } from './attestation.statement';

const KYC_NAME = { select: { status: true, firstName: true, middleName: true, lastName: true } } as const;
// A courier who turned the request down, or let it lapse, never gets the document.
const BOUND = ['PROPOSED', 'ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF', 'SETTLED', 'NO_SHOW', 'LOST', 'DISPUTED'];
const ACKNOWLEDGED = ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF', 'SETTLED', 'NO_SHOW', 'LOST', 'DISPUTED'];

@Injectable()
export class AttestationsService {
  constructor(private prisma: PrismaService) {}

  async statementFor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, kycProfile: KYC_NAME },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...publicStatement(), signAs: legalName(user) };
  }

  /**
   * The declaration document for one shipment. Only its two sides can read it:
   * the sender, and the couriers carrying (or deciding on) it. This is the one
   * place full legal names are shown to the other party — on a signed legal
   * document both of them can download.
   */
  async forShipment(shipmentId: string, viewerId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        attestation: true,
        sender: { select: { id: true, handle: true, kycTier: true, fullName: true, kycProfile: KYC_NAME } },
        legs: {
          where: { status: { in: BOUND as never } },
          orderBy: { sequence: 'asc' },
          include: {
            trip: {
              select: {
                originCity: true,
                destCity: true,
                departAt: true,
                mode: true,
                flightNumber: true,
                carrier: { select: { id: true, handle: true, kycTier: true, fullName: true, kycProfile: KYC_NAME } },
              },
            },
          },
        },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    const isSender = shipment.senderId === viewerId;
    const isCourier = shipment.legs.some((l) => l.trip.carrier.id === viewerId);
    if (!isSender && !isCourier) throw new ForbiddenException('Only the sender and couriers on this shipment can see its declaration');
    const a = shipment.attestation;
    if (!a) throw new NotFoundException('This shipment has no signed declaration yet');

    return {
      reference: a.reference,
      viewerRole: isSender ? 'SENDER' : 'COURIER',
      signedAt: a.signedAt.toISOString(),
      signedName: a.signedName,
      statementVersion: a.statementVersion,
      statementHash: a.statementHash,
      // The stored hash still matches today's text: the wording has not changed since signing.
      statementCurrent: a.statementHash === statementHash(a.statementVersion),
      senderClauses: SENDER_CLAUSES,
      courierClauses: COURIER_CLAUSES,
      shipment: {
        id: shipment.id,
        originCity: shipment.originCity,
        destCity: shipment.destCity,
        category: shipment.category,
        weightKg: shipment.weightKg,
        declaredValue: shipment.declaredValue,
        currency: shipment.currency,
        sealId: shipment.sealId,
        status: shipment.status,
        createdAt: shipment.createdAt.toISOString(),
      },
      sender: {
        fullName: legalName(shipment.sender),
        handle: shipment.sender.handle,
        tier: shipment.sender.kycTier,
      },
      couriers: shipment.legs.map((l) => ({
        fullName: legalName(l.trip.carrier),
        handle: l.trip.carrier.handle,
        tier: l.trip.carrier.kycTier,
        sequence: l.sequence,
        originCity: l.trip.originCity,
        destCity: l.trip.destCity,
        departAt: l.trip.departAt.toISOString(),
        mode: l.trip.mode,
        reference: l.trip.flightNumber,
        acknowledged: ACKNOWLEDGED.includes(l.status),
      })),
    };
  }
}
