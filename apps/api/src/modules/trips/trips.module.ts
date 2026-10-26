import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OutboxService } from '../../common/outbox/outbox.service';
import { KycModule } from '../kyc/kyc.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [IdentityModule, KycModule],
  controllers: [TripsController],
  providers: [TripsService, OutboxService],
  exports: [TripsService],
})
export class TripsModule {}
