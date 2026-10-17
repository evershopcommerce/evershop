import { describe, it, expect } from '@jest/globals';
import {
  assertLiteralAllowed,
  BlockedAddressError,
  BLOCKED_MESSAGE,
  createGuardedLookup
} from '../../guardedLookup.js';
import type { LookupFunction } from '../../guardedLookup.js';

const lookupOf =
  (...addresses: string[]): LookupFunction =>
  (_hostname, _options, callback) => {
    callback(
      null,
      addresses.map((address) => ({
        address,
        family: address.includes(':') ? 6 : 4
      }))
    );
  };

type Outcome = { error: any; args: any[] };

function run(
  guard: ReturnType<typeof createGuardedLookup>,
  options: unknown = {}
): Promise<Outcome> {
  return new Promise((resolve) => {
    guard('example.test', options, (error: any, ...args: any[]) =>
      resolve({ error, args })
    );
  });
}

describe('createGuardedLookup', () => {
  it('passes a public address through, in the form the caller asked for', async () => {
    const guard = createGuardedLookup({
      allowPrivate: () => false,
      lookup: lookupOf('93.184.216.34')
    });
    expect(await run(guard)).toEqual({
      error: null,
      args: ['93.184.216.34', 4]
    });
    expect(await run(guard, { all: true })).toEqual({
      error: null,
      args: [[{ address: '93.184.216.34', family: 4 }]]
    });
  });

  it('always asks the resolver for all addresses', async () => {
    const seen: unknown[] = [];
    const guard = createGuardedLookup({
      allowPrivate: () => false,
      lookup: (hostname, options, callback) => {
        seen.push(options);
        lookupOf('93.184.216.34')(hostname, options, callback);
      }
    });
    await run(guard);
    await run(guard, 6);
    await run(guard, { family: 4, all: false });
    expect(seen).toEqual([
      { all: true },
      { family: 6, all: true },
      { family: 4, all: true }
    ]);
  });

  it('accepts the callback as the second argument', async () => {
    const guard = createGuardedLookup({
      allowPrivate: () => false,
      lookup: lookupOf('93.184.216.34')
    });
    const outcome = await new Promise<Outcome>((resolve) => {
      (guard as any)('example.test', (error: any, ...args: any[]) =>
        resolve({ error, args })
      );
    });
    expect(outcome.args).toEqual(['93.184.216.34', 4]);
  });

  it.each([
    ['127.0.0.1'],
    ['10.0.0.5'],
    ['169.254.169.254'],
    ['::1'],
    ['fd00::1'],
    ['64:ff9b::7f00:1'],
    ['2002:a9fe:a9fe::']
  ])('refuses a host that resolves to %s', async (address) => {
    const guard = createGuardedLookup({
      allowPrivate: () => false,
      lookup: lookupOf(address)
    });
    const { error } = await run(guard);
    expect(error).toBeInstanceOf(BlockedAddressError);
    expect(error.code).toBe('EBLOCKED');
    expect(error.message).toBe(BLOCKED_MESSAGE);
  });

  it('refuses a host when ANY of its addresses is blocked (DNS rebinding)', async () => {
    const guard = createGuardedLookup({
      allowPrivate: () => false,
      lookup: lookupOf('93.184.216.34', '127.0.0.1')
    });
    expect((await run(guard)).error).toBeInstanceOf(BlockedAddressError);
    expect((await run(guard, { all: true })).error).toBeInstanceOf(
      BlockedAddressError
    );
  });

  it('lets a private address through when private networks are allowed, and asks each time', async () => {
    let allowed = false;
    const guard = createGuardedLookup({
      allowPrivate: () => allowed,
      lookup: lookupOf('127.0.0.1')
    });
    expect((await run(guard)).error).toBeInstanceOf(BlockedAddressError);
    allowed = true;
    expect(await run(guard)).toEqual({ error: null, args: ['127.0.0.1', 4] });
    allowed = false;
    expect((await run(guard)).error).toBeInstanceOf(BlockedAddressError);
  });

  it('passes a failure of the resolver on, as it is', async () => {
    const failure = Object.assign(new Error('not found'), {
      code: 'ENOTFOUND'
    });
    const guard = createGuardedLookup({
      allowPrivate: () => false,
      lookup: (_hostname, _options, callback) => callback(failure, [])
    });
    expect((await run(guard)).error).toBe(failure);
  });

  it('uses dns.lookup when it is not given another', async () => {
    const guard = createGuardedLookup({ allowPrivate: () => false });
    // "localhost" resolves to a loopback address everywhere.
    const { error } = await new Promise<Outcome>((resolve) => {
      guard('localhost', {}, (e: any, ...args: any[]) =>
        resolve({ error: e, args })
      );
    });
    expect(error).toBeInstanceOf(BlockedAddressError);
  });
});

describe('assertLiteralAllowed', () => {
  it.each([
    ['169.254.169.254'],
    ['127.0.0.1'],
    ['[::1]'],
    ['::1'],
    ['[64:ff9b::7f00:1]'],
    ['[2002:7f00:1::]'],
    ['[::ffff:127.0.0.1]']
  ])('refuses the literal %s', (host) => {
    expect(() => assertLiteralAllowed(host, false)).toThrow(
      BlockedAddressError
    );
  });

  it('allows a literal when private networks are allowed', () => {
    expect(() => assertLiteralAllowed('127.0.0.1', true)).not.toThrow();
  });

  it.each([
    ['93.184.216.34'],
    ['[2606:4700:4700::1111]'],
    ['example.com'],
    ['localhost']
  ])('leaves %s to the lookup', (host) => {
    expect(() => assertLiteralAllowed(host, false)).not.toThrow();
  });
});
