import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { KycController } from './kyc.controller';
import { KycService, KYC_PROVIDER } from './kyc.service';
import { MockKycProvider } from './mock-kyc.provider';

@Module({
  imports: [IdentityModule],
  controllers: [KycController],
  providers: [KycService, { provide: KYC_PROVIDER, useClass: MockKycProvider }],
  exports: [KycService],
})
export class KycModule {}
