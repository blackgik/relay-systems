import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './chat.dto';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller('conversations')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(
    private chat: ChatService,
    private gateway: ChatGateway
  ) {}

  @Get('by-leg/:legId')
  byLeg(@CurrentUser() user: { id: string }, @Param('legId') legId: string) {
    return this.chat.getOrCreateByLeg(legId, user.id);
  }

  @Get(':id/messages')
  messages(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.chat.listMessages(id, user.id);
  }

  @Post(':id/messages')
  async send(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SendMessageDto
  ) {
    const message = await this.chat.send(id, user.id, dto);
    this.gateway.broadcast(id, message);
    return message;
  }
}
