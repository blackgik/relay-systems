import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomInt, timingSafeEqual, createHmac } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailerService } from '../integrations/email/mailer.service';
import { resetPasswordTemplate, verifyEmailTemplate } from '../integrations/email/templates';

export type OtpPurpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;

function hashCode(code: string) {
  return createHmac('sha256', process.env.JWT_SECRET ?? 'relay-dev-secret').update(code).digest('hex');
}

@Injectable()
export class OtpService {
  private log = new Logger('Otp');

  constructor(private prisma: PrismaService, private mailer: MailerService) {}

  async issue(user: { id: string; email: string; fullName: string }, purpose: OtpPurpose) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.emailOtp.findMany({
      where: { userId: user.id, purpose, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent[0] && Date.now() - recent[0].createdAt.getTime() < OTP_RESEND_SECONDS * 1000) {
      const wait = Math.ceil((OTP_RESEND_SECONDS * 1000 - (Date.now() - recent[0].createdAt.getTime())) / 1000);
      throw new HttpException(`Please wait ${wait}s before requesting another code`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent.length >= OTP_MAX_PER_HOUR) {
      throw new HttpException('Too many codes requested. Try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    // Only one live code per purpose: older ones stop working.
    await this.prisma.emailOtp.updateMany({
      where: { userId: user.id, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.emailOtp.create({
      data: {
        userId: user.id,
        purpose,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    const tpl =
      purpose === 'VERIFY_EMAIL'
        ? verifyEmailTemplate(user.fullName, code, OTP_TTL_MINUTES)
        : resetPasswordTemplate(user.fullName, code, OTP_TTL_MINUTES);
    const sent = await this.mailer.send({ to: { email: user.email, name: user.fullName }, ...tpl });
    if (!sent && process.env.NODE_ENV !== 'production') {
      this.log.warn(`[dev] ${purpose} code for ${user.email}: ${code}`);
    }
    return { resendInSeconds: OTP_RESEND_SECONDS, expiresInMinutes: OTP_TTL_MINUTES };
  }

  async consume(userId: string, purpose: OtpPurpose, code: string) {
    const otp = await this.prisma.emailOtp.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Code expired. Request a new one.');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many wrong attempts. Request a new code.');
    }
    const a = Buffer.from(hashCode(code));
    const b = Buffer.from(otp.codeHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const attempts = otp.attempts + 1;
      await this.prisma.emailOtp.update({ where: { id: otp.id }, data: { attempts } });
      const left = OTP_MAX_ATTEMPTS - attempts;
      throw new BadRequestException(
        left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Request a new code.'
      );
    }
    await this.prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  }
}
