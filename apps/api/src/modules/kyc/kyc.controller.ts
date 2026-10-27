import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { KycService } from './kyc.service';
import { KycCheckStatus, KycCheckType } from './kyc-provider.interface';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { assertWebhookAuthorized } from '../../common/webhooks/webhook-auth';

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
  webhook(@Headers() headers: Record<string, string | string[] | undefined>, @Body() dto: KycWebhookDto) {
    // Shared-secret auth until the real provider's signature scheme lands.
    assertWebhookAuthorized(headers, 'KYC_WEBHOOK_SECRET');
    return this.kyc.webhook(dto.reference, dto.status);
  }
}
