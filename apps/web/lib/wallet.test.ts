import { type Invoice, type LedgerLine, escrowShare, filterLines, invoiceStep, invoicesToCsv } from './wallet';

const now = Date.parse('2026-10-29T12:00:00Z');
const line = (id: string, type: string, amount: number, daysAgo: number): LedgerLine => ({
  id,
  accountId: 'user_wallet:u1:NGN',
  amount,
  transaction: { id: `t-${id}`, type, createdAt: new Date(now - daysAgo * 86_400_000).toISOString() },
});

const lines = [
  line('topup', 'TOPUP', 500000, 1),
  line('payout', 'RELEASE_LEG', 70000, 3),
  line('fund', 'FUND_ESCROW', -436000, 10),
  line('wd', 'WITHDRAW', -200000, 40),
  line('refund', 'REFUND', 100000, 100),
];

describe('filterLines', () => {
  it('splits money in, money out and escrow movements', () => {
    expect(filterLines(lines, { kind: 'in', period: 0 }, now).map((l) => l.id)).toEqual(['topup']);
    expect(filterLines(lines, { kind: 'out', period: 0 }, now).map((l) => l.id)).toEqual(['wd']);
    expect(filterLines(lines, { kind: 'escrow', period: 0 }, now).map((l) => l.id)).toEqual(['payout', 'fund', 'refund']);
  });

  it('limits to a period and searches labels and amounts', () => {
    expect(filterLines(lines, { kind: 'all', period: 7 }, now).map((l) => l.id)).toEqual(['topup', 'payout']);
    expect(filterLines(lines, { kind: 'all', period: 30 }, now)).toHaveLength(3);
    expect(filterLines(lines, { kind: 'all', period: 0, q: 'withdrawal' }, now).map((l) => l.id)).toEqual(['wd']);
    expect(filterLines(lines, { kind: 'all', period: 0, q: '4360' }, now).map((l) => l.id)).toEqual(['fund']);
  });
});

describe('escrowShare', () => {
  it('shows how much of carrying income is already in the wallet', () => {
    expect(escrowShare(75, 25)).toEqual({ total: 100, paidShare: 0.75, awaitingShare: 0.25 });
    expect(escrowShare(0, 0)).toEqual({ total: 0, paidShare: 0, awaitingShare: 0 });
  });
});

describe('invoices', () => {
  const inv: Invoice = {
    id: 'i1',
    number: 'INV-1',
    legId: 'l1',
    shipmentId: 's1',
    currency: 'NGN',
    amount: 400000,
    amountPaid: 280000,
    status: 'PARTIALLY_PAID',
    escrowFundedAt: '2026-10-20T10:00:00Z',
    paidToWalletAt: null,
    createdAt: '2026-10-19T09:00:00Z',
    role: 'carrier',
    senderHandle: 'harbor-heron-21',
    carrierHandle: 'amber-otter-14',
    route: { originCity: 'Awka', destCity: 'Abuja, FCT', category: 'fabric', weightKg: 2 },
  };

  it('exports CSV with quoted cells where needed', () => {
    const csv = invoicesToCsv([inv]).split('\n');
    expect(csv[0]).toBe('Invoice,Role,Route,Counterparty,Amount,Paid to wallet,Currency,Status,Issued,Escrow funded,Paid');
    expect(csv[1]).toBe('INV-1,Carrying,"Awka → Abuja, FCT",@harbor-heron-21,4000.00,2800.00,NGN,Part paid to wallet,2026-10-19,2026-10-20,');
  });

  it('steps an invoice through issued, escrow and paid', () => {
    expect([invoiceStep('ISSUED'), invoiceStep('FUNDED'), invoiceStep('PARTIALLY_PAID'), invoiceStep('PAID')]).toEqual([0, 1, 2, 3]);
  });
});
