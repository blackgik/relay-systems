import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { STATEMENT_VERSION, legalName, statementHash } from '../src/modules/attestations/attestation.statement';
import { encrypt, fingerprint, last4 } from '../src/common/crypto/pii';

// Demo history predates declarations, ratings, reviews, journey stages and
// verified KYC. Backfill them idempotently:
// - every requested shipment gets the sender's signed declaration;
// - every settled leg a sender rating near the courier's profile rating, and
//   reviews with comments in both directions;
// - finished or moving trips the journey stage that matches;
// - verified demo users a KYC profile and payout account, so accepted legs
//   have a real identity to reveal.

function unit(id: string) {
  return createHash('sha256').update(id).digest().readUInt32BE(0) / 0xffffffff;
}

export async function seedBackfill(prisma: PrismaClient) {
  const unsigned = await prisma.shipment.findMany({
    where: { attestation: null, status: { not: 'DRAFT' } },
    select: {
      id: true,
      senderId: true,
      createdAt: true,
      sender: { select: { fullName: true, kycProfile: { select: { status: true, firstName: true, middleName: true, lastName: true } } } },
    },
  });
  for (const s of unsigned) {
    await prisma.attestation.create({
      data: {
        reference: `RLY-DEC-${randomBytes(4).toString('hex').toUpperCase()}`,
        shipmentId: s.id,
        senderId: s.senderId,
        signedName: legalName(s.sender),
        statementVersion: STATEMENT_VERSION,
        statementHash: statementHash(),
        signedAt: s.createdAt,
      },
    });
  }

  const unrated = await prisma.leg.findMany({
    where: { status: 'SETTLED', senderRating: null },
    select: { id: true, trip: { select: { arriveAt: true, carrier: { select: { rating: true } } } } },
  });
  for (const leg of unrated) {
    const r = leg.trip.carrier.rating || 4.5;
    const base = Math.min(4, Math.floor(r));
    // P(base + 1) = fractional part, so the mean lands on the profile rating.
    const rating = Math.min(5, unit(leg.id) < r - base ? base + 1 : base);
    await prisma.leg.update({
      where: { id: leg.id },
      data: { senderRating: rating, ratedAt: new Date(leg.trip.arriveAt.getTime() + 6 * 3600_000) },
    });
  }
  const finished = await prisma.trip.updateMany({
    where: { status: 'COMPLETED', journeyStage: 'NOT_STARTED' },
    data: { journeyStage: 'DELIVERED' },
  });
  const moving = await prisma.trip.updateMany({
    where: { status: 'OPEN', journeyStage: 'NOT_STARTED', departAt: { lte: new Date() }, arriveAt: { gt: new Date() } },
    data: { journeyStage: 'STARTED' },
  });
  // Accepted legs from before acceptedAt existed: stamp them a day before departure (never in the future).
  const accepted = await prisma.leg.findMany({
    where: { acceptedAt: null, status: { in: ['ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF', 'SETTLED', 'NO_SHOW', 'LOST', 'DISPUTED'] } },
    select: { id: true, trip: { select: { departAt: true } } },
  });
  for (const leg of accepted) {
    await prisma.leg.update({ where: { id: leg.id }, data: { acceptedAt: new Date(Math.min(Date.now(), leg.trip.departAt.getTime() - 26 * 3600_000)) } });
  }

  const identities = await seedIdentities(prisma);
  const reviews = await seedReviews(prisma);
  return {
    declarations: unsigned.length,
    ratings: unrated.length,
    stages: finished.count + moving.count,
    accepted: accepted.length,
    identities,
    reviews,
  };
}

const CITIES = [
  ['Awka', 'Anambra', '14 Zik Avenue'],
  ['Enugu', 'Enugu', '7 Ogui Road'],
  ['Lagos', 'Lagos', '22 Admiralty Way, Lekki'],
  ['Abuja', 'FCT', '5 Aminu Kano Crescent, Wuse 2'],
  ['Onitsha', 'Anambra', '31 New Market Road'],
  ['Port Harcourt', 'Rivers', '9 Aba Road'],
  ['Ibadan', 'Oyo', '18 Ring Road'],
  ['Kano', 'Kano', '3 Murtala Mohammed Way'],
] as const;
const BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Kuda'];

