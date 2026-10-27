import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PeopleModule } from '../people/people.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [IdentityModule, PeopleModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
