import { Body, Controller, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { EscrowService } from './escrow.service';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

class FundDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

@Controller('shipments')
@UseGuards(JwtGuard)
export class EscrowController {
  constructor(private escrow: EscrowService) {}

  @Post(':id/fund')
  fund(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: FundDto,
    @Headers('idempotency-key') headerKey?: string,
    @Query('quote') quote?: string
  ) {
    if (quote === 'true') {
      return this.quote(id, user.id);
    }
    return this.escrow.fund(id, user.id, dto.idempotencyKey ?? headerKey);
  }

  @Post(':id/refund')
  refund(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.escrow.refundShipment(id, user.id);
  }

  private async quote(shipmentId: string, senderId: string) {
    return this.escrow.quoteFor(shipmentId, senderId);
  }
}
