import { Body, Controller, Headers, NotFoundException, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';

type RawRequest = { headers: Record<string, string | string[] | undefined>; rawBody?: Buffer };
import { assertWebhookAuthorized } from '../../../common/webhooks/webhook-auth';
import { WalletService } from '../../ledger/wallet.service';

class PspWebhookDto {
  @IsString()
  reference!: string;

  @IsString()
  status!: string;
}

// PSP webhooks settle money, so they authenticate with the shared
// `x-webhook-secret` header (see common/webhooks/webhook-auth) until a
// real provider's signature scheme is integrated. Events are then
// processed idempotently by event ID.
@Controller('payments/webhook')
export class PspController {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService
  ) {}

  /**
   * Real Paystack events. Paystack signs the raw body with HMAC-SHA512
   * using the secret key; anything unsigned or wrongly signed is dropped.
   * charge.success settles a top-up, transfer.* settles a withdrawal.
   */
  @Post('paystack')
  async paystackWebhook(@Req() req: RawRequest, @Body() body: any) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new NotFoundException('Paystack is not configured');
    const signature = req.headers['x-paystack-signature'];
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    const expected = createHmac('sha512', secret).update(raw).digest('hex');
    const given = Buffer.from(typeof signature === 'string' ? signature : '');
    const want = Buffer.from(expected);
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }
    const event = body?.event as string | undefined;
    const reference = body?.data?.reference as string | undefined;
    if (!event || !reference) return { received: true };
    const eventId = `psp:paystack:${event}:${reference}`;
    const seen = await this.prisma.processedEvent.findUnique({ where: { id: eventId } });
    if (seen) return { duplicate: true };
    await this.prisma.processedEvent.create({ data: { id: eventId } });
    if (event === 'charge.success') return this.wallet.settleCharge(reference);
    if (event === 'transfer.success') return this.wallet.settleTransfer(reference, true);
    if (event === 'transfer.failed' || event === 'transfer.reversed') return this.wallet.settleTransfer(reference, false);
    return { received: true };
  }

  @Post(':provider')
  async webhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() dto: PspWebhookDto
  ) {
    assertWebhookAuthorized(headers, 'PSP_WEBHOOK_SECRET');
    if (provider !== 'mock') throw new NotFoundException('Unknown provider');
    const eventId = `psp:${provider}:${dto.reference}`;
    const seen = await this.prisma.processedEvent.findUnique({ where: { id: eventId } });
    if (seen) return { duplicate: true, reference: dto.reference };
    await this.prisma.processedEvent.create({ data: { id: eventId } });
    if (dto.status !== 'success') return { duplicate: false, settled: false };
    return this.wallet.settleTopup(dto.reference);
  }
}
