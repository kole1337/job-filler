import { z } from 'zod';

/** Shared request/response contracts for the extension <-> portal auth flow. */

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const signupSchema = credentialsSchema.extend({
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .max(200)
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/\d/, 'Include a number'),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
  refreshToken: z.string(),
  user: z.object({ id: z.string(), email: z.string().email() }),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

/** Claims carried by the short-lived extension access token (JWT). */
export interface AccessTokenClaims {
  sub: string; // user id
  email: string;
  scope: 'extension';
  iat: number;
  exp: number;
}
