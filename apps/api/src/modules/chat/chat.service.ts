import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { maskContactDetails } from './mask';
import { SendMessageDto } from './chat.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateByLeg(legId: string, userId: string) {
    const leg = await this.prisma.leg.findUnique({
      where: { id: legId },
      include: {
        trip: { select: { carrierId: true } },
        shipment: { select: { senderId: true } },
      },
    });
    if (!leg) throw new NotFoundException('Leg not found');
    if (leg.trip.carrierId !== userId && leg.shipment.senderId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }
    const existing = await this.prisma.conversation.findFirst({ where: { legId } });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: {
        legId,
        shipmentId: leg.shipmentId,
        members: [leg.shipment.senderId, leg.trip.carrierId],
      },
    });
  }

  async requireMember(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!conversation.members.includes(userId)) {
      throw new ForbiddenException('Not your conversation');
    }
    return conversation;
  }

  async listMessages(conversationId: string, userId: string) {
    await this.requireMember(conversationId, userId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async send(conversationId: string, userId: string, dto: SendMessageDto) {
    await this.requireMember(conversationId, userId);
    return this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: maskContactDetails(dto.body),
        attachments: dto.attachments ?? [],
      },
    });
  }
}
