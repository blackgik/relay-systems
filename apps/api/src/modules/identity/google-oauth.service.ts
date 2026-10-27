import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as jwt from 'jsonwebtoken';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

function secret() {
  return process.env.JWT_SECRET ?? 'relay-dev-secret';
}

// Server-side authorization-code flow. `state` is a short-lived signed token
// so the callback can reject forged or replayed redirects.
@Injectable()
export class GoogleOAuthService {
  get configured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  private callbackUrl() {
    return process.env.GOOGLE_CALLBACK_URL ?? `http://localhost:${process.env.PORT ?? 3001}/auth/google/callback`;
  }

  authorizeUrl(intent: 'signin' | 'signup') {
    if (!this.configured) throw new ServiceUnavailableException('Google sign-in is not configured');
    const state = jwt.sign({ type: 'oauth_state', intent, n: randomBytes(8).toString('hex') }, secret(), {
      expiresIn: '10m',
    });
    const q = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: this.callbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }

  verifyState(state: string) {
    try {
      const payload = jwt.verify(state, secret()) as { type: string; intent: 'signin' | 'signup' };
      if (payload.type !== 'oauth_state') throw new Error('wrong type');
      return payload;
    } catch {
      throw new UnauthorizedException('Sign-in session expired. Please try again.');
    }
  }

  async exchange(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: this.callbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = (await tokenRes.json().catch(() => null)) as { access_token?: string } | null;
    if (!tokenRes.ok || !tokens?.access_token) throw new UnauthorizedException('Google sign-in failed');

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = (await infoRes.json().catch(() => null)) as
      | { sub: string; email: string; email_verified: boolean; name?: string }
      | null;
    if (!infoRes.ok || !info?.email) throw new UnauthorizedException('Google sign-in failed');
    return {
      sub: info.sub,
      email: info.email.toLowerCase(),
      emailVerified: Boolean(info.email_verified),
      name: info.name ?? info.email.split('@')[0],
    };
  }

  // One-minute code handed to the web app in a URL fragment and swapped for
  // real tokens over POST, so access/refresh tokens never sit in a URL.
  exchangeCode(userId: string) {
    return jwt.sign({ type: 'oauth_exchange', sub: userId }, secret(), { expiresIn: '60s' });
  }

  readExchangeCode(code: string) {
    try {
      const payload = jwt.verify(code, secret()) as { type: string; sub: string };
      if (payload.type !== 'oauth_exchange') throw new Error('wrong type');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Sign-in link expired. Please try again.');
    }
  }
}
