import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CustodyService } from './custody.service';
import { DeliverDto, HandoffDto } from './custody.dto';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

@Controller()
@UseGuards(JwtGuard)
export class CustodyController {
  constructor(private custody: CustodyService) {}

  @Post('legs/:id/handoff-token')
  handoffToken(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.custody.requestHandoffToken(id, user.id);
  }

  @Post('custody/handoff')
  handoff(@CurrentUser() user: { id: string }, @Body() dto: HandoffDto) {
    return this.custody.handoff(user.id, dto);
  }

  @Post('shipments/:id/deliver')
  deliver(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: DeliverDto) {
    return this.custody.deliver(id, user.id, dto);
  }

  @Post('shipments/:id/complete')
  complete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.custody.complete(id, user.id);
  }
}
