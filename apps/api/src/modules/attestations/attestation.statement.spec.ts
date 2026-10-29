import {
  STATEMENT_VERSION,
  buildAttestation,
  legalName,
  signatureMatches,
  statementHash,
} from './attestation.statement';

describe('attestation statement', () => {
  it('accepts the signer’s own name in any case or order, with or without a middle name', () => {
    expect(signatureMatches('Ada Okafor', 'Ada Okafor')).toBe(true);
    expect(signatureMatches('  okafor   ada ', 'Ada Okafor')).toBe(true);
    expect(signatureMatches('Ada Okafor', 'Ada Chioma Okafor')).toBe(true);
    expect(signatureMatches('Ada Chioma Okafor', 'Ada Chioma Okafor')).toBe(true);
  });

  it('rejects someone else’s name, a single word, or extra names', () => {
    expect(signatureMatches('Chika Eze', 'Ada Okafor')).toBe(false);
    expect(signatureMatches('Ada', 'Ada Okafor')).toBe(false);
    expect(signatureMatches('Ada Okafor Smith', 'Ada Okafor')).toBe(false);
    expect(signatureMatches('Chioma Okafor', 'Ada Chioma Okafor')).toBe(false);
  });

  it('prefers the verified KYC name over the account name', () => {
    const kyc = { status: 'VERIFIED', firstName: 'Adaeze', middleName: null, lastName: 'Okafor' };
    expect(legalName({ fullName: 'Ada O', kycProfile: kyc })).toBe('Adaeze Okafor');
    expect(legalName({ fullName: 'Ada O', kycProfile: { ...kyc, status: 'SUBMITTED' } })).toBe('Ada O');
  });

  it('hashes the exact wording and version that was signed', () => {
    const row = buildAttestation({ accepted: true, signedName: 'Ada  Okafor', statementVersion: STATEMENT_VERSION }, 'Ada Okafor');
    expect(row).toMatchObject({ signedName: 'Ada Okafor', statementVersion: STATEMENT_VERSION, statementHash: statementHash() });
    expect(statementHash('other')).not.toBe(statementHash());
    expect(() => buildAttestation({ accepted: false, signedName: 'Ada Okafor', statementVersion: STATEMENT_VERSION }, 'Ada Okafor')).toThrow();
  });
});
