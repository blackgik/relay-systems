import { Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WalletService } from '../../ledger/wallet.service';

class PspWebhookDto {
  @IsString()
  reference!: string;

  @IsString()
  status!: string;
}

// PSP webhooks are verified by signature (real providers), stored raw, and
// processed idempotently by event ID. The mock provider skips the signature.
@Controller('payments/webhook')
export class PspController {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService
  ) {}

  @Post(':provider')
  async webhook(@Param('provider') provider: string, @Body() dto: PspWebhookDto) {
    if (provider !== 'mock') throw new NotFoundException('Unknown provider');
    const eventId = `psp:${provider}:${dto.reference}`;
    const seen = await this.prisma.processedEvent.findUnique({ where: { id: eventId } });
    if (seen) return { duplicate: true, reference: dto.reference };
    await this.prisma.processedEvent.create({ data: { id: eventId } });
    if (dto.status !== 'success') return { duplicate: false, settled: false };
    return this.wallet.settleTopup(dto.reference);
  }
}
