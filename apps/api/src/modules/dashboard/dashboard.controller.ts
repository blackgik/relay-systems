import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: { id: string }) {
    return this.dashboard.summary(user.id);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: { id: string }) {
    return this.dashboard.notifications(user.id);
  }
}
