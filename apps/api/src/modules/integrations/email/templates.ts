// Inline-styled HTML for email clients. Brand: harbor #0B3B4B, signal #F59E0B.

const CODE_FOOTER =
  'Relay never asks for this code by phone, chat or email. If you did not request it, you can ignore this message.';

function layout(body: string, footer = CODE_FOOTER) {
  return `<!doctype html><html><body style="margin:0;background:#F7F7FC;font-family:Arial,Helvetica,sans-serif;color:#33333F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0B3B4B;padding:24px 32px;font-size:24px;font-weight:800;color:#ffffff">relay<span style="color:#F59E0B">.</span></td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #EFF0F6;font-size:12px;color:#9D9DBC">${footer}</td></tr></table></td></tr></table></body></html>`;
}

function codeBlock(code: string) {
  return `<div style="margin:24px 0;padding:18px;border-radius:14px;background:#DDF2F5;text-align:center;font-size:34px;letter-spacing:10px;font-weight:800;color:#0B3B4B">${code}</div>`;
}

export function verifyEmailTemplate(name: string, code: string, minutes: number) {
  return {
    subject: `${code} is your Relay verification code`,
    html: layout(`<h1 style="margin:0 0 12px;font-size:22px">Confirm your email</h1>
<p style="margin:0;font-size:15px;line-height:22px">Hi ${escape(name)}, enter this code to finish creating your Relay account.</p>
${codeBlock(code)}
<p style="margin:0;font-size:13px;color:#5C5C70">The code expires in ${minutes} minutes.</p>`),
  };
}

export function resetPasswordTemplate(name: string, code: string, minutes: number) {
  return {
    subject: `${code} is your Relay password reset code`,
    html: layout(`<h1 style="margin:0 0 12px;font-size:22px">Reset your password</h1>
<p style="margin:0;font-size:15px;line-height:22px">Hi ${escape(name)}, use this code to choose a new password.</p>
${codeBlock(code)}
<p style="margin:0;font-size:13px;color:#5C5C70">The code expires in ${minutes} minutes. Your current password keeps working until you change it.</p>`),
  };
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const KYC_FOOTER = 'Relay staff will never ask for your BVN, NIN or passwords by phone or email.';

export function kycDecisionTemplate(name: string, approved: boolean, note?: string | null) {
  return approved
    ? {
        subject: 'You’re verified on Relay',
        html: layout(`<h1 style="margin:0 0 12px;font-size:22px">You’re verified</h1>
<p style="margin:0;font-size:15px;line-height:22px">Hi ${escape(name)}, your identity and payout account are confirmed. You can now send and carry on Relay.</p>`, KYC_FOOTER),
      }
    : {
        subject: 'Action needed on your Relay verification',
        html: layout(`<h1 style="margin:0 0 12px;font-size:22px">We couldn’t verify you yet</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:22px">Hi ${escape(name)}, a reviewer could not approve your details.</p>
<p style="margin:0;padding:14px;border-radius:12px;background:#FEF3F2;color:#B42318;font-size:14px">${escape(note ?? 'Your details could not be verified')}</p>
<p style="margin:12px 0 0;font-size:15px;line-height:22px">Sign in to Relay to update your details and resubmit.</p>`, KYC_FOOTER),
      };
}
