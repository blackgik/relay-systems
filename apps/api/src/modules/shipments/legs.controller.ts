import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller('legs')
@UseGuards(JwtGuard)
export class LegsController {
  constructor(private shipments: ShipmentsService) {}

  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.shipments.myLegs(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.shipments.getLeg(id, user.id);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.shipments.acceptLeg(id, user.id);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.shipments.rejectLeg(id, user.id);
  }
}
