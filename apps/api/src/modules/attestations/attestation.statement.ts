import { createHash, randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';

// The declaration a sender signs before any courier sees their request, and
// the undertaking every courier on the chain is bound by. Both are printed on
// the downloadable A4. Change the wording -> bump the version, so an old
// document still proves exactly what its signer agreed to.

export const STATEMENT_VERSION = '2026-10.1';

export const SENDER_CLAUSES = [
  'The goods in this package are exactly as described, are lawfully mine to send, and are not stolen, counterfeit or the proceeds of any crime.',
  'The package contains no narcotics, weapons, ammunition, explosives, currency smuggled outside declared limits, wildlife products or any item prohibited at its origin, destination or any city on its route.',
  'I alone bear full criminal and civil responsibility for anything unlawful found in this package. The courier who carries it in good faith, and Relay, are not liable for its contents.',
  'I consent to the package being inspected by the courier before acceptance and by any lawful authority at any point, and to this declaration being shared with law enforcement on request.',
] as const;

export const COURIER_CLAUSES = [
  'Every handover of this package is recorded on Relay: tamper-evident seal, photographs, GPS position and time at pickup, each relay point and delivery.',
  'The package must be delivered sealed and intact, only to the named receiver against their one-time delivery code.',
  'Stealing, opening, swapping or abandoning this package is a crime. It will be traced through the custody record, payment will be withheld, the courier banned, and the matter referred to the police for prosecution to the full extent of the law.',
  'A courier may refuse a package they suspect is unlawful, and must report it to Relay instead of carrying it.',
] as const;

export function statementHash(version = STATEMENT_VERSION): string {
  return createHash('sha256')
    .update([version, ...SENDER_CLAUSES, ...COURIER_CLAUSES].join('\n'))
    .digest('hex');
}

export function publicStatement() {
  return {
    version: STATEMENT_VERSION,
    hash: statementHash(),
    senderClauses: SENDER_CLAUSES,
    courierClauses: COURIER_CLAUSES,
  };
}

/** Verified KYC name when there is one, else the account name. */
export function legalName(user: {
  fullName: string;
  kycProfile?: { status: string; firstName: string | null; middleName: string | null; lastName: string | null } | null;
}): string {
  const k = user.kycProfile;
  if (k?.status === 'VERIFIED' && k.firstName && k.lastName) {
    return [k.firstName, k.middleName, k.lastName].filter(Boolean).join(' ');
  }
  return user.fullName;
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z\p{L}]+/gu, ' ').trim();

/** The typed signature must be the signer's own name: any order of their name parts, case-insensitive. */
export function signatureMatches(signed: string, name: string): boolean {
  const typed = normalise(signed).split(' ').filter(Boolean);
  const parts = normalise(name).split(' ').filter(Boolean);
  if (typed.length < 2 || parts.length < 2) return false;
  // Every typed part is one of the name's parts, and first and last name are both there.
  return typed.every((p) => parts.includes(p)) && typed.includes(parts[0]) && typed.includes(parts[parts.length - 1]);
}

export interface AttestationInput {
  accepted: boolean;
  signedName: string;
  statementVersion: string;
}

/** Validates a sender's signature; returns the row to store. */
export function buildAttestation(input: AttestationInput | undefined, senderLegalName: string) {
  if (!input?.accepted) {
    throw new BadRequestException('Sign the declaration of lawful goods before sending a request');
  }
  if (input.statementVersion !== STATEMENT_VERSION) {
    throw new BadRequestException('The declaration has been updated. Reload and sign the current version');
  }
  if (!signatureMatches(input.signedName, senderLegalName)) {
    throw new BadRequestException(`Sign with your full legal name as verified on Relay (${senderLegalName})`);
  }
  return {
    reference: `RLY-DEC-${randomBytes(4).toString('hex').toUpperCase()}`,
    signedName: input.signedName.trim().replace(/\s+/g, ' '),
    statementVersion: STATEMENT_VERSION,
    statementHash: statementHash(),
  };
}
