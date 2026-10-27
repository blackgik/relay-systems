import { randomInt } from 'node:crypto';

// Public pseudonyms. Everything other users see about a person is keyed by
// this handle, never their name or account id, so a listing can't be used
// to identify or follow someone.

const ADJECTIVES = [
  'swift', 'quiet', 'amber', 'north', 'rapid', 'steady', 'bright', 'calm', 'brave', 'mellow',
  'silver', 'golden', 'crimson', 'azure', 'olive', 'scarlet', 'velvet', 'copper', 'marble', 'willow',
];
const ANIMALS = [
  'fox', 'hawk', 'otter', 'lynx', 'heron', 'falcon', 'badger', 'orca', 'egret', 'zebra',
  'panda', 'raven', 'tiger', 'wolf', 'bear', 'eagle', 'kudu', 'moose', 'crane', 'finch',
];

export const HANDLE_PATTERN = /^[a-z][a-z0-9-]{2,19}$/;

const RESERVED = ['admin', 'relay', 'support', 'help', 'staff', 'arbiter', 'system', 'official', 'moderator'];

export function generateHandle(): string {
  const a = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const b = ANIMALS[randomInt(ANIMALS.length)];
  return `${a}-${b}-${randomInt(10, 100)}`;
}

/** Returns an error message, or null when the handle is acceptable for this person. */
export function handleProblem(handle: string, fullName: string): string | null {
  if (!HANDLE_PATTERN.test(handle)) {
    return 'Use 3–20 lowercase letters, numbers or dashes, starting with a letter';
  }
  if (handle.includes('--') || handle.endsWith('-')) return 'Dashes must sit between letters or numbers';
  if (RESERVED.some((r) => handle.includes(r))) return 'That username is reserved';
  // The point of a handle is anonymity: block names that give the person away.
  const nameParts = fullName
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((p) => p.length >= 3);
  const compact = handle.replace(/[^a-z]/g, '');
  if (nameParts.some((p) => compact.includes(p))) {
    return 'Pick a username that does not contain your real name — it keeps you safe on the road';
  }
  return null;
}
