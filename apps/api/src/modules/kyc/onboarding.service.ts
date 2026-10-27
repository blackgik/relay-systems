import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { KycProfile, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { decrypt, encrypt, fingerprint, last4 } from '../../common/crypto/pii';
import { PaystackClient } from '../integrations/paystack/paystack.client';
import { MailerService } from '../integrations/email/mailer.service';
import { kycDecisionTemplate } from '../integrations/email/templates';
import { BankDto, DocumentsDto, IdentityDto, PersonalDto } from './onboarding.dto';
import { namesMatch } from './name-match';
import { tierForCheck } from './kyc-tiers';

export const STEPS = ['PERSONAL', 'IDENTITY', 'DOCUMENTS', 'BANK', 'REVIEW'] as const;
type Step = (typeof STEPS)[number];

const EDITABLE = ['IN_PROGRESS', 'REJECTED'];

function isUniqueViolation(e: unknown, field: string) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === 'P2002' &&
    String((e.meta as { target?: unknown })?.target ?? '').includes(field)
  );
}

// Onboarding KYC, in order: personal details -> NIN + BVN -> ID document and
// selfie -> payout bank account -> submit. Each step must be done before the
// next can be saved, and nothing is editable once submitted.
@Injectable()
export class OnboardingService {
  private log = new Logger('Onboarding');

  constructor(
    private prisma: PrismaService,
    private paystack: PaystackClient,
    private mailer: MailerService
  ) {}

  private async profileFor(userId: string) {
    return (
      (await this.prisma.kycProfile.findUnique({ where: { userId } })) ??
      this.prisma.kycProfile.create({ data: { userId } })
    );
  }

  private assertCanEdit(profile: KycProfile, step: Step) {
    if (!EDITABLE.includes(profile.status)) {
      throw new BadRequestException('Your verification has been submitted and can no longer be edited');
    }
    if (STEPS.indexOf(step) > STEPS.indexOf(profile.step as Step)) {
      throw new BadRequestException('Complete the previous steps first');
    }
  }

  private nextStep(profile: KycProfile, step: Step): Step {
    const next = STEPS[STEPS.indexOf(step) + 1];
    // Re-saving an earlier step must not move the user backwards.
    return STEPS.indexOf(next) > STEPS.indexOf(profile.step as Step) ? next : (profile.step as Step);
  }

