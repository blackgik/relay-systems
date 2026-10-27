import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PaystackModule } from '../integrations/paystack/paystack.module';
import { EmailModule } from '../integrations/email/email.module';
import { AdminGuard } from '../disputes/admin.guard';
import { KycController } from './kyc.controller';
import { KycService, KYC_PROVIDER } from './kyc.service';
import { MockKycProvider } from './mock-kyc.provider';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [IdentityModule, PaystackModule, EmailModule],
  controllers: [KycController, OnboardingController],
  providers: [KycService, OnboardingService, AdminGuard, { provide: KYC_PROVIDER, useClass: MockKycProvider }],
  exports: [KycService],
})
export class KycModule {}
