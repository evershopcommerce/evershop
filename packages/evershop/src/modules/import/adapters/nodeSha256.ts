import { createHash } from 'crypto';
import type { Sha256 } from '../services/ports/hasher.js';

/** The real `Sha256` port: Node's hash, fed a piece at a time. */
export const nodeSha256: Sha256 = () => {
  const hash = createHash('sha256');
  return {
    update(chunk) {
      hash.update(chunk);
    },
    digestHex() {
      return hash.digest('hex');
    }
  };
};
