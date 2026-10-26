export interface CheckoutInput {
  userId: string;
  amountMinors: number;
  currency: string;
  reference: string;
}

export interface CheckoutResult {
  reference: string;
  checkoutUrl: string;
}

// Every payment provider (Paystack, Flutterwave, Stripe, mock) sits behind
// this interface. Real money is held by the PSP; our ledger mirrors it.
export interface PaymentProvider {
  name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