  async status(userId: string) {
    const profile = await this.profileFor(userId);
    const bank = await this.prisma.bankAccount.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true, kycTier: true } });
    return {
      status: profile.status,
      step: profile.step,
      kycTier: user?.kycTier,
      reviewNote: profile.reviewNote,
      needsPhone: !user?.phone,
      personal: profile.firstName
        ? {
            firstName: profile.firstName,
            middleName: profile.middleName,
            lastName: profile.lastName,
            dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10),
            gender: profile.gender,
            address: profile.address,
            city: profile.city,
            state: profile.state,
          }
        : null,
      identity: profile.ninLast4 ? { ninLast4: profile.ninLast4, bvnLast4: profile.bvnLast4 } : null,
      documents: profile.idType
        ? { idType: profile.idType, idNumberLast4: profile.idNumberLast4, hasIdDocument: !!profile.idDocument, hasSelfie: !!profile.selfie }
        : null,
      bank: bank
        ? {
            bankName: bank.bankName,
            accountLast4: bank.accountLast4,
            accountName: bank.accountName,
            nameMatches: bank.nameMatches,
            bvnMatch: bank.bvnMatchStatus,
          }
        : null,
    };
  }

  async savePersonal(userId: string, dto: PersonalDto) {
    const profile = await this.profileFor(userId);
    this.assertCanEdit(profile, 'PERSONAL');

    const dob = new Date(dto.dateOfBirth);
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 18) throw new BadRequestException('You must be at least 18 to use Relay');
    if (age > 120) throw new BadRequestException('Enter a valid date of birth');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phone && !dto.phone) throw new BadRequestException('Phone number is required');
    if (dto.phone && !user?.phone) {
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { phone: dto.phone.trim() } });
      } catch (e) {
        if (isUniqueViolation(e, 'phone')) throw new ConflictException('That phone number is already in use');
        throw e;
      }
    }

    await this.prisma.kycProfile.update({
      where: { id: profile.id },
      data: {
        firstName: dto.firstName.trim(),
        middleName: dto.middleName?.trim() || null,
        lastName: dto.lastName.trim(),
        dateOfBirth: dob,
        gender: dto.gender,
        address: dto.address.trim(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        step: this.nextStep(profile, 'PERSONAL'),
      },
    });
    return this.status(userId);
  }

  async saveIdentity(userId: string, dto: IdentityDto) {
    const profile = await this.profileFor(userId);
    this.assertCanEdit(profile, 'IDENTITY');
    if (dto.nin === dto.bvn) throw new BadRequestException('NIN and BVN cannot be the same number');
    // A different BVN invalidates the BVN-owns-this-account check, so the
    // payout account has to be verified again.
    const bvnChanged = !!profile.bvnFingerprint && profile.bvnFingerprint !== fingerprint('BVN', dto.bvn);
    if (bvnChanged) await this.prisma.bankAccount.deleteMany({ where: { userId } });
    try {
      await this.prisma.kycProfile.update({
        where: { id: profile.id },
        data: {
          ninEnc: encrypt(dto.nin),
          ninLast4: last4(dto.nin),
          ninFingerprint: fingerprint('NIN', dto.nin),
          bvnEnc: encrypt(dto.bvn),
          bvnLast4: last4(dto.bvn),
          bvnFingerprint: fingerprint('BVN', dto.bvn),
          step: bvnChanged && profile.step === 'REVIEW' ? 'BANK' : this.nextStep(profile, 'IDENTITY'),
        },
      });
    } catch (e) {
      // Deliberately vague: confirming whose NIN/BVN it is would leak data.
      if (isUniqueViolation(e, 'ninFingerprint') || isUniqueViolation(e, 'bvnFingerprint')) {
        throw new ConflictException('These details are already linked to another Relay account. Contact support if this is you.');
      }
      throw e;
    }
    return this.status(userId);
  }

  async saveDocuments(userId: string, dto: DocumentsDto) {
    const profile = await this.profileFor(userId);
    this.assertCanEdit(profile, 'DOCUMENTS');
    await this.prisma.kycProfile.update({
      where: { id: profile.id },
      data: {
        idType: dto.idType,
        idNumberEnc: encrypt(dto.idNumber.toUpperCase()),
        idNumberLast4: last4(dto.idNumber.toUpperCase()),
        idDocument: dto.idDocument,
        selfie: dto.selfie,
        step: this.nextStep(profile, 'DOCUMENTS'),
      },
    });
    return this.status(userId);
  }

  banks() {
    return this.paystack.listBanks();
  }

  // Preview for the UI: who does this account belong to, and is it you?
  async resolveBank(userId: string, dto: BankDto) {
    const profile = await this.profileFor(userId);
    if (!profile.firstName || !profile.lastName) throw new BadRequestException('Complete your personal details first');
    const resolved = await this.paystack.resolveAccount(dto.accountNumber, dto.bankCode).catch(() => {
      throw new UnprocessableEntityException('We could not find that account. Check the number and bank.');
    });
    return {
      accountName: resolved.account_name,
      nameMatches: namesMatch(
        { firstName: profile.firstName, middleName: profile.middleName, lastName: profile.lastName },
        resolved.account_name
      ),
    };
  }

  async saveBank(userId: string, dto: BankDto) {
    const profile = await this.profileFor(userId);
    this.assertCanEdit(profile, 'BANK');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const bank = (await this.paystack.listBanks()).find((b) => b.code === dto.bankCode);
    if (!bank) throw new BadRequestException('Select a valid bank');
    const { accountName, nameMatches } = await this.resolveBank(userId, dto);
    if (!nameMatches) {
      throw new UnprocessableEntityException(
        `This account is registered to ${accountName}, which does not match your legal name. Payouts can only go to an account in your own name.`
      );
    }

    const data = {
      bankCode: bank.code,
      bankName: bank.name,
      accountNumberEnc: encrypt(dto.accountNumber),
      accountLast4: last4(dto.accountNumber),
      accountFingerprint: fingerprint('NUBAN', `${bank.code}:${dto.accountNumber}`),
      accountName,
      nameMatches,
      paystackCustomerCode: null as string | null,
      bvnMatchStatus: 'PENDING',
    };
    try {
      await this.prisma.bankAccount.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    } catch (e) {
      if (isUniqueViolation(e, 'accountFingerprint')) {
        throw new ConflictException('This bank account is already linked to another Relay account');
      }
      throw e;
    }

    // Ask Paystack whether the BVN on file owns this account. Asynchronous:
    // the result is collected by bankStatus().
    let bvnMatchStatus = 'PENDING';
    let customerCode: string | null = null;
    try {
      customerCode = (
        await this.paystack.createCustomer({
          email: user.email,
          firstName: profile.firstName!,
          lastName: profile.lastName!,
          phone: user.phone,
        })
      ).customer_code;
      await this.paystack.validateCustomer(customerCode, {
        bvn: decrypt(profile.bvnEnc!),
        bankCode: bank.code,
        accountNumber: dto.accountNumber,
        firstName: profile.firstName!,
        lastName: profile.lastName!,
        middleName: profile.middleName,
      });
    } catch (e) {
      this.log.warn(`BVN validation unavailable for ${userId}: ${(e as Error).message}`);
      bvnMatchStatus = 'UNAVAILABLE';
    }
    await this.prisma.bankAccount.update({
      where: { userId },
      data: { paystackCustomerCode: customerCode, bvnMatchStatus },
    });
    await this.prisma.kycProfile.update({ where: { id: profile.id }, data: { step: this.nextStep(profile, 'BANK') } });
    return this.status(userId);
  }

  async refreshBvnMatch(userId: string) {
    const bank = await this.prisma.bankAccount.findUnique({ where: { userId } });
    if (!bank) throw new NotFoundException('No bank account on file');
    if (bank.bvnMatchStatus === 'PENDING' && bank.paystackCustomerCode) {
      const customer = await this.paystack.fetchCustomer(bank.paystackCustomerCode).catch(() => null);
      const failed = customer?.identifications?.some((i) => i.status === 'failed');
      const next = customer?.identified ? 'VERIFIED' : failed ? 'FAILED' : 'PENDING';
      if (next !== bank.bvnMatchStatus) {
        await this.prisma.bankAccount.update({ where: { userId }, data: { bvnMatchStatus: next } });
        await this.maybeAutoVerify(userId);
      }
    }
    return this.status(userId);
  }

  async submit(userId: string) {
    const profile = await this.profileFor(userId);
    if (!EDITABLE.includes(profile.status)) return this.status(userId);
    if (profile.step !== 'REVIEW') throw new BadRequestException('Complete every step before submitting');
    const bank = await this.prisma.bankAccount.findUniqueOrThrow({ where: { userId } });

    await this.prisma.$transaction([
      this.prisma.kycProfile.update({
        where: { id: profile.id },
        data: { status: 'SUBMITTED', submittedAt: new Date(), reviewNote: null },
      }),
      // Audit trail alongside the existing per-check records.
      this.prisma.kycVerification.createMany({
        data: [
          { userId, provider: 'onboarding', type: 'NIN', status: 'PENDING', reference: `nin_${profile.ninLast4}`, payload: {} },
          {
            userId,
            provider: 'paystack',
            type: 'BVN',
            status: bank.bvnMatchStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
            reference: bank.paystackCustomerCode ?? 'unavailable',
            payload: { method: 'customer_validation', bankAccountLast4: bank.accountLast4 },
          },
        ],
      }),
    ]);
    await this.maybeAutoVerify(userId);
    return this.status(userId);
  }

  // Automatic approval needs hard evidence: Paystack confirmed the BVN owns a
  // bank account whose name matches the legal name. Anything else waits for
  // a human reviewer.
  private async maybeAutoVerify(userId: string) {
    const profile = await this.prisma.kycProfile.findUnique({ where: { userId } });
    const bank = await this.prisma.bankAccount.findUnique({ where: { userId } });
    if (profile?.status !== 'SUBMITTED' || bank?.bvnMatchStatus !== 'VERIFIED' || !bank.nameMatches) return;
    await this.approve(userId, 'Auto-verified: BVN matched bank account via Paystack');
  }

  private async approve(userId: string, note: string | null) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.$transaction([
      this.prisma.kycProfile.update({ where: { userId }, data: { status: 'VERIFIED', reviewNote: note } }),
      this.prisma.user.update({ where: { id: userId }, data: { kycTier: tierForCheck('BVN', user.kycTier) } }),
      this.prisma.kycVerification.updateMany({
        where: { userId, provider: { in: ['onboarding', 'paystack'] }, status: 'PENDING' },
        data: { status: 'VERIFIED' },
      }),
    ]);
  }

  // ── Admin review ──────────────────────────────────────────────────────
  async pending() {
    const profiles = await this.prisma.kycProfile.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { submittedAt: 'asc' },
      include: { user: { select: { email: true, phone: true, fullName: true } } },
    });
    const banks = await this.prisma.bankAccount.findMany({ where: { userId: { in: profiles.map((p) => p.userId) } } });
    return profiles.map((p) => {
      const bank = banks.find((b) => b.userId === p.userId);
      return {
        userId: p.userId,
        email: p.user.email,
        phone: p.user.phone,
        legalName: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '),
        dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10),
        address: [p.address, p.city, p.state].filter(Boolean).join(', '),
        ninLast4: p.ninLast4,
        bvnLast4: p.bvnLast4,
        idType: p.idType,
        idNumberLast4: p.idNumberLast4,
        idDocument: p.idDocument,
        selfie: p.selfie,
        bank: bank
          ? { bankName: bank.bankName, accountLast4: bank.accountLast4, accountName: bank.accountName, bvnMatch: bank.bvnMatchStatus }
          : null,
        submittedAt: p.submittedAt,
      };
    });
  }

  async review(userId: string, decision: 'APPROVE' | 'REJECT', note?: string) {
    const profile = await this.prisma.kycProfile.findUnique({ where: { userId } });
    if (!profile || profile.status !== 'SUBMITTED') throw new BadRequestException('Nothing to review for this user');
    if (decision === 'APPROVE') {
      await this.approve(userId, note ?? null);
    } else {
      // Rejected users go back to the start of the form with the reason shown.
      await this.prisma.kycProfile.update({
        where: { userId },
        data: { status: 'REJECTED', reviewNote: note ?? 'Your details could not be verified', step: 'PERSONAL' },
      });
      await this.prisma.kycVerification.updateMany({
        where: { userId, provider: { in: ['onboarding', 'paystack'] }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      void this.mailer.send({
        to: { email: user.email, name: user.fullName },
        ...kycDecisionTemplate(user.fullName, decision === 'APPROVE', note),
      });
    }
    return { userId, decision };
  }
}
