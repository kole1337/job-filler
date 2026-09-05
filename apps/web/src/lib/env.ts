import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  EXT_JWT_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(32),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Job Filler <noreply@example.com>'),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),
  ALLOWED_EXTENSION_ORIGINS: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

// During `next build` on CI without env, don't hard-crash the type import.
const parsed = schema.safeParse(process.env);
if (!parsed.success && process.env.NODE_ENV !== 'production') {
  console.warn('[env] missing/invalid vars:', parsed.error.flatten().fieldErrors);
}

export const env = (parsed.success ? parsed.data : (process.env as unknown)) as z.infer<typeof schema>;

export const allowedExtensionOrigins = () =>
  env.ALLOWED_EXTENSION_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
