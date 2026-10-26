import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';

function buildService() {
  const prisma: any = {
    user: { create: jest.fn(), findUnique: jest.fn() },
  };
  return { prisma, service: new AuthService(prisma) };
}

describe('AuthService', () => {
  it('register hashes the password and returns tokens', async () => {
    const { prisma, service } = buildService();
    prisma.user.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'u1', kycTier: 'T0', ...data })
    );

    const result = await service.register({
      email: 'ada@example.com',
      phone: '+2348000000001',
      fullName: 'Ada',
      password: 'supersecret',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'ada@example.com' }),
      })
    );
    const stored = prisma.user.create.mock.calls[0][0].data;
    expect(stored.passwordHash).not.toBe('supersecret');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    const payload = service.verify(result.accessToken);
    expect(payload).toMatchObject({ sub: 'u1', type: 'access' });
  });

  it('register maps duplicate email/phone to conflict', async () => {
    const { prisma, service } = buildService();
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    );
    await expect(
      service.register({
        email: 'ada@example.com',
        phone: '+2348000000001',
        fullName: 'Ada',
        password: 'supersecret',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('login succeeds with correct credentials and fails otherwise', async () => {
    const { prisma, service } = buildService();
    const { hash } = await import('bcryptjs').then((m) => ({ hash: m.hash }));
    const passwordHash = await hash('correct-horse', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ada@example.com',
      passwordHash,
    });

    const ok = await service.login({ email: 'ada@example.com', password: 'correct-horse' });
    expect(ok.accessToken).toBeTruthy();

    await expect(
      service.login({ email: 'ada@example.com', password: 'wrong' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refresh rotates tokens for a valid refresh token', async () => {
    const { prisma, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'ada@example.com' });
    const { refreshToken, accessToken } = service.tokens({ id: 'u1', email: 'ada@example.com' });

    const rotated = await service.refresh(refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).toBeTruthy();

    await expect(service.refresh(accessToken)).rejects.toThrow(UnauthorizedException);
    await expect(service.refresh('bogus')).rejects.toThrow(UnauthorizedException);
  });
});
