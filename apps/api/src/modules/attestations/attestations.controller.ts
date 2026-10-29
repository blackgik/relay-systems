import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { AttestationsService } from './attestations.service';

@Controller('attestations')
@UseGuards(JwtGuard)
export class AttestationsController {
  constructor(private attestations: AttestationsService) {}

  /** The exact wording a sender signs, and the name they must sign with. */
  @Get('statement')
  statement(@CurrentUser() user: { id: string }) {
    return this.attestations.statementFor(user.id);
  }

  @Get(':shipmentId')
  get(@CurrentUser() user: { id: string }, @Param('shipmentId') shipmentId: string) {
    return this.attestations.forShipment(shipmentId, user.id);
  }
}
