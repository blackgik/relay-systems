import { Injectable } from '@nestjs/common';
import { CheckoutInput, CheckoutResult, PaymentProvider } from './payment-provider.interface';

// Mock adapter: approves instantly so the demo never depends on a PSP sandbox.
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  name = 'mock';

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return {
      reference: input.reference,
      checkoutUrl: `mock://psp/checkout/${input.reference}`,
    };
  }
}
