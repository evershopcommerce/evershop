import { createHash } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { nodeSha256, nodeSha256Hex } from '../../../adapters/nodeSha256.js';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('nodeSha256', () => {
  it('hashes a text', () => {
    expect(nodeSha256Hex('abc')).toBe(ABC);
    expect(nodeSha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('hashes text as UTF-8', () => {
    expect(nodeSha256Hex('é日本')).toBe(
      createHash('sha256').update(Buffer.from('é日本', 'utf8')).digest('hex')
    );
  });

  it('hashes in pieces what it would hash whole', () => {
    const hash = nodeSha256();
    hash.update(Buffer.from('a'));
    hash.update(Buffer.from('b'));
    hash.update(Buffer.from('c'));
    expect(hash.digestHex()).toBe(ABC);
  });

  it('gives a new hash each time', () => {
    const one = nodeSha256();
    const two = nodeSha256();
    one.update(Buffer.from('abc'));
    expect(two.digestHex()).not.toBe(one.digestHex());
  });
});
