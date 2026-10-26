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
import { CustodyService } from './custody.service';

function room(shipmentId: string) {
  return `shipment:${shipmentId}`;
}

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway {
  @WebSocketServer()
  server?: Server;

  constructor(
    private auth: AuthService,
    private custody: CustodyService
  ) {}

  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { shipmentId: string; token: string }
  ) {
    let userId: string;
    try {
      const payload = this.auth.verify(body.token);
      if (payload.type !== 'access') throw new Error('not an access token');
      userId = payload.sub;
    } catch {
      throw new WsException('Invalid token');
    }
    await this.custody.track(body.shipmentId, userId);
    await client.join(room(body.shipmentId));
    return { joined: body.shipmentId };
  }

  broadcastLocation(shipmentId: string, ping: unknown) {
    this.server?.to(room(shipmentId)).emit('location', ping);
  }

  broadcastStatus(shipmentId: string, status: string) {
    this.server?.to(room(shipmentId)).emit('status', { shipmentId, status });
  }
}
