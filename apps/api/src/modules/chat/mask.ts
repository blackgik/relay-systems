// Masks phone numbers and emails in chat to keep deals and protection on
// platform. Runs on every outbound message.
const PHONE_RE = /(\+\d[\d\s().-]{6,}\d|\b\d{3,4}[-.\s]?\d{3}[-.\s]?\d{3,4}\b)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;

export function maskContactDetails(body: string): string {
  return body.replace(PHONE_RE, '[hidden]').replace(EMAIL_RE, '[hidden]');
}
