import crypto from 'crypto';

/** A new signing secret: `whsec_` + 32 random bytes (hex). */
export function generateSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}
