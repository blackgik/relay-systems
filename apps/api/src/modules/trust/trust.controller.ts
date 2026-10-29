import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { TrustService } from './trust.service';
import { MAX_COMMENT } from './trust.rules';

export class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_COMMENT)
  comment?: string;
}

class ReviewsQueryDto {
  @IsOptional()
  @IsIn(['courier', 'sender'])
  about?: 'courier' | 'sender';
}

@Controller()
@UseGuards(JwtGuard)
export class TrustController {
  constructor(private trust: TrustService) {}

  /** Courier: the sender's record and reviews; their identity once accepted. */
  @Get('legs/:id/sender')
  senderForLeg(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.trust.senderForLeg(id, user.id);
  }

  /** Courier: rate and comment on the sender after the trip ended or was terminated. */
  @Post('legs/:id/review')
  reviewSender(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.trust.reviewSender(id, user.id, dto.rating, dto.comment);
  }

  /** Sender: each courier on the shipment; their identity once they accepted. */
  @Get('shipments/:id/couriers')
  couriers(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.trust.couriersForShipment(id, user.id);
  }

  @Get('people/:handle/reviews')
  reviews(@Param('handle') handle: string, @Query() q: ReviewsQueryDto) {
    return this.trust.reviewsForHandle(handle, q.about === 'sender' ? 'OF_SENDER' : 'OF_COURIER');
  }
}
