import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: { email: string; name?: string };
  subject: string;
  html: string;
}

// ZeptoMail transactional email over its REST API (same endpoint the
// zeptomail SDK wraps). Without credentials it logs instead of sending, so
// local development never blocks on email.
@Injectable()
export class MailerService {
  private log = new Logger('Mailer');

  get configured() {
    return Boolean(process.env.ZEPTO_URL && process.env.ZEPTO_TOKEN && process.env.ZEPTO_FROM);
  }

  async send(msg: MailMessage): Promise<boolean> {
    if (!this.configured) {
      // Subjects can carry OTPs, so only the recipient is logged.
      this.log.warn(`ZeptoMail not configured; skipped email to ${msg.to.email}`);
      return false;
    }
    const base = process.env.ZEPTO_URL!.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    try {
      const res = await fetch(`https://${base}/v1.1/email`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: process.env.ZEPTO_TOKEN!,
        },
        body: JSON.stringify({
          from: { address: process.env.ZEPTO_FROM, name: process.env.ZEPTO_FROM_NAME ?? 'Relay' },
          to: [{ email_address: { address: msg.to.email, name: msg.to.name ?? msg.to.email } }],
          subject: msg.subject,
          htmlbody: msg.html,
        }),
      });
      if (!res.ok) {
        this.log.error(`ZeptoMail ${res.status}: ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.log.error(`ZeptoMail request failed: ${(err as Error).message}`);
      return false;
    }
  }
}
