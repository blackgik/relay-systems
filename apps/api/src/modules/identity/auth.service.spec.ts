import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';

function buildService() {
  const prisma: any = {
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const otp: any = {
    issue: jest.fn().mockResolvedValue({ resendInSeconds: 60, expiresInMinutes: 10 }),
    consume: jest.fn().mockResolvedValue(undefined),
  };
  return { prisma, otp, service: new AuthService(prisma, otp) };
}

const verifiedUser = (extra: object = {}) => ({
  id: 'u1',
  email: 'ada@example.com',
  emailVerifiedAt: new Date(),
  kycProfile: null,
  bankAccount: null,
  ...extra,
});

describe('AuthService', () => {
  it('register hashes the password, sends an OTP and withholds tokens', async () => {
    const { prisma, otp, service } = buildService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'u1', ...data }));

    const result = await service.register({
      email: 'Ada@Example.com',
      phone: '+2348000000001',
      fullName: 'Ada',
      password: 'supersecret1',
    });

    const stored = prisma.user.create.mock.calls[0][0].data;
    expect(stored.email).toBe('ada@example.com');
    expect(stored.passwordHash).not.toBe('supersecret1');
    expect(otp.issue).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), 'VERIFY_EMAIL');
    expect(result).toMatchObject({ verificationRequired: true, email: 'ada@example.com' });
    expect(result).not.toHaveProperty('accessToken');
  });

  it('register replaces a pending unverified account instead of blocking the email', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u0', emailVerifiedAt: null });
    prisma.user.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'u0', ...data }));

    await service.register({ email: 'ada@example.com', phone: '+2348000000001', fullName: 'Ada', password: 'supersecret1' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u0' } }));
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('register maps duplicate email/phone to conflict', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    );
    await expect(
      service.register({ email: 'ada@example.com', phone: '+2348000000001', fullName: 'Ada', password: 'supersecret1' })
    ).rejects.toThrow(ConflictException);
  });

  it('login succeeds with correct credentials and fails otherwise', async () => {
    const { prisma, service } = buildService();
    const { hash } = await import('bcryptjs');
    const passwordHash = await hash('correct-horse1', 4);
    prisma.user.findUnique.mockResolvedValue(verifiedUser({ passwordHash }));

    const ok = await service.login({ email: 'ada@example.com', password: 'correct-horse1' });
    expect(ok.accessToken).toBeTruthy();
    expect(ok.user.onboarding.status).toBe('NOT_STARTED');

    await expect(service.login({ email: 'ada@example.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('login blocks unverified emails and re-sends the code', async () => {
    const { prisma, otp, service } = buildService();
    const { hash } = await import('bcryptjs');
    prisma.user.findUnique.mockResolvedValue(verifiedUser({ emailVerifiedAt: null, passwordHash: await hash('pw-123456', 4) }));

    await expect(service.login({ email: 'ada@example.com', password: 'pw-123456' })).rejects.toThrow(ForbiddenException);
    expect(otp.issue).toHaveBeenCalledWith(expect.anything(), 'VERIFY_EMAIL');
  });

  it('verifyEmail consumes the OTP, marks the email verified and issues tokens', async () => {
    const { prisma, otp, service } = buildService();
    prisma.user.findUnique.mockResolvedValue(verifiedUser({ emailVerifiedAt: null }));

    const session = await service.verifyEmail('ada@example.com', '123456');
    expect(otp.consume).toHaveBeenCalledWith('u1', 'VERIFY_EMAIL', '123456');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerifiedAt: expect.any(Date) } })
    );
    expect(session.accessToken).toBeTruthy();
  });

  it('refresh rotates tokens for a valid refresh token', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue(verifiedUser());
    const { refreshToken, accessToken } = service.tokens({ id: 'u1', email: 'ada@example.com' });

    const rotated = await service.refresh(refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).toBeTruthy();

    await expect(service.refresh(accessToken)).rejects.toThrow(UnauthorizedException);
    await expect(service.refresh('bogus')).rejects.toThrow(UnauthorizedException);
  });
});
