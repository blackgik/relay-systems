import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

@Controller()
export class MeController {
  constructor(private auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.auth.me(user.id);
  }
}
