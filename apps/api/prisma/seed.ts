import { PrismaClient } from '@prisma/client';
import { seedHistory } from './seed-history';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DAY = 24 * 3600_000;
const HOUR = 3600_000;

// Demo corridor: Awka -> Abuja -> Houston.
// Ada (sender, T2) ships fabric to her sister. Chika drives Awka -> Abuja,
// Bola flies Abuja -> Houston, Dele is the backup international carrier.
async function main() {
  const passwordHash = await bcrypt.hash('password123', 4);
  const now = Date.now();

  const ada = await prisma.user.upsert({
    where: { email: 'ada@relay.example' },
    update: { handle: 'harbor-heron-21' },
    create: {
      email: 'ada@relay.example',
      phone: '+234800000001',
      fullName: 'Ada Okafor',
      handle: 'harbor-heron-21',
      passwordHash,
      emailVerifiedAt: new Date(),
      kycTier: 'T2',
    },
  });
  const chika = await prisma.user.upsert({
    where: { email: 'chika@relay.example' },
    update: { handle: 'amber-otter-14' },
    create: {
      email: 'chika@relay.example',
      phone: '+234800000002',
      fullName: 'Chika Eze',
      handle: 'amber-otter-14',
      passwordHash,
      emailVerifiedAt: new Date(),
      kycTier: 'T1',
      rating: 4.8,
    },
  });
  const bola = await prisma.user.upsert({
    where: { email: 'bola@relay.example' },
    update: { handle: 'north-falcon-07' },
    create: {
      email: 'bola@relay.example',
      phone: '+234800000003',
      fullName: 'Bola Adeyemi',
      handle: 'north-falcon-07',
      passwordHash,
      emailVerifiedAt: new Date(),
      kycTier: 'T2',
      rating: 4.9,
    },
  });
  const dele = await prisma.user.upsert({
    where: { email: 'dele@relay.example' },
    update: { handle: 'steady-kudu-31' },
    create: {
      email: 'dele@relay.example',
      phone: '+234800000004',
      fullName: 'Dele Bakare',
      handle: 'steady-kudu-31',
      passwordHash,
      emailVerifiedAt: new Date(),
      kycTier: 'T2',
      rating: 4.7,
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin@relay.example' },
    update: { handle: 'ops-desk-01' },
    create: {
      email: 'admin@relay.example',
      phone: '+234800000009',
      fullName: 'Relay Arbiter',
      handle: 'ops-desk-01',
      passwordHash,
      emailVerifiedAt: new Date(),
      kycTier: 'T2',
    },
  });

  // Verification records behind the tiers (mock provider).
  for (const [userId, type] of [
    [ada.id, 'PASSPORT'],
    [chika.id, 'NIN'],
    [bola.id, 'PASSPORT'],
    [dele.id, 'PASSPORT'],
  ] as const) {
    const id = `seed_kyc_${type}_${userId}`;
    await prisma.kycVerification.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId,
        provider: 'mock',
        type,
        status: 'VERIFIED',
        reference: `seed_${type}_${userId}`.slice(0, 40),
        payload: { seeded: true },
      },
    });
  }

  // Leg 1: road, departs in 5 days. Leg 2: air, departs in 8 days.
  // Both request windows (departure - 48h) are open at seed time.
  const t1 = await prisma.trip.upsert({
    where: { id: 'seed_trip_chika_awka_abuja' },
    update: { departAt: new Date(now + 5 * DAY), arriveAt: new Date(now + 5 * DAY + 8 * HOUR) },
    create: {
      id: 'seed_trip_chika_awka_abuja',
      carrierId: chika.id,
      originCity: 'Awka',
      destCity: 'Abuja',
      departAt: new Date(now + 5 * DAY),
      arriveAt: new Date(now + 5 * DAY + 8 * HOUR),
      mode: 'ROAD',
      capacityKg: 30,
      remainingKg: 30,
      pricePerKg: 200000,
      currency: 'NGN',
      categories: ['fabric', 'fashion', 'documents', 'books'],
      international: false,
      travelVerified: true,
      status: 'OPEN',
    },
  });
  await prisma.trip.upsert({
    where: { id: 'seed_trip_bola_abuja_houston' },
    update: { departAt: new Date(now + 8 * DAY), arriveAt: new Date(now + 8 * DAY + 14 * HOUR) },
    create: {
      id: 'seed_trip_bola_abuja_houston',
      carrierId: bola.id,
      originCity: 'Abuja',
      destCity: 'Houston',
      departAt: new Date(now + 8 * DAY),
      arriveAt: new Date(now + 8 * DAY + 14 * HOUR),
      mode: 'AIR',
      flightNumber: 'RL501',
      capacityKg: 15,
      remainingKg: 15,
      pricePerKg: 900000,
      currency: 'NGN',
      categories: ['fabric', 'fashion', 'documents'],
      international: true,
      travelVerified: true,
      status: 'OPEN',
    },
  });
  // Backup international leg for the reroute demo (departs a day later).
  await prisma.trip.upsert({
    where: { id: 'seed_trip_dele_abuja_houston' },
    update: { departAt: new Date(now + 9 * DAY), arriveAt: new Date(now + 9 * DAY + 15 * HOUR) },
    create: {
      id: 'seed_trip_dele_abuja_houston',
      carrierId: dele.id,
      originCity: 'Abuja',
      destCity: 'Houston',
      departAt: new Date(now + 9 * DAY),
      arriveAt: new Date(now + 9 * DAY + 15 * HOUR),
      mode: 'AIR',
      flightNumber: 'RL503',
      capacityKg: 10,
      remainingKg: 10,
      pricePerKg: 950000,
      currency: 'NGN',
      categories: ['fabric', 'fashion', 'documents'],
      international: true,
      travelVerified: true,
      status: 'OPEN',
    },
  });

  // Ada's wallet: NGN 100,000 (minor units) via a mock top-up.
  // Skipped on re-seed: the idempotency key is unique and the balance must not double.
  const topupKey = `seed-topup:${ada.id}`;
  const alreadyToppedUp = await prisma.ledgerTransaction.findUnique({
    where: { idempotencyKey: topupKey },
  });
  if (!alreadyToppedUp) await prisma.$transaction(async (tx) => {
    const created = await tx.ledgerTransaction.create({
      data: { type: 'TOPUP', idempotencyKey: topupKey },
    });
    for (const [id, kind, ownerId, amount] of [
      ['psp_clearing:NGN', 'PSP_CLEARING', null, BigInt(-10000000)],
      [`user_wallet:${ada.id}:NGN`, 'USER_WALLET', ada.id, BigInt(10000000)],
    ] as const) {
      await tx.ledgerAccount.upsert({
        where: { id },
        create: { id, kind, ownerId, currency: 'NGN', balance: BigInt(0) },
        update: {},
      });
      await tx.ledgerEntry.create({
        data: { transactionId: created.id, accountId: id, amount },
      });
      await tx.ledgerAccount.update({
        where: { id },
        data: { balance: { increment: amount } },
      });
    }
  });

  await seedHistory(prisma, { passwordHash, ada, chika, bola, dele });

  console.log(`Seeded corridor with first trip ${t1.id}. Demo password for all users: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
