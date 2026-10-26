import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KycCheckStatus, KycCheckType, KycProvider } from './kyc-provider.interface';
import { tierForCheck } from './kyc-tiers';

export const KYC_PROVIDER = 'KYC_PROVIDER';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    @Inject(KYC_PROVIDER) private provider: KycProvider
  ) {}

  async start(userId: string, type: KycCheckType) {
    const created = await this.prisma.kycVerification.create({
      data: { userId, provider: this.provider.name, type, status: 'PENDING', reference: 'pending', payload: {} },
    });
    const result = await this.provider.startVerification({ userId, type });
    const verification = await this.prisma.kycVerification.update({
      where: { id: created.id },
      data: {
        status: result.status,
        reference: result.reference,
        payload: result.payload as Prisma.InputJsonValue,
      },
    });
    if (result.status === 'VERIFIED') {
      await this.applyTier(userId, type);
    }
    return verification;
  }

  // Provider callback. Real providers must verify a webhook signature here.
  async webhook(reference: string, status: KycCheckStatus) {
    const verification = await this.prisma.kycVerification.findFirst({ where: { reference } });
    if (!verification) throw new NotFoundException('Verification not found');
    const updated = await this.prisma.kycVerification.update({
      where: { id: verification.id },
      data: { status },
    });
    if (status === 'VERIFIED') {
      await this.applyTier(verification.userId, verification.type as KycCheckType);
    }
    return updated;
  }

  private async applyTier(userId: string, type: KycCheckType) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const next = tierForCheck(type, user.kycTier);
    if (next !== user.kycTier) {
      await this.prisma.user.update({ where: { id: userId }, data: { kycTier: next } });
    }
  }
}
