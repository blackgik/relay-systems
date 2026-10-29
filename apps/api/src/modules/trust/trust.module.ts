import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OutboxService } from '../../common/outbox/outbox.service';
import { TrustController } from './trust.controller';
import { TrustService } from './trust.service';

@Module({
  imports: [IdentityModule],
  controllers: [TrustController],
  providers: [TrustService, OutboxService],
  exports: [TrustService],
})
export class TrustModule {}
