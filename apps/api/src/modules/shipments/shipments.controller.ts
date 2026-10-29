import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto, RateDeliveryDto, SelectRouteDto } from './shipments.dto';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller('shipments')
@UseGuards(JwtGuard)
export class ShipmentsController {
  constructor(private shipments: ShipmentsService) {}

  @Get()
  listMine(@CurrentUser() user: { id: string }) {
    return this.shipments.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateShipmentDto) {
    return this.shipments.create(user.id, dto);
  }

  @Get(':id/routes')
  routes(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.shipments.routes(id, user.id);
  }

  @Post(':id/select-route')
  selectRoute(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SelectRouteDto
  ) {
    return this.shipments.selectRoute(id, user.id, dto.tripIds, dto.attestation);
  }

  @Post(':id/rate')
  rate(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: RateDeliveryDto) {
    return this.shipments.rateDelivery(id, user.id, dto.rating, dto.comment);
  }

  @Get(':id/timeline')
  timeline(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.shipments.timeline(id, user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.shipments.get(id, user.id);
  }
}
