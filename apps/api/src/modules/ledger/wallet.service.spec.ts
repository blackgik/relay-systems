import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { encrypt } from '../../common/crypto/pii';

const PAYOUT = {
  userId: 'u1', bankCode: '058', bankName: 'GTBank', accountName: 'OKAFOR ADA', accountLast4: '6789',
  accountNumberEnc: encrypt('0123456789'), nameMatches: true,
};

function build() {
  const prisma: any = {
    ledgerAccount: { findMany: jest.fn() },
    ledgerEntry: { findMany: jest.fn() },
    ledgerTransaction: { findUnique: jest.fn() },
    paymentOrder: {
      create: jest.fn(({ data }: any) => Promise.resolve({ id: 'po1', ...data })),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { findUnique: jest.fn() },
    bankAccount: { findUnique: jest.fn().mockResolvedValue(PAYOUT) },
  };
  const ledger: any = { post: jest.fn(), balance: jest.fn() };
  return { prisma, ledger, service: new WalletService(prisma, ledger) };
}

function buildWithPaystack() {
  const base = build();
  const paystack: any = {
    configured: true,
    initializeTransaction: jest.fn().mockResolvedValue({ authorization_url: 'https://paystack/checkout/x' }),
    verifyTransaction: jest.fn(),
    createTransferRecipient: jest.fn().mockResolvedValue({ recipient_code: 'RCP_1' }),
    initiateTransfer: jest.fn().mockResolvedValue({ status: 'pending' }),
  };
  return { ...base, paystack, service: new WalletService(base.prisma, base.ledger, paystack) };
}

describe('WalletService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_x';
    delete process.env.PAYSTACK_ALLOW_LIVE;
    process.env.NODE_ENV = 'test';
  });
  afterAll(() => {
    process.env = env;
  });

  it('topup credits the wallet from PSP clearing', async () => {
    const { ledger, service } = build();
    ledger.post.mockResolvedValue({ duplicate: false });

    const result = await service.topup('u1', 50000, 'NGN', 'topup:ref1');

    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOPUP',
        idempotencyKey: 'topup:ref1',
        entries: [
          expect.objectContaining({ amount: BigInt(-50000) }),
          expect.objectContaining({ amount: BigInt(50000) }),
        ],
      })
    );
    expect(result.reference).toBe('topup:ref1');
  });

  it('settleTopup replays are duplicates, unknown refs are not found', async () => {
    const { prisma, service } = build();
    prisma.ledgerTransaction.findUnique.mockResolvedValue({ id: 'lt1' });
    await expect(service.settleTopup('topup:ref1')).resolves.toMatchObject({ duplicate: true });
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    await expect(service.settleTopup('topup:nope')).rejects.toThrow(NotFoundException);
  });

  it('withdraw checks the balance before posting', async () => {
    const { ledger, service } = build();
    ledger.balance.mockResolvedValue(BigInt(100));
    await expect(service.withdraw('u1', 50000, 'NGN')).rejects.toThrow(BadRequestException);
    expect(ledger.post).not.toHaveBeenCalled();

    ledger.balance.mockResolvedValue(BigInt(60000));
    ledger.post.mockResolvedValue({ duplicate: false });
    await service.withdraw('u1', 50000, 'NGN');
    expect(ledger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WITHDRAW',
        entries: [
          expect.objectContaining({ amount: BigInt(-50000) }),
          expect.objectContaining({ amount: BigInt(50000) }),
        ],
      })
    );
  });

  it('startTopup settles instantly through the mock PSP when Paystack is absent', async () => {
    const { ledger, service } = build();
    ledger.post.mockResolvedValue({ duplicate: false });
    const result = await service.startTopup('u1', { amountMinors: 50000, currency: 'NGN', method: 'card' });
    expect(result).toMatchObject({ provider: 'mock', status: 'SUCCESS' });
    expect(ledger.post).toHaveBeenCalledWith(expect.objectContaining({ type: 'TOPUP' }));
  });

  it('startTopup returns a Paystack checkout and verifyTopup credits once', async () => {
    const { prisma, ledger, paystack, service } = buildWithPaystack();
    prisma.user.findUnique.mockResolvedValue({ email: 'a@b.c' });
    ledger.post.mockResolvedValue({ duplicate: false });

    const started = await service.startTopup('u1', { amountMinors: 50000, currency: 'NGN', method: 'transfer' });
    expect(started).toMatchObject({ provider: 'paystack', status: 'PENDING', checkoutUrl: 'https://paystack/checkout/x' });
    expect(paystack.initializeTransaction).toHaveBeenCalledWith(expect.objectContaining({ channels: ['bank_transfer'] }));
    expect(ledger.post).not.toHaveBeenCalled();

    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po1', userId: 'u1', kind: 'TOPUP', reference: started.reference,
      amountMinors: 50000, currency: 'NGN', provider: 'paystack', status: 'PENDING',
    });
    paystack.verifyTransaction.mockResolvedValue({ status: 'success', amount: 50000 });
    await expect(service.verifyTopup('u1', started.reference)).resolves.toMatchObject({ status: 'SUCCESS' });
    expect(ledger.post).toHaveBeenCalledWith(expect.objectContaining({ type: 'TOPUP', idempotencyKey: started.reference }));

    paystack.verifyTransaction.mockResolvedValue({ status: 'success', amount: 1 });
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po1', userId: 'u1', kind: 'TOPUP', reference: started.reference,
      amountMinors: 50000, currency: 'NGN', provider: 'paystack', status: 'PENDING',
    });
    await expect(service.verifyTopup('u1', started.reference)).rejects.toThrow(BadRequestException);
  });

  it('startWithdraw pays out only to the verified payout account, debiting after the transfer starts', async () => {
    const { ledger, paystack, service } = buildWithPaystack();
    ledger.balance.mockResolvedValue(BigInt(60000));
    ledger.post.mockResolvedValue({ duplicate: false });
    const result = await service.startWithdraw('u1', { amountMinors: 50000, currency: 'NGN' });
    expect(result).toMatchObject({ provider: 'paystack', status: 'PENDING' });
    expect(paystack.createTransferRecipient).toHaveBeenCalledWith({ name: 'OKAFOR ADA', accountNumber: '0123456789', bankCode: '058' });
    expect(paystack.initiateTransfer).toHaveBeenCalled();
    expect(ledger.post).toHaveBeenCalledWith(expect.objectContaining({ type: 'WITHDRAW' }));
  });

  it('refuses to withdraw without a payout account on file', async () => {
    const { prisma, ledger, service } = buildWithPaystack();
    prisma.bankAccount.findUnique.mockResolvedValue(null);
    ledger.balance.mockResolvedValue(BigInt(60000));
    await expect(service.startWithdraw('u1', { amountMinors: 50000, currency: 'NGN' })).rejects.toThrow(/payout bank account/);
  });

  it('never moves real money with a live key outside production unless explicitly allowed', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_x';
    const { ledger, paystack, service } = buildWithPaystack();
    ledger.balance.mockResolvedValue(BigInt(60000));
    ledger.post.mockResolvedValue({ duplicate: false });
    expect(service.mode).toBe('simulated');

    await expect(service.startTopup('u1', { amountMinors: 50000, currency: 'NGN', method: 'card' })).resolves.toMatchObject({ provider: 'mock', mode: 'simulated' });
    await expect(service.startWithdraw('u1', { amountMinors: 50000, currency: 'NGN' })).resolves.toMatchObject({ provider: 'mock' });
    expect(paystack.initializeTransaction).not.toHaveBeenCalled();
    expect(paystack.initiateTransfer).not.toHaveBeenCalled();

    process.env.PAYSTACK_ALLOW_LIVE = 'true';
    expect(service.mode).toBe('paystack');
    delete process.env.PAYSTACK_ALLOW_LIVE;
    process.env.NODE_ENV = 'production';
    expect(service.mode).toBe('paystack');
  });

  it('transactions clamps take into a safe page size', async () => {
    const { prisma, service } = build();
    prisma.ledgerAccount.findMany.mockResolvedValue([{ id: 'wallet:u1:NGN' }]);
    prisma.ledgerEntry.findMany.mockResolvedValue([]);

    await service.transactions('u1', 5000);
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );

    await service.transactions('u1', Number('abc'));
    expect(prisma.ledgerEntry.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 50 })
    );

    await service.transactions('u1', 0);
    expect(prisma.ledgerEntry.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });
});
