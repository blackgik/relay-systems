// When each side may review the other, and when each side may see the other's
// real identity. Pure rules, shared by the shipments and trust services.

/** Leg states where the package reached the end of this courier's leg. */
export const ENDED = ['HANDED_OFF', 'SETTLED'] as const;
/** Leg states where an accepted leg was cut short. */
export const TERMINATED = ['NO_SHOW', 'LOST', 'DISPUTED'] as const;

export type Outcome = 'DELIVERED' | 'TERMINATED';

/**
 * How a leg finished, or null while it is still open (or was never accepted).
 * An accepted leg that later expired, e.g. the shipment was cancelled or
 * rerouted after the courier said yes, counts as terminated.
 */
export function legOutcome(leg: { status: string; acceptedAt: Date | null }): Outcome | null {
  if ((ENDED as readonly string[]).includes(leg.status)) return 'DELIVERED';
  if ((TERMINATED as readonly string[]).includes(leg.status)) return 'TERMINATED';
  if (leg.status === 'EXPIRED' && leg.acceptedAt) return 'TERMINATED';
  return null;
}

/** Identity unlocks for both sides the moment the courier accepts, and stays for the record. */
export function identityUnlocked(leg: { status: string; acceptedAt: Date | null }): boolean {
  return !!leg.acceptedAt && leg.status !== 'REJECTED';
}

export const MAX_COMMENT = 500;

export function cleanComment(comment: string | undefined | null): string | null {
  const c = comment?.trim().replace(/\s+/g, ' ');
  return c ? c.slice(0, MAX_COMMENT) : null;
}

export const IDENTITY_SELECT = {
  id: true,
  fullName: true,
  handle: true,
  kycTier: true,
  createdAt: true,
  kycProfile: {
    select: {
      status: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      address: true,
      city: true,
      state: true,
    },
  },
  bankAccount: { select: { bankName: true, accountName: true, accountLast4: true, nameMatches: true } },
} as const;

interface IdentitySource {
  fullName: string;
  handle: string | null;
  kycTier: string;
  kycProfile: {
    status: string;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    dateOfBirth: Date | null;
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
  bankAccount: { bankName: string; accountName: string; accountLast4: string; nameMatches: boolean } | null;
}

/**
 * The real person behind a handle, for the other side of an accepted leg:
 * KYC name, date of birth and where they live, plus the payout account name
 * Paystack returned, so the counterparty can check the names agree. Never the
 * BVN, NIN, ID number, full account number, email or phone.
 */
export function revealIdentity(u: IdentitySource) {
  const k = u.kycProfile;
  const verified = k?.status === 'VERIFIED';
  return {
    handle: u.handle,
    tier: u.kycTier,
    kycVerified: verified,
    firstName: k?.firstName ?? u.fullName.split(' ')[0],
    middleName: k?.middleName ?? null,
    lastName: k?.lastName ?? (u.fullName.split(' ').slice(1).join(' ') || null),
    dateOfBirth: k?.dateOfBirth ? k.dateOfBirth.toISOString().slice(0, 10) : null,
    address: k?.address ?? null,
    city: k?.city ?? null,
    state: k?.state ?? null,
    bank: u.bankAccount
      ? {
          bankName: u.bankAccount.bankName,
          accountName: u.bankAccount.accountName,
          accountLast4: u.bankAccount.accountLast4,
          // Paystack's account holder name agrees with the KYC name.
          nameMatches: u.bankAccount.nameMatches,
        }
      : null,
  };
}
