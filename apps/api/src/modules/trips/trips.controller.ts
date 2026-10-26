import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto, TravelProofDto, UpdateTripDto } from './trips.dto';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller('trips')
@UseGuards(JwtGuard)
export class TripsController {
  constructor(private trips: TripsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateTripDto) {
    return this.trips.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('origin') origin?: string,
    @Query('dest') dest?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('mine') mine?: string
  ) {
    return this.trips.list({ origin, dest, from, to, carrierId: mine === 'true' ? user.id : undefined });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.trips.get(id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, user.id, dto);
  }

  @Post(':id/travel-proof')
  travelProof(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: TravelProofDto
  ) {
    return this.trips.travelProof(id, user.id, dto);
  }
}
