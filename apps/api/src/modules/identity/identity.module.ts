import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { OtpService } from './otp.service';
import { GoogleOAuthService } from './google-oauth.service';
import { EmailModule } from '../integrations/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtGuard, OtpService, GoogleOAuthService],
  exports: [AuthService, JwtGuard],
})
export class IdentityModule {}
