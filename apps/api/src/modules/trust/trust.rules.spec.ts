import { cleanComment, identityUnlocked, legOutcome, revealIdentity } from './trust.rules';

describe('trust rules', () => {
  const at = new Date();

  it('knows when a leg ended, was terminated, or is still open', () => {
    expect(legOutcome({ status: 'SETTLED', acceptedAt: at })).toBe('DELIVERED');
    expect(legOutcome({ status: 'HANDED_OFF', acceptedAt: at })).toBe('DELIVERED');
    expect(legOutcome({ status: 'NO_SHOW', acceptedAt: at })).toBe('TERMINATED');
    expect(legOutcome({ status: 'EXPIRED', acceptedAt: at })).toBe('TERMINATED');
    expect(legOutcome({ status: 'EXPIRED', acceptedAt: null })).toBeNull();
    expect(legOutcome({ status: 'IN_CUSTODY', acceptedAt: at })).toBeNull();
    expect(legOutcome({ status: 'PROPOSED', acceptedAt: null })).toBeNull();
  });

  it('unlocks identity only after acceptance', () => {
    expect(identityUnlocked({ status: 'PROPOSED', acceptedAt: null })).toBe(false);
    expect(identityUnlocked({ status: 'ACCEPTED', acceptedAt: at })).toBe(true);
    expect(identityUnlocked({ status: 'SETTLED', acceptedAt: at })).toBe(true);
  });

  it('reveals name, birth date, address and bank name match, never ID numbers', () => {
    const out = revealIdentity({
      fullName: 'Ada Okafor',
      handle: 'harbor-heron-21',
      kycTier: 'T2',
      kycProfile: {
        status: 'VERIFIED',
        firstName: 'Ada',
        middleName: 'Chioma',
        lastName: 'Okafor',
        dateOfBirth: new Date('1994-03-12T00:00:00Z'),
        address: '12 Zik Avenue',
        city: 'Awka',
        state: 'Anambra',
      },
      bankAccount: { bankName: 'GTBank', accountName: 'OKAFOR ADA CHIOMA', accountLast4: '4821', nameMatches: true },
    });
    expect(out).toMatchObject({ firstName: 'Ada', lastName: 'Okafor', dateOfBirth: '1994-03-12', city: 'Awka', kycVerified: true });
    expect(out.bank).toEqual({ bankName: 'GTBank', accountName: 'OKAFOR ADA CHIOMA', accountLast4: '4821', nameMatches: true });
    expect(JSON.stringify(out)).not.toMatch(/nin|bvn|Enc|fingerprint/i);
  });

  it('trims comments and drops empty ones', () => {
    expect(cleanComment('  great   courier  ')).toBe('great courier');
    expect(cleanComment('   ')).toBeNull();
    expect(cleanComment('x'.repeat(900))).toHaveLength(500);
  });
});
