import type { NextAuthConfig } from 'next-auth';
import { env } from '@/lib/env';

/**
 * Edge-safe auth config — no Node-only imports (argon2, Prisma).
 * Used by middleware and extended in `auth.ts` with the Credentials provider.
 */
export const authConfig = {
  secret: env.AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/login' },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const onDashboard = request.nextUrl.pathname.startsWith('/dashboard');
      if (onDashboard) return !!auth?.user;
      return true;
    },
    jwt: ({ token, user }) => {
      if (user) token.uid = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
