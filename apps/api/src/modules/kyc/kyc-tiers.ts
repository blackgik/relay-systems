import { KycTier } from '@prisma/client';

const TIER_ORDER: Record<KycTier, number> = { T0: 0, T1: 1, T2: 2 };

export function meetsTier(actual: KycTier, required: KycTier): boolean {
  return TIER_ORDER[actual] >= TIER_ORDER[required];
}

// NIN/BVN lift to T1, passports to T2. Liveness and travel proof verify a
// fact without changing the tier. Only upgrades, never downgrades.
export function tierForCheck(
  type: string,
  current: KycTier
): KycTier {
  if (type === 'PASSPORT') return 'T2';
  if ((type === 'NIN' || type === 'BVN') && current === 'T0') return 'T1';
  return current;
}
