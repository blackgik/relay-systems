import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { KycModule } from './modules/kyc/kyc.module';
import { TripsModule } from './modules/trips/trips.module';
import { RoutingModule } from './modules/routing/routing.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { ChatModule } from './modules/chat/chat.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PspModule } from './modules/integrations/psp/psp.module';
import { CustodyModule } from './modules/custody/custody.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { PeopleModule } from './modules/people/people.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, IdentityModule, KycModule, TripsModule, RoutingModule, ShipmentsModule, ChatModule, LedgerModule, PspModule, CustodyModule, DisputesModule, PeopleModule, DashboardModule],
  controllers: [AppController],
})
export class AppModule {}
