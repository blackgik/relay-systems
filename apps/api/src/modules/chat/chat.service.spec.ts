import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

function buildService() {
  const prisma: any = {
    leg: { findUnique: jest.fn() },
    conversation: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    message: { findMany: jest.fn(), create: jest.fn() },
  };
  return { prisma, service: new ChatService(prisma) };
}

const LEG = {
  id: 'leg1',
  shipmentId: 'sh1',
  trip: { carrierId: 'carrier1' },
  shipment: { senderId: 'sender1' },
};

describe('ChatService', () => {
  it('creates a conversation between sender and carrier on first use', async () => {
    const { prisma, service } = buildService();
    prisma.leg.findUnique.mockResolvedValue(LEG);
    prisma.conversation.findFirst.mockResolvedValue(null);
    prisma.conversation.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'c1', ...data })
    );

    const convo = await service.getOrCreateByLeg('leg1', 'sender1');

    expect(prisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          legId: 'leg1',
          shipmentId: 'sh1',
          members: ['sender1', 'carrier1'],
        }),
      })
    );
    expect(convo.id).toBe('c1');
  });

  it('rejects outsiders from conversations', async () => {
    const { prisma, service } = buildService();
    prisma.leg.findUnique.mockResolvedValue(LEG);
    await expect(service.getOrCreateByLeg('leg1', 'stranger')).rejects.toThrow(
      ForbiddenException
    );
    prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', members: ['sender1'] });
    await expect(service.listMessages('c1', 'stranger')).rejects.toThrow(ForbiddenException);
    prisma.conversation.findUnique.mockResolvedValue(null);
    await expect(service.listMessages('c1', 'sender1')).rejects.toThrow(NotFoundException);
  });

  it('masks contact details on send', async () => {
    const { prisma, service } = buildService();
    prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', members: ['sender1'] });
    prisma.message.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'm1', ...data })
    );

    const message = await service.send('c1', 'sender1', {
      body: 'call +234 800 111 2222 or ada@example.com',
    });

    expect(message.body).toBe('call [hidden] or [hidden]');
  });
});
