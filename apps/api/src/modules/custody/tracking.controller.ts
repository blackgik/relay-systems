import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CustodyService } from './custody.service';
import { TrackingGateway } from './tracking.gateway';
import { PingDto } from './custody.dto';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller('tracking')
@UseGuards(JwtGuard)
export class TrackingController {
  constructor(
    private custody: CustodyService,
    private gateway: TrackingGateway
  ) {}

  @Get(':shipmentId')
  track(@CurrentUser() user: { id: string }, @Param('shipmentId') shipmentId: string) {
    return this.custody.track(shipmentId, user.id);
  }

  @Post('ping')
  async ping(@CurrentUser() user: { id: string }, @Body() dto: PingDto) {
    const created = await this.custody.ping(dto.shipmentId, user.id, dto.lat, dto.lng);
    this.gateway.broadcastLocation(dto.shipmentId, created);
    return created;
  }
}
