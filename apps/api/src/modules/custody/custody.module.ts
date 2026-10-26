import { Module } from '@nestjs/common';
import { OutboxService } from '../../common/outbox/outbox.service';
import { IdentityModule } from '../identity/identity.module';
import { LedgerModule } from '../ledger/ledger.module';
import { CustodyController } from './custody.controller';
import { CustodyService } from './custody.service';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [IdentityModule, LedgerModule],
  controllers: [CustodyController, TrackingController],
  providers: [CustodyService, TrackingGateway, OutboxService],
  exports: [CustodyService],
})
export class CustodyModule {}