async function seedIdentities(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { kycTier: { not: 'T0' }, kycProfile: null, email: { endsWith: '@relay.example' } },
    select: { id: true, fullName: true },
  });
  for (const u of users) {
    const r = unit(u.id);
    const [first, ...rest] = u.fullName.split(' ');
    const last = rest.pop() ?? first;
    const middle = rest.join(' ') || null;
    const [city, state, street] = CITIES[Math.floor(r * CITIES.length)];
    const born = new Date(Date.UTC(1978 + Math.floor(r * 22), Math.floor(unit(`${u.id}:m`) * 12), 1 + Math.floor(unit(`${u.id}:d`) * 27)));
    await prisma.kycProfile.create({
      data: {
        userId: u.id,
        status: 'VERIFIED',
        step: 'REVIEW',
        firstName: first,
        middleName: middle,
        lastName: last,
        dateOfBirth: born,
        gender: unit(`${u.id}:g`) < 0.5 ? 'FEMALE' : 'MALE',
        address: street,
        city,
        state,
        submittedAt: new Date(Date.now() - 120 * 86400_000),
      },
    });
    const existingBank = await prisma.bankAccount.findUnique({ where: { userId: u.id } });
    if (!existingBank) {
      const account = String(Math.floor(1_000_000_000 + unit(`${u.id}:acct`) * 8_999_999_999));
      await prisma.bankAccount.create({
        data: {
          userId: u.id,
          bankCode: '000',
          bankName: BANKS[Math.floor(unit(`${u.id}:bank`) * BANKS.length)],
          accountNumberEnc: encrypt(account),
          accountLast4: last4(account),
          accountFingerprint: fingerprint('account', `seed:${u.id}:${account}`),
          // Paystack returns surname first, in capitals.
          accountName: [last, first, middle].filter(Boolean).join(' ').toUpperCase(),
          nameMatches: true,
          bvnMatchStatus: 'VERIFIED',
        },
      });
    }
  }
  return users.length;
}

const ABOUT_COURIER: Record<number, string[]> = {
  5: [
    'Picked up on time and the seal was intact at delivery. Will book again.',
    'Kept me updated the whole way. Receiver got it the same evening.',
    'Very careful with the fabric, it arrived folded exactly as I packed it.',
    'Fast handover and polite with my receiver.',
  ],
  4: ['Arrived a few hours late but well handled and sealed.', 'Good trip, a bit slow to reply on chat.'],
  3: ['Delivered, but the handover was rushed and I had to chase updates.'],
};
const ABOUT_SENDER: Record<number, string[]> = {
  5: [
    'Package exactly as declared, well taped, ready at pickup.',
    'Sender was on time and the receiver was reachable. Easy job.',
    'Clear instructions and honest weight.',
  ],
  4: ['Good sender, pickup started 20 minutes late.', 'Item as described; receiver took a while to answer.'],
  3: ['Weight was a little over what was declared. Sorted it out on the spot.'],
};

async function seedReviews(prisma: PrismaClient) {
  const legs = await prisma.leg.findMany({
    where: { status: 'SETTLED', senderRating: { not: null } },
    select: {
      id: true,
      shipmentId: true,
      senderRating: true,
      ratedAt: true,
      trip: { select: { carrierId: true, arriveAt: true } },
      shipment: { select: { senderId: true } },
      reviews: { select: { about: true } },
    },
  });
  let created = 0;
  for (const leg of legs) {
    const has = new Set(leg.reviews.map((r) => r.about));
    // Never in the future: test deliveries can settle before the trip's scheduled arrival.
    const at = new Date(Math.min(Date.now(), (leg.ratedAt ?? new Date(leg.trip.arriveAt.getTime() + 6 * 3600_000)).getTime()));
    if (!has.has('OF_COURIER')) {
      const pool = ABOUT_COURIER[leg.senderRating!] ?? ABOUT_COURIER[3];
      const withComment = unit(`${leg.id}:c`) < 0.75;
      await prisma.review.create({
        data: {
          legId: leg.id,
          shipmentId: leg.shipmentId,
          authorId: leg.shipment.senderId,
          subjectId: leg.trip.carrierId,
          about: 'OF_COURIER',
          rating: leg.senderRating!,
          comment: withComment ? pool[Math.floor(unit(`${leg.id}:p`) * pool.length)] : null,
          outcome: 'DELIVERED',
          createdAt: at,
        },
      });
      created++;
    }
    if (!has.has('OF_SENDER') && unit(`${leg.id}:s`) < 0.8) {
      const u = unit(`${leg.id}:sr`);
      const rating = u < 0.7 ? 5 : u < 0.93 ? 4 : 3;
      const pool = ABOUT_SENDER[rating];
      await prisma.review.create({
        data: {
          legId: leg.id,
          shipmentId: leg.shipmentId,
          authorId: leg.trip.carrierId,
          subjectId: leg.shipment.senderId,
          about: 'OF_SENDER',
          rating,
          comment: unit(`${leg.id}:sc`) < 0.7 ? pool[Math.floor(unit(`${leg.id}:sp`) * pool.length)] : null,
          outcome: 'DELIVERED',
          createdAt: new Date(Math.min(Date.now(), at.getTime() + 3600_000)),
        },
      });
      created++;
    }
  }
  return created;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedBackfill(prisma)
    .then((r) => console.log('Backfilled', r))
    .finally(() => prisma.$disconnect());
}
