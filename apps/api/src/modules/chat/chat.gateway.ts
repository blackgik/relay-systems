import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../identity/auth.service';
import { ChatService } from './chat.service';

function room(conversationId: string) {
  return `conversation:${conversationId}`;
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server?: Server;

  constructor(
    private auth: AuthService,
    private chat: ChatService
  ) {}

  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; token: string }
  ) {
    let userId: string;
    try {
      const payload = this.auth.verify(body.token);
      if (payload.type !== 'access') throw new Error('not an access token');
      userId = payload.sub;
    } catch {
      throw new WsException('Invalid token');
    }
    await this.chat.requireMember(body.conversationId, userId);
    client.data.userId = userId;
    client.data.conversationId = body.conversationId;
    await client.join(room(body.conversationId));
    return { joined: body.conversationId };
  }

  @SubscribeMessage('send')
  async onSend(@ConnectedSocket() client: Socket, @MessageBody() body: { body: string }) {
    const userId: string | undefined = client.data.userId;
    const conversationId: string | undefined = client.data.conversationId;
    if (!userId || !conversationId) throw new WsException('Join a conversation first');
    const message = await this.chat.send(conversationId, userId, { body: body.body });
    this.broadcast(conversationId, message);
    return message;
  }

  broadcast(conversationId: string, message: unknown) {
    this.server?.to(room(conversationId)).emit('message', message);
  }
}
