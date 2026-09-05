import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { credentialsSchema } from '@job-filler/shared';
import { authConfig } from '@/auth.config';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.emailVerified) return null;
        const ok = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!ok) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
});
