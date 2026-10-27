import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import {
  EmailDto,
  LoginDto,
  OAuthExchangeDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.dto';

// Only redirects are needed, so avoid depending on @types/express.
type Response = { redirect(url: string): void };

const webUrl = () => (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private google: GoogleOAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-verification')
  @HttpCode(200)
  resend(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgot(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('google')
  googleStart(@Query('intent') intent: string, @Res() res: Response) {
    if (!this.google.configured) {
      return res.redirect(`${webUrl()}/auth/signin?error=google_unavailable`);
    }
    return res.redirect(this.google.authorizeUrl(intent === 'signup' ? 'signup' : 'signin'));
  }

  // Google redirects here; we redirect on to the web app with a one-minute
  // exchange code in the fragment (never sent to servers or logs).
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response
  ) {
    try {
      if (error || !code) throw new Error(error || 'missing code');
      this.google.verifyState(state);
      const user = await this.auth.googleLogin(await this.google.exchange(code));
      return res.redirect(`${webUrl()}/auth/callback#code=${encodeURIComponent(this.google.exchangeCode(user.id))}`);
    } catch {
      return res.redirect(`${webUrl()}/auth/signin?error=google_failed`);
    }
  }

  @Post('oauth/exchange')
  @HttpCode(200)
  oauthExchange(@Body() dto: OAuthExchangeDto) {
    return this.auth.sessionFor(this.google.readExchangeCode(dto.code));
  }
}
