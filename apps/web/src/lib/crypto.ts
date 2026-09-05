import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from './env';

/**
 * AES-256-GCM column encryption for sensitive PII.
 * Stored format: base64( iv[12] || authTag[16] || ciphertext ).
 */
function key(): Buffer {
  const raw = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (raw.length === 32) return raw;
  // Allow a hex or arbitrary-length secret by hashing down to 32 bytes.
  return createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null; // tampered / wrong key — treat as absent
  }
}

/** SHA-256 hex — used for storing refresh / verification tokens. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
