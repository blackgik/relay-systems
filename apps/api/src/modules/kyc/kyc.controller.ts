import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { KycService } from './kyc.service';
import { KycCheckStatus, KycCheckType } from './kyc-provider.interface';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

class StartKycDto {
  @IsIn(['NIN', 'BVN', 'PASSPORT', 'LIVENESS'])
  type!: KycCheckType;
}

class KycWebhookDto {
  @IsString()
  reference!: string;

  @IsIn(['PENDING', 'VERIFIED', 'REJECTED'])
  status!: KycCheckStatus;
}

@Controller('kyc')
export class KycController {
  constructor(private kyc: KycService) {}

  @Post('start')
  @UseGuards(JwtGuard)
  start(@CurrentUser() user: { id: string }, @Body() dto: StartKycDto) {
    return this.kyc.start(user.id, dto.type);
  }

  @Post('webhook')
  webhook(@Body() dto: KycWebhookDto) {
    return this.kyc.webhook(dto.reference, dto.status);
  }
}
