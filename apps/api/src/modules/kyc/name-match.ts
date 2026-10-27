// Does the name a bank holds for an account belong to this person? Nigerian
// banks format names inconsistently ("OKAFOR ADA CHIOMA", "Ada C. Okafor"),
// so compare unordered tokens: the surname must appear, plus the first or
// middle name. Stops payouts being pointed at someone else's account.

function tokens(s: string) {
  return s
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1);
}

export function namesMatch(
  legal: { firstName: string; middleName?: string | null; lastName: string },
  accountName: string
): boolean {
  const held = new Set(tokens(accountName));
  const has = (name?: string | null) => !!name && tokens(name).some((t) => held.has(t));
  return has(legal.lastName) && (has(legal.firstName) || has(legal.middleName));
}
