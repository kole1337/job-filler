import { prisma } from '@/lib/db';
import { consumeVerificationToken } from '@/lib/verification';
import { env } from '@/lib/env';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const result = await consumeVerificationToken(token, 'email-verify');
  const to = (ok: boolean) =>
    Response.redirect(`${env.NEXT_PUBLIC_APP_URL}/login?verified=${ok ? '1' : '0'}`, 303);
  if (!result) return to(false);
  await prisma.user.update({ where: { id: result.userId }, data: { emailVerified: new Date() } });
  return to(true);
}
