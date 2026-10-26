import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtGuard],
})
export class IdentityModule {}
