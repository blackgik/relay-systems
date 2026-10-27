import { BadRequestException, HttpException } from '@nestjs/common';
import { OTP_MAX_ATTEMPTS, OtpService } from './otp.service';

function build() {
  const rows: any[] = [];
  const prisma: any = {
    emailOtp: {
      findMany: jest.fn(async () => [...rows].reverse()),
      findFirst: jest.fn(async () => [...rows].reverse().find((r) => !r.consumedAt) ?? null),
      updateMany: jest.fn(async () => rows.forEach((r) => (r.consumedAt ??= new Date()))),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `o${rows.length}`, attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
        rows.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
    },
  };
  const sent: string[] = [];
  const mailer: any = {
    send: jest.fn(async (msg: any) => {
      sent.push(msg.subject.slice(0, 6));
      return true;
    }),
  };
  return { rows, sent, service: new OtpService(prisma, mailer) };
}

const user = { id: 'u1', email: 'ada@example.com', fullName: 'Ada' };

describe('OtpService', () => {
  it('emails a 6-digit code and stores only its hash', async () => {
    const { rows, sent, service } = build();
    await service.issue(user, 'VERIFY_EMAIL');
    expect(sent[0]).toMatch(/^\d{6}$/);
    expect(rows[0].codeHash).not.toContain(sent[0]);
  });

  it('accepts the right code once', async () => {
    const { sent, service } = build();
    await service.issue(user, 'VERIFY_EMAIL');
    await expect(service.consume('u1', 'VERIFY_EMAIL', sent[0])).resolves.toBeUndefined();
    await expect(service.consume('u1', 'VERIFY_EMAIL', sent[0])).rejects.toThrow(BadRequestException);
  });

  it('locks after too many wrong guesses, even for the right code', async () => {
    const { sent, service } = build();
    await service.issue(user, 'VERIFY_EMAIL');
    const wrong = sent[0] === '000000' ? '111111' : '000000';
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      await expect(service.consume('u1', 'VERIFY_EMAIL', wrong)).rejects.toThrow(BadRequestException);
    }
    await expect(service.consume('u1', 'VERIFY_EMAIL', sent[0])).rejects.toThrow(/Too many/);
  });

  it('rejects expired codes', async () => {
    const { rows, sent, service } = build();
    await service.issue(user, 'VERIFY_EMAIL');
    rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.consume('u1', 'VERIFY_EMAIL', sent[0])).rejects.toThrow(/expired/);
  });

  it('enforces the resend cooldown', async () => {
    const { service } = build();
    await service.issue(user, 'VERIFY_EMAIL');
    await expect(service.issue(user, 'VERIFY_EMAIL')).rejects.toThrow(HttpException);
  });
});
