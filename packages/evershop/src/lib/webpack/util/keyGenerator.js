import crypto from 'crypto';

export function generateComponentKey(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}
