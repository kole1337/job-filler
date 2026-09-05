import { signupSchema } from '@job-filler/shared';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { json } from '@/lib/api-auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createVerificationLink } from '@/lib/verification';
import { sendEmail, verificationEmail } from '@/lib/mail';

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const rl = await rateLimit(`signup:${ip}`, { limit: 5, windowSec: 3600 });
  if (!rl.ok) return json({ error: 'too many attempts' }, { status: 429 });

  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: 'invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  // Respond the same whether or not the account exists (no user enumeration).
  if (!existing) {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(parsed.data.password) },
    });
    const link = await createVerificationLink(user.id, 'email-verify');
    const mail = verificationEmail(link);
    await sendEmail(email, mail.subject, mail.text);
  }

  return json({ ok: true, message: 'Check your email to verify your account.' });
}
