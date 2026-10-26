import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

function secret() {
  return process.env.JWT_SECRET ?? 'relay-dev-secret';
}

export type SafeUser = Omit<User, 'passwordHash'>;

export function sanitize(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

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

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          fullName: dto.fullName,
          passwordHash,
        },
      });
      return { user: sanitize(user), ...this.tokens(user) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email or phone already registered');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { user: sanitize(user), ...this.tokens(user) };
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
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    return { user: sanitize(user), ...this.tokens(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return sanitize(user);
  }
}
