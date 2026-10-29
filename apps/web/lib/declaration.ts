// Client mirror of the API's signature rule (attestation.statement.ts), for
// instant feedback while the sender types. The API stays the authority.

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z\p{L}]+/gu, ' ').trim();

/** Their own name: any order or case, first and last name both present, no extra names. */
export function signatureMatches(signed: string, name: string): boolean {
  const typed = normalise(signed).split(' ').filter(Boolean);
  const parts = normalise(name).split(' ').filter(Boolean);
  if (typed.length < 2 || parts.length < 2) return false;
  return typed.every((p) => parts.includes(p)) && typed.includes(parts[0]) && typed.includes(parts[parts.length - 1]);
}

/** Script stack for signatures: every OS ships one of these, no web font needed. */
export const SIGNATURE_FONT = "'Snell Roundhand', 'Segoe Script', 'Brush Script MT', 'URW Chancery L', cursive";

export function declarationPath(shipmentId: string) {
  return `/declarations/${shipmentId}`;
}
