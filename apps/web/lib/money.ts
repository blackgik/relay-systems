// Minor-unit money formatting. API amounts are integers in kobo/cents.
export function formatMinors(amountMinors: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amountMinors / 100);
  } catch {
    return `${currency} ${(amountMinors / 100).toLocaleString()}`;
  }
}

export function toMinors(major: string): number {
  return Math.round(Number(major) * 100);
}

/** Compact money for tiles and axes: ₦48.2K, ₦1.2M. No decimals under 1,000. */
export function formatMinorsShort(amountMinors: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      notation: 'compact',
      maximumFractionDigits: Math.abs(amountMinors) >= 100_000 ? 1 : 0,
    }).format(amountMinors / 100);
  } catch {
    return `${currency} ${Math.round(amountMinors / 100).toLocaleString()}`;
  }
}
