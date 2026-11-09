import { describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

/**
 * The bcrypt helpers of the password module (G3 of the import engine): the shape
 * check for a hash that is stored as given, and the hash of a secret that
 * nobody knows. `crypto.randomBytes` is wrapped to see which secret was hashed.
 */
const secrets: Buffer[] = [];
jest.unstable_mockModule('crypto', async () => {
  const actual = (await import('node:crypto')) as typeof import('crypto');
  return {
    ...actual,
    default: actual,
    randomBytes: (size: number) => {
      const bytes = actual.randomBytes(size);
      secrets.push(bytes);
      return bytes;
    }
  };
});

const {
  BCRYPT_HASH_PATTERN,
  createUnusablePasswordHash,
  hashPassword,
  isBcryptHash
} = await import('../../passwordHelper.js');

const HASH = bcrypt.hashSync('secret-123', 4); // $2a$04$ + 53 characters
const BODY = HASH.slice(7);

describe('isBcryptHash', () => {
  it('accepts the hashes that bcryptjs makes, and the three prefixes at every cost', () => {
    expect(isBcryptHash(HASH)).toBe(true);
    expect(isBcryptHash(hashPassword('secret-123'))).toBe(true);
    for (const prefix of ['2a', '2b', '2y']) {
      for (const cost of ['04', '09', '10', '19', '20', '31']) {
        expect(isBcryptHash(`$${prefix}$${cost}$${BODY}`)).toBe(true);
      }
    }
  });

  it('verifies what it accepts: a $2y$ hash from another language works with compareSync', () => {
    expect(bcrypt.compareSync('secret-123', `$2y$04$${BODY}`)).toBe(true);
    expect(bcrypt.compareSync('secret-123', `$2b$04$${BODY}`)).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['plain text', 'secret-123'],
    ['a phpass hash', '$P$B1234567890123456789012345678901'],
    ['a WordPress 6.8 hash', `$wp$2y$10$${BODY}`],
    ['an unknown prefix', `$2x$10$${BODY}`],
    ['a cost below 04', `$2a$03$${BODY}`],
    ['a cost above 31', `$2a$32$${BODY}`],
    ['a cost of one digit', `$2a$4$${BODY}`],
    ['one character short', HASH.slice(0, -1)],
    ['one character long', `${HASH}a`],
    ['a trailing line break', `${HASH}\n`],
    ['a leading space', ` ${HASH}`],
    ['a character outside the alphabet', `${HASH.slice(0, -1)}!`],
    ['a number', 12345],
    ['null', null],
    ['undefined', undefined],
    ['an object', { hash: HASH }]
  ])('refuses %s', (_name, value) => {
    expect(isBcryptHash(value)).toBe(false);
  });

  it('is the same pattern the module exports', () => {
    expect(BCRYPT_HASH_PATTERN.test(HASH)).toBe(true);
    expect(BCRYPT_HASH_PATTERN.test('x')).toBe(false);
  });
});

describe('createUnusablePasswordHash', () => {
  it('is a bcrypt hash of 32 random bytes, written in hex', () => {
    secrets.length = 0;
    const hash = createUnusablePasswordHash();
    expect(isBcryptHash(hash)).toBe(true);
    expect(secrets).toHaveLength(1);
    expect(secrets[0]).toHaveLength(32);
    expect(bcrypt.compareSync(secrets[0].toString('hex'), hash)).toBe(true);
  });

  it('makes a new secret every time', () => {
    secrets.length = 0;
    const a = createUnusablePasswordHash();
    const b = createUnusablePasswordHash();
    expect(secrets).toHaveLength(2);
    expect(secrets[0].equals(secrets[1])).toBe(false);
    expect(bcrypt.compareSync(secrets[0].toString('hex'), a)).toBe(true);
    expect(bcrypt.compareSync(secrets[1].toString('hex'), b)).toBe(true);
    expect(bcrypt.compareSync(secrets[0].toString('hex'), b)).toBe(false);
  });

  it('is not a password anyone can guess', () => {
    const hash = createUnusablePasswordHash();
    for (const guess of ['', 'password', '123456', 'unusable']) {
      expect(bcrypt.compareSync(guess, hash)).toBe(false);
    }
  });
});
