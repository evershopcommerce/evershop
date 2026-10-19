import { describe, expect, it } from '@jest/globals';
import { getAjv } from '../../../../base/services/getAjv.js';
import {
  MAX_EMAIL_LENGTH,
  parseEmail
} from '../../../services/cells/parsers.js';

/**
 * `parseEmail` is the check of the `email` format of core's customer schema
 * (`ajv-formats`, "full" mode) written again, because the import's own stages
 * may not load core. This test holds the two together.
 */
const ajv = getAjv();
const validate = ajv.compile({ type: 'string', format: 'email' });

const CORPUS = [
  'jane@example.com',
  'jane.doe@example.com',
  'jane+tag@sub.example.co.uk',
  'JANE@EXAMPLE.COM',
  "o'brien@example.ie",
  'a@b.co',
  'a@b',
  'a@b.c',
  '1@2.3',
  'x_y-z@my-host.example.org',
  'user@-bad.com',
  'user@bad-.com',
  'user@bad..com',
  'user@.bad.com',
  'user@bad.com.',
  'user name@example.com',
  'user@exa mple.com',
  '.user@example.com',
  'user.@example.com',
  'us..er@example.com',
  '@example.com',
  'user@',
  'user',
  '',
  'user@@example.com',
  'user@example.com\n',
  'user@exämple.com',
  'üser@example.com',
  'user@[127.0.0.1]',
  '"quoted"@example.com',
  'user@example_com.com',
  `${'a'.repeat(64)}@example.com`,
  `user@${'a'.repeat(63)}.com`
];

// A fixed pseudo-random sequence of strings made of the characters that matter.
function strings(count: number): string[] {
  const alphabet = ['a', 'Z', '0', '9', '.', '-', '_', '+', '@', ' ', 'é', "'"];
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  return Array.from({ length: count }, () => {
    const length = 1 + (next() % 14);
    return Array.from(
      { length },
      () => alphabet[next() % alphabet.length]
    ).join('');
  });
}

describe('parseEmail', () => {
  it.each([...CORPUS, ...strings(4000)])('agrees with core on %j', (text) => {
    expect(parseEmail(text).ok).toBe(validate(text));
  });

  it('refuses a very long address before the expression runs (no slow backtracking)', () => {
    const long = `${'a'.repeat(MAX_EMAIL_LENGTH)}@example.com`;
    const started = Date.now();
    const result = parseEmail(long);
    expect(result).toMatchObject({
      ok: false,
      params: { reason: 'too_long', max: MAX_EMAIL_LENGTH }
    });
    expect(Date.now() - started).toBeLessThan(50);
    // The worst case of the expression itself, kept short by the limit.
    const slow = `${'a'.repeat(MAX_EMAIL_LENGTH - 12)}@${'a-'.repeat(5)}`;
    const t = Date.now();
    parseEmail(slow);
    expect(Date.now() - t).toBeLessThan(50);
  });

  it('accepts an address of exactly the longest length', () => {
    const local = 'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length);
    expect(parseEmail(`${local}@example.com`).ok).toBe(true);
    expect(parseEmail(`${local}a@example.com`).ok).toBe(false);
  });
});
