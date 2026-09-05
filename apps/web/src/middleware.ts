import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge middleware — uses only the edge-safe config (no argon2 / Prisma).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/dashboard/:path*'],
};
