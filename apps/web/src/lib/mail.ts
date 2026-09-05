import 'server-only';
import { env } from './env';

/** Send an email via Resend, or log to the console in dev when no key is set. */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.info(`\n--- DEV EMAIL ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----------------\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

export function verificationEmail(link: string) {
  return {
    subject: 'Verify your Job Filler email',
    text: `Confirm your email address to finish setting up Job Filler:\n\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
  };
}

export function resetEmail(link: string) {
  return {
    subject: 'Reset your Job Filler password',
    text: `Reset your password:\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  };
}
