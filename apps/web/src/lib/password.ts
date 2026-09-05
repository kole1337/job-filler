import 'server-only';
import { hash, verify } from '@node-rs/argon2';

// OWASP-recommended argon2id parameters.
const opts = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, opts);
}

export async function verifyPassword(digest: string, password: string): Promise<boolean> {
  try {
    return await verify(digest, password, opts);
  } catch {
    return false;
  }
}
