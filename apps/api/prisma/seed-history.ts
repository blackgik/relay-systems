import { PrismaClient } from '@prisma/client';

// Six months of believable network history so the dashboard has something
// to show: extra verified couriers, completed trips with settled legs, and
// ledger entries that balance exactly like the real escrow flow
// (fund -> 70% release at handoff -> 30% on delivery -> platform fee).
// Idempotent: skipped when the sentinel shipment already exists.

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
const SENTINEL = 'hist_shp_000';

// Deterministic RNG so every seed produces the same history.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COURIERS: { name: string; handle: string; tier: 'T1' | 'T2'; rating: number }[] = [
  { name: 'Tunde Bakare', handle: 'quiet-heron-42', tier: 'T2', rating: 4.95 },
  { name: 'Ifeoma Nwosu', handle: 'copper-lynx-18', tier: 'T2', rating: 4.92 },
  { name: 'Musa Ibrahim', handle: 'steady-crane-63', tier: 'T1', rating: 4.88 },
  { name: 'Grace Eze', handle: 'velvet-finch-27', tier: 'T2', rating: 4.86 },
  { name: 'Yusuf Bello', handle: 'olive-kudu-55', tier: 'T1', rating: 4.81 },
  { name: 'Amaka Obi', handle: 'azure-otter-09', tier: 'T2', rating: 4.79 },
  { name: 'Femi Adeyemi', handle: 'brave-wolf-71', tier: 'T1', rating: 4.74 },
  { name: 'Halima Sani', handle: 'golden-egret-36', tier: 'T1', rating: 4.7 },
  { name: 'Chidi Okeke', handle: 'marble-hawk-84', tier: 'T2', rating: 4.66 },
  { name: 'Bisi Ogun', handle: 'calm-panda-12', tier: 'T1', rating: 4.61 },
  { name: 'Emeka Uche', handle: 'scarlet-orca-48', tier: 'T2', rating: 4.55 },
  { name: 'Zainab Lawal', handle: 'willow-raven-90', tier: 'T1', rating: 4.5 },
  { name: 'Kunle Ajayi', handle: 'rapid-badger-33', tier: 'T1', rating: 4.42 },
  { name: 'Ngozi Ani', handle: 'mellow-moose-29', tier: 'T1', rating: 4.35 },
  { name: 'Sola Peters', handle: 'bright-tiger-66', tier: 'T1', rating: 4.21 },
  { name: 'Ruth Danjuma', handle: 'silver-zebra-15', tier: 'T1', rating: 4.08 },
];

type Corridor = { from: string; to: string; mode: 'ROAD' | 'AIR' | 'RAIL'; hours: number; price: number; intl?: boolean };
const CORRIDORS: Corridor[] = [
  { from: 'Lagos', to: 'Abuja', mode: 'ROAD', hours: 10, price: 180000 },
  { from: 'Abuja', to: 'Kano', mode: 'ROAD', hours: 6, price: 150000 },
  { from: 'Enugu', to: 'Lagos', mode: 'ROAD', hours: 9, price: 170000 },
  { from: 'Port Harcourt', to: 'Lagos', mode: 'ROAD', hours: 11, price: 190000 },
  { from: 'Ibadan', to: 'Lagos', mode: 'RAIL', hours: 3, price: 90000 },
  { from: 'Awka', to: 'Abuja', mode: 'ROAD', hours: 8, price: 200000 },
  { from: 'Onitsha', to: 'Lagos', mode: 'ROAD', hours: 8, price: 160000 },
  { from: 'Lagos', to: 'London', mode: 'AIR', hours: 7, price: 1100000, intl: true },
  { from: 'Abuja', to: 'Houston', mode: 'AIR', hours: 14, price: 900000, intl: true },
  { from: 'Lagos', to: 'Accra', mode: 'ROAD', hours: 12, price: 240000, intl: true },
];
const CATEGORIES = ['fabric', 'fashion', 'documents', 'electronics', 'books', 'other'];

type Entry = { id: string; kind: string; ownerId?: string | null; amount: bigint };

