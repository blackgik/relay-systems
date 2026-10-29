import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OutboxService } from '../../common/outbox/outbox.service';
import { LedgerModule } from '../ledger/ledger.module';
import { RoutingModule } from '../routing/routing.module';
import { TripsModule } from '../trips/trips.module';
import { LegsController } from './legs.controller';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  imports: [IdentityModule, RoutingModule, TripsModule, LedgerModule],
  controllers: [ShipmentsController, LegsController],
  providers: [ShipmentsService, OutboxService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
