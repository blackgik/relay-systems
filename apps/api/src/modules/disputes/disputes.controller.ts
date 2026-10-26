import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { AdminGuard } from './admin.guard';
import { ClaimDto, DisputeDto, RuleDto } from '../custody/custody.dto';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller()
@UseGuards(JwtGuard)
export class DisputesController {
  constructor(private disputes: DisputesService) {}

  @Post('disputes')
  open(@CurrentUser() user: { id: string }, @Body() dto: DisputeDto) {
    return this.disputes.open(user.id, dto);
  }

  @Post('disputes/:id/rule')
  @UseGuards(AdminGuard)
  rule(@Param('id') id: string, @Body() dto: RuleDto) {
    return this.disputes.rule(id, dto.ruling);
  }

  @Post('claims')
  claim(@CurrentUser() user: { id: string }, @Body() dto: ClaimDto) {
    return this.disputes.fileClaim(user.id, dto);
  }
}