export async function seedHistory(
  prisma: PrismaClient,
  core: { passwordHash: string; ada: { id: string }; chika: { id: string }; bola: { id: string }; dele: { id: string } }
) {
  if (await prisma.shipment.findUnique({ where: { id: SENTINEL } })) return;
  const rand = rng(20261027);
  const now = Date.now();
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  // A filler sender whose parcels the network carries.
  const ngozi = await prisma.user.upsert({
    where: { email: 'kemi@relay.example' },
    update: {},
    create: {
      email: 'kemi@relay.example',
      phone: '+234800000010',
      fullName: 'Kemi Adebayo',
      handle: 'amber-falcon-88',
      passwordHash: core.passwordHash,
      emailVerifiedAt: new Date(now - 200 * DAY),
      kycTier: 'T2',
      createdAt: new Date(now - 200 * DAY),
    },
  });

  const couriers: { id: string; tier: 'T1' | 'T2' }[] = [
    { id: core.chika.id, tier: 'T1' },
    { id: core.bola.id, tier: 'T2' },
    { id: core.dele.id, tier: 'T2' },
  ];
  for (const [i, c] of COURIERS.entries()) {
    const u = await prisma.user.upsert({
      where: { email: `courier${i + 1}@relay.example` },
      update: {},
      create: {
        email: `courier${i + 1}@relay.example`,
        phone: `+2348100000${String(i + 10).padStart(2, '0')}`,
        fullName: c.name,
        handle: c.handle,
        passwordHash: core.passwordHash,
        emailVerifiedAt: new Date(now - (220 - i * 5) * DAY),
        kycTier: c.tier,
        rating: c.rating,
        createdAt: new Date(now - (220 - i * 5) * DAY),
      },
    });
    couriers.push({ id: u.id, tier: c.tier });
  }

  const balances = new Map<string, bigint>();
  async function post(type: string, key: string, at: Date, shipmentId: string | null, entries: Entry[]) {
    const tx = await prisma.ledgerTransaction.create({
      data: { type, idempotencyKey: key, shipmentId, createdAt: at },
    });
    for (const e of entries) {
      await prisma.ledgerAccount.upsert({
        where: { id: e.id },
        create: { id: e.id, kind: e.kind, ownerId: e.ownerId ?? null, currency: 'NGN', balance: BigInt(0) },
        update: {},
      });
      await prisma.ledgerEntry.create({ data: { transactionId: tx.id, accountId: e.id, amount: e.amount } });
      balances.set(e.id, (balances.get(e.id) ?? BigInt(0)) + e.amount);
    }
  }
  const wallet = (id: string) => ({ id: `user_wallet:${id}:NGN`, kind: 'USER_WALLET', ownerId: id });

  // One completed delivery: a trip in the past, a shipment on it, and the
  // full money trail. The sender tops up first so their balance is unchanged.
  let n = 0;
  async function completedDelivery(carrierId: string, senderId: string, c: Corridor, departAt: Date) {
    const id = `hist_shp_${String(n).padStart(3, '0')}`;
    const tripId = `hist_trip_${String(n).padStart(3, '0')}`;
    n += 1;
    const weight = Math.round((1 + rand() * 7) * 2) / 2;
    const declared = Math.round((40000 + rand() * 300000) / 1000) * 1000 * 100;
    const fee = Math.ceil(c.price * weight);
    const platform = Math.floor(fee * 0.05);
    const premium = Math.floor(declared * 0.02);
    const total = fee + platform + premium;
    const arriveAt = new Date(departAt.getTime() + c.hours * HOUR);
    const capacity = c.mode === 'AIR' ? 15 : 30;

    await prisma.trip.create({
      data: {
        id: tripId,
        carrierId,
        originCity: c.from,
        destCity: c.to,
        departAt,
        arriveAt,
        mode: c.mode,
        flightNumber: c.mode === 'AIR' ? `RL${400 + n}` : null,
        capacityKg: capacity,
        remainingKg: Math.max(0, Math.round(capacity * (0.15 + rand() * 0.5)) - weight),
        pricePerKg: c.price,
        currency: 'NGN',
        categories: CATEGORIES,
        international: !!c.intl,
        travelVerified: true,
        status: 'COMPLETED',
      },
    });
    const createdAt = new Date(departAt.getTime() - (2 + rand() * 3) * DAY);
    await prisma.shipment.create({
      data: {
        id,
        senderId,
        receiverName: 'Receiver',
        receiverPhone: '+234800000099',
        originCity: c.from,
        destCity: c.to,
        category: pick(CATEGORIES),
        weightKg: weight,
        declaredValue: declared,
        currency: 'NGN',
        photos: [],
        status: 'COMPLETED',
        totalPrice: fee,
        createdAt,
        legs: {
          create: {
            id: `hist_leg_${id}`,
            tripId,
            sequence: 1,
            fee,
            currency: 'NGN',
            acceptDeadline: new Date(departAt.getTime() - 48 * HOUR),
            status: 'SETTLED',
          },
        },
      },
    });

    const legId = `hist_leg_${id}`;
    const escrow = { id: `escrow:${id}:NGN`, kind: 'ESCROW' };
    const partial = BigInt(Math.floor(fee * 0.7));
    await post('TOPUP', `hist-topup:${id}`, new Date(createdAt.getTime() - HOUR), null, [
      { id: 'psp_clearing:NGN', kind: 'PSP_CLEARING', amount: -BigInt(total) },
      { ...wallet(senderId), amount: BigInt(total) },
    ]);
    await post('FUND_ESCROW', `fund:${id}`, createdAt, id, [
      { ...wallet(senderId), amount: -BigInt(total) },
      { ...escrow, amount: BigInt(fee + platform) },
      { id: 'insurance_pool:NGN', kind: 'INSURANCE_POOL', amount: BigInt(premium) },
    ]);
    await post('RELEASE_LEG', `release:${legId}:partial`, new Date(arriveAt.getTime() - HOUR), id, [
      { ...escrow, amount: -partial },
      { ...wallet(carrierId), amount: partial },
    ]);
    await post('RELEASE_LEG', `release:${legId}:final`, new Date(arriveAt.getTime() + 2 * HOUR), id, [
      { ...escrow, amount: -(BigInt(fee) - partial) },
      { ...wallet(carrierId), amount: BigInt(fee) - partial },
    ]);
    await post('PLATFORM_FEE', `platform:${id}`, new Date(arriveAt.getTime() + 2 * HOUR), id, [
      { ...escrow, amount: -BigInt(platform) },
      { id: 'platform_revenue:NGN', kind: 'REVENUE', amount: BigInt(platform) },
    ]);
  }

  // Chika: a steady Awka/Onitsha courier, busier in recent months.
  const chikaRoutes = [CORRIDORS[5], CORRIDORS[6], CORRIDORS[2]];
  for (let m = 5; m >= 0; m--) {
    const trips = 2 + Math.floor((5 - m) / 2) + Math.floor(rand() * 2);
    for (let t = 0; t < trips; t++) {
      const departAt = new Date(now - (m * 30 + 3 + rand() * 24) * DAY);
      if (departAt.getTime() > now - 2 * DAY) continue;
      await completedDelivery(core.chika.id, rand() < 0.45 ? core.ada.id : ngozi.id, pick(chikaRoutes), departAt);
    }
  }
  // Chika also sends, so one account shows both sides of the network.
  for (const d of [140, 75, 20]) {
    await completedDelivery(core.bola.id, core.chika.id, CORRIDORS[8], new Date(now - d * DAY));
  }
  // Everyone else builds a track record (drives the Top 20 ranking).
  for (const [i, c] of couriers.slice(1).entries()) {
    const runs = 2 + Math.floor(rand() * (10 - Math.min(i, 8)));
    for (let r = 0; r < runs; r++) {
      const options = c.tier === 'T2' ? CORRIDORS : CORRIDORS.filter((x) => !x.intl);
      await completedDelivery(c.id, rand() < 0.3 ? core.ada.id : ngozi.id, pick(options), new Date(now - (5 + rand() * 170) * DAY));
    }
  }

  // Live board: upcoming trips and trips already on the road, some with
  // packages in custody right now.
  for (const [i, c] of couriers.slice(3).entries()) {
    const options = c.tier === 'T2' ? CORRIDORS : CORRIDORS.filter((x) => !x.intl);
    const corridor = options[(i * 3) % options.length];
    const inTransit = i % 4 === 1;
    const departAt = inTransit ? new Date(now - corridor.hours * 0.4 * HOUR) : new Date(now + (1 + (i % 9)) * DAY + (i % 5) * HOUR);
    const capacity = corridor.mode === 'AIR' ? 15 : 25 + (i % 3) * 5;
    const bookedKg = Math.round(capacity * ((i * 37) % 90) / 100);
    const tripId = `live_trip_${i}`;
    await prisma.trip.create({
      data: {
        id: tripId,
        carrierId: c.id,
        originCity: corridor.from,
        destCity: corridor.to,
        departAt,
        arriveAt: new Date(departAt.getTime() + corridor.hours * HOUR),
        mode: corridor.mode,
        flightNumber: corridor.mode === 'AIR' ? `RL${700 + i}` : null,
        capacityKg: capacity,
        remainingKg: capacity - bookedKg,
        pricePerKg: corridor.price,
        currency: 'NGN',
        categories: CATEGORIES,
        international: !!corridor.intl,
        travelVerified: true,
        status: 'OPEN',
      },
    });
    const parcels = bookedKg > 0 ? 1 + (i % 3) : 0;
    for (let p = 0; p < parcels; p++) {
      const weight = Math.max(1, Math.round(bookedKg / parcels));
      await prisma.shipment.create({
        data: {
          id: `live_shp_${i}_${p}`,
          senderId: ngozi.id,
          receiverName: 'Receiver',
          receiverPhone: '+234800000099',
          originCity: corridor.from,
          destCity: corridor.to,
          category: pick(CATEGORIES),
          weightKg: weight,
          declaredValue: 10000000,
          currency: 'NGN',
          photos: [],
          status: inTransit ? 'IN_TRANSIT' : 'FUNDED',
          totalPrice: Math.ceil(corridor.price * weight),
          createdAt: new Date(now - (3 + p) * DAY),
          legs: {
            create: {
              tripId,
              sequence: 1,
              fee: Math.ceil(corridor.price * weight),
              currency: 'NGN',
              acceptDeadline: new Date(departAt.getTime() - 48 * HOUR),
              status: inTransit ? 'IN_CUSTODY' : 'AWAITING_PICKUP',
            },
          },
        },
      });
    }
  }

  // Ledger balances are a cache of the entries; write them once at the end.
  for (const [id, delta] of balances) {
    await prisma.ledgerAccount.update({ where: { id }, data: { balance: { increment: delta } } });
  }
}
