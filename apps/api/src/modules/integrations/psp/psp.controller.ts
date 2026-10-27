import { Body, Controller, Headers, NotFoundException, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { PrismaService } from '../../../common/prisma/prisma.service';
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
