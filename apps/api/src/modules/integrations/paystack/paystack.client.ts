import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface PaystackBank {
  name: string;
  code: string;
  slug: string;
}

type Envelope<T> = { status: boolean; message: string; data: T };

// Thin Paystack REST client for KYC:
// - listBanks / resolveAccount: confirm an account exists and get the name
//   the bank holds for it.
// - createCustomer + validateCustomer: Paystack's customer validation, which
//   checks that a BVN belongs to the owner of the given bank account. It is
//   asynchronous; poll fetchCustomer until `identified` flips.
@Injectable()
export class PaystackClient {
  private log = new Logger('Paystack');
  private banksCache: { at: number; banks: PaystackBank[] } | null = null;

  get configured() {
    return Boolean(process.env.PAYSTACK_SECRET_KEY);
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    if (!this.configured) throw new ServiceUnavailableException('Bank verification is not configured');
    const base = (process.env.PAYSTACK_URL ?? 'https://api.paystack.co').replace(/\/+$/, '');
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok || !json?.status) {
      const message = json?.message ?? `Paystack error ${res.status}`;
      this.log.warn(`${method} ${path} -> ${res.status}: ${message}`);
      throw new BadGatewayException(message);
    }
    return json.data;
  }

  async listBanks(): Promise<PaystackBank[]> {
    if (this.banksCache && Date.now() - this.banksCache.at < 6 * 60 * 60 * 1000) {
      return this.banksCache.banks;
    }
    const data = await this.call<PaystackBank[]>('GET', '/bank?country=nigeria&perPage=100&use_cursor=false');
    const banks = data.map(({ name, code, slug }) => ({ name, code, slug }));
    this.banksCache = { at: Date.now(), banks };
    return banks;
  }

  resolveAccount(accountNumber: string, bankCode: string) {
    const q = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode });
    return this.call<{ account_number: string; account_name: string }>('GET', `/bank/resolve?${q}`);
  }

  createCustomer(input: { email: string; firstName: string; lastName: string; phone?: string | null }) {
    return this.call<{ customer_code: string }>('POST', '/customer', {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      ...(input.phone ? { phone: input.phone } : {}),
    });
  }

  async validateCustomer(
    customerCode: string,
    input: { bvn: string; bankCode: string; accountNumber: string; firstName: string; lastName: string; middleName?: string | null }
  ) {
    await this.call<unknown>('POST', `/customer/${encodeURIComponent(customerCode)}/identification`, {
      country: 'NG',
      type: 'bank_account',
      bvn: input.bvn,
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      first_name: input.firstName,
      last_name: input.lastName,
      ...(input.middleName ? { middle_name: input.middleName } : {}),
    });
  }

  // ── Payments ────────────────────────────────────────────────────────
  // initializeTransaction opens a Paystack checkout (card or bank transfer
  // channels). Money only moves when the customer completes it; settlement
  // is confirmed by verifyTransaction or the charge.success webhook.
  initializeTransaction(input: {
    email: string;
    amountMinors: number;
    reference: string;
    callbackUrl?: string;
    channels: ('card' | 'bank_transfer')[];
  }) {
    return this.call<{ authorization_url: string; access_code: string; reference: string }>(
      'POST',
      '/transaction/initialize',
      {
        email: input.email,
        amount: input.amountMinors, // Paystack charges in kobo/cents already
        reference: input.reference,
        ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
        channels: input.channels.map((c) => (c === 'bank_transfer' ? 'bank_transfer' : 'card')),
      }
    );
  }

  verifyTransaction(reference: string) {
    return this.call<{ status: string; amount: number; reference: string; channel?: string }>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
  }

  createTransferRecipient(input: { name: string; accountNumber: string; bankCode: string }) {
    return this.call<{ recipient_code: string }>('POST', '/transferrecipient', {
      type: 'nuban',
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: 'NGN',
    });
  }

  initiateTransfer(input: { amountMinors: number; recipientCode: string; reference: string; reason: string }) {
    return this.call<{ status: string; reference: string; transfer_code: string }>('POST', '/transfer', {
      source: 'balance',
      amount: input.amountMinors,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
    });
  }

  fetchCustomer(customerCode: string) {
    return this.call<{
      identified: boolean;
      identifications: { status: string; type: string }[] | null;
    }>('GET', `/customer/${encodeURIComponent(customerCode)}`);
  }
}
