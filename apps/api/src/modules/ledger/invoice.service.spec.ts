import { InvoiceService, invoiceNumber } from './invoice.service';

describe('invoiceNumber', () => {
  it('derives a stable human number from the leg id', () => {
    expect(invoiceNumber('cm1234567890abcdef')).toMatch(/^INV-[A-Z0-9]{8}$/);
    expect(invoiceNumber('leg-xyz-1234')).toBe(invoiceNumber('leg-xyz-1234'));
  });
});

describe('InvoiceService.addPayment', () => {
  function build(invoice: Record<string, unknown>) {
    const prisma: any = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return { prisma, service: new InvoiceService(prisma) };
  }

  it('marks PAID with a wallet timestamp when payments reach the fee', async () => {
    const { prisma, service } = build({ legId: 'l1', amountPaid: 700, amount: 1000 });
    await service.addPayment('l1', 300, 1000, new Date('2026-01-02T00:00:00Z'));
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountPaid: 1000, status: 'PAID', paidToWalletAt: new Date('2026-01-02T00:00:00Z') }),
      })
    );
  });

  it('marks PARTIALLY_PAID below the fee, without a paid timestamp', async () => {
    const { prisma, service } = build({ legId: 'l1', amountPaid: 0, amount: 1000 });
    await service.addPayment('l1', 700, 1000);
    const data = prisma.invoice.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ amountPaid: 700, status: 'PARTIALLY_PAID' });
    expect(data.paidToWalletAt).toBeUndefined();
  });
});
