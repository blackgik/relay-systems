import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OutboxService } from '../../common/outbox/outbox.service';
import { LedgerModule } from '../ledger/ledger.module';
import { AdminGuard } from './admin.guard';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [IdentityModule, LedgerModule],
  controllers: [DisputesController],
  providers: [DisputesService, AdminGuard, OutboxService],
  exports: [DisputesService],
})
export class DisputesModule {}
