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
