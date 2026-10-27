import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { OtpService } from './otp.service';
import { GoogleProfile } from './google-oauth.service';
import { generateHandle } from '../people/handle';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

function secret() {
  return process.env.JWT_SECRET ?? 'relay-dev-secret';
}

export type SafeUser = Omit<User, 'passwordHash' | 'googleId'>;

export function sanitize(user: User): SafeUser {
  const { passwordHash: _passwordHash, googleId: _googleId, ...safe } = user;
  return safe;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private otp: OtpService) {}

  private sign(userId: string, email: string, type: 'access' | 'refresh') {
    return jwt.sign({ sub: userId, email, type }, secret(), {
      expiresIn: type === 'access' ? ACCESS_TTL : REFRESH_TTL,
    });
  }

  tokens(user: { id: string; email: string }) {
    return {
      accessToken: this.sign(user.id, user.email, 'access'),
      refreshToken: this.sign(user.id, user.email, 'refresh'),
    };
  }

  verify(token: string): { sub: string; email: string; type: string } {
    return jwt.verify(token, secret()) as { sub: string; email: string; type: string };
  }

  private async session(user: User) {
    return { user: await this.me(user.id), ...this.tokens(user) };
  }

  // Creates the account but issues no tokens: the email must be confirmed
  // with the OTP first.
  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data = {
      email: normalizeEmail(dto.email),
      phone: dto.phone.trim(),
      fullName: dto.fullName.trim(),
      passwordHash,
    };
    let user: User;
    const handle = generateHandle();
    try {
      // An unverified account can't hold an email hostage: only the inbox
      // owner can ever verify, so a fresh sign-up replaces the pending one.
      const pending = await this.prisma.user.findUnique({ where: { email: data.email } });
      user =
        pending && !pending.emailVerifiedAt
          ? await this.prisma.user.update({ where: { id: pending.id }, data })
          : await this.prisma.user.create({ data: { ...data, handle } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email or phone already registered');
      }
      throw e;
    }
    const otp = await this.otp.issue(user, 'VERIFY_EMAIL');
    return { verificationRequired: true, email: user.email, ...otp };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerifiedAt) {
      // Send a fresh code so the verify screen is ready; a cooldown is fine.
      await this.otp.issue(user, 'VERIFY_EMAIL').catch((e) => {
        if (!(e instanceof HttpException)) throw e;
      });
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email to continue. We sent you a code.',
        email: user.email,
      });
    }
    return this.session(user);
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user) throw new UnauthorizedException('Invalid code');
    if (!user.emailVerifiedAt) {
      await this.otp.consume(user.id, 'VERIFY_EMAIL', code);
      await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    return this.session(user);
  }

  // Generic responses for resend/forgot so they do not reveal which emails exist.
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (user && !user.emailVerifiedAt) return this.otp.issue(user, 'VERIFY_EMAIL');
    return { resendInSeconds: 60 };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (user) return this.otp.issue(user, 'RESET_PASSWORD');
    return { resendInSeconds: 60 };
  }

  async resetPassword(email: string, code: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user) throw new UnauthorizedException('Invalid code');
    await this.otp.consume(user.id, 'RESET_PASSWORD', code);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      // Owning the inbox proves the email, so this also verifies it.
      data: { passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });
    return this.session(updated);
  }

  async googleLogin(profile: GoogleProfile): Promise<User> {
    if (!profile.emailVerified) throw new UnauthorizedException('Your Google email is not verified');
    const byGoogle = await this.prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (byGoogle) return byGoogle;
    const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
      });
    }
    // Unusable random password; "Forgot password" can set a real one later.
    return this.prisma.user.create({
      data: {
        email: profile.email,
        fullName: profile.name,
        googleId: profile.sub,
        handle: generateHandle(),
        emailVerifiedAt: new Date(),
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
      },
    });
  }

  async sessionFor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.session(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type: string };
    try {
      payload = this.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.sessionFor(payload.sub);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycProfile: { select: { status: true, step: true } },
        bankAccount: { select: { bvnMatchStatus: true } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { kycProfile, bankAccount, ...rest } = user;
    return {
      ...sanitize(rest),
      onboarding: {
        status: kycProfile?.status ?? 'NOT_STARTED',
        step: kycProfile?.step ?? 'PERSONAL',
        bvnMatch: bankAccount?.bvnMatchStatus ?? null,
      },
    };
  }
}
