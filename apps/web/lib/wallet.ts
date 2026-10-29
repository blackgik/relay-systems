// Wallet types and the pure rules behind the wallet screen.

export interface WalletAccount {
  id: string;
  currency: string;
  balance: number;
}

export interface LedgerLine {
  id: string;
  accountId: string;
  amount: number;
  transaction: { id: string; type: string; shipmentId?: string | null; createdAt: string };
}

export interface FlowPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export type WalletMode = 'paystack' | 'simulated' | 'mock';

export interface WalletSummary {
  balances: WalletAccount[];
  currency: string;
  toppedUp: number;
  withdrawn: number;
  /** Your money held in escrow for packages you sent. */
  escrowForMyShipments: number;
  /** Fees on packages you carry, still in escrow, that will land in your wallet. */
  escrowAwaitingWallet: number;
  awaitingLegs: number;
  breakdown: { topups: number; payouts: number; refunds: number; withdrawals: number; intoEscrow: number; other: number };
  mode: WalletMode;
  flow: FlowPoint[];
}

export type InvoiceStatus = 'ISSUED' | 'FUNDED' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export interface Invoice {
  id: string;
  number: string;
  legId: string;
  shipmentId: string;
  currency: string;
  amount: number;
  amountPaid: number;
  status: InvoiceStatus;
  escrowFundedAt: string | null;
  paidToWalletAt: string | null;
  createdAt: string;
  role: 'carrier' | 'sender';
  senderHandle: string | null;
  carrierHandle: string | null;
  route: { originCity: string; destCity: string; category: string; weightKg: number } | null;
}

export interface PaymentOrder {
  id: string;
  kind: 'TOPUP' | 'WITHDRAWAL';
  reference: string;
  amountMinors: number;
  currency: string;
  method: string;
  provider: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  accountName: string | null;
  accountLast4: string | null;
  createdAt: string;
  settledAt: string | null;
}

export const TYPE_LABEL: Record<string, string> = {
  TOPUP: 'Added money',
  WITHDRAW: 'Withdrawal',
  WITHDRAW_REVERSAL: 'Withdrawal reversed',
  FUND_ESCROW: 'Paid into escrow',
  RELEASE_LEG: 'Escrow payout',
  REFUND: 'Escrow refund',
  PLATFORM_FEE: 'Platform fee',
};

export const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  ISSUED: 'Awaiting escrow',
  FUNDED: 'In escrow',
  PARTIALLY_PAID: 'Part paid to wallet',
  PAID: 'Paid to wallet',
  REFUNDED: 'Refunded',
};

export type LineKind = 'all' | 'in' | 'out' | 'escrow';
export type Period = 7 | 30 | 90 | 0;

const ESCROW_TYPES = ['FUND_ESCROW', 'RELEASE_LEG', 'REFUND'];

/** Filter wallet movements by kind, period (days; 0 = all time) and a search over label and amount. */
export function filterLines(lines: LedgerLine[], opts: { kind: LineKind; period: Period; q?: string }, now = Date.now()) {
  const since = opts.period ? now - opts.period * 86_400_000 : 0;
  const q = (opts.q ?? '').trim().toLowerCase();
  return lines.filter((l) => {
    const t = l.transaction.type;
    if (opts.kind === 'in' && !(l.amount > 0 && !ESCROW_TYPES.includes(t))) return false;
    if (opts.kind === 'out' && !(l.amount < 0 && !ESCROW_TYPES.includes(t))) return false;
    if (opts.kind === 'escrow' && !ESCROW_TYPES.includes(t)) return false;
    if (since && new Date(l.transaction.createdAt).getTime() < since) return false;
    if (q && !`${TYPE_LABEL[t] ?? t} ${(Math.abs(l.amount) / 100).toFixed(2)} ${l.transaction.shipmentId ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/**
 * The escrow gauge: of the money your carrying has earned recently, how much
 * is already in your wallet versus still held in escrow.
 */
export function escrowShare(paidOut: number, awaiting: number) {
  const total = paidOut + awaiting;
  return { total, paidShare: total ? paidOut / total : 0, awaitingShare: total ? awaiting / total : 0 };
}

function csvCell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Invoice activity as CSV (amounts in major units), for the Export button. */
export function invoicesToCsv(invoices: Invoice[]) {
  const header = ['Invoice', 'Role', 'Route', 'Counterparty', 'Amount', 'Paid to wallet', 'Currency', 'Status', 'Issued', 'Escrow funded', 'Paid'];
  const rows = invoices.map((i) => [
    i.number,
    i.role === 'carrier' ? 'Carrying' : 'Sending',
    i.route ? `${i.route.originCity} → ${i.route.destCity}` : '',
    i.role === 'carrier' ? (i.senderHandle ? `@${i.senderHandle}` : '') : i.carrierHandle ? `@${i.carrierHandle}` : '',
    (i.amount / 100).toFixed(2),
    (i.amountPaid / 100).toFixed(2),
    i.currency,
    INVOICE_LABEL[i.status],
    i.createdAt.slice(0, 10),
    i.escrowFundedAt?.slice(0, 10) ?? '',
    i.paidToWalletAt?.slice(0, 10) ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

/** Where an invoice is in its life: issued → in escrow → paid to wallet. */
export function invoiceStep(status: InvoiceStatus): 0 | 1 | 2 | 3 {
  if (status === 'PAID') return 3;
  if (status === 'PARTIALLY_PAID') return 2;
  if (status === 'FUNDED') return 1;
  return 0;
}
