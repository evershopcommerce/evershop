import { getTrustProxyHops } from '../../getTrustProxyHops.js';

describe('getTrustProxyHops', () => {
  const original = process.env.TRUST_PROXY_HOPS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TRUST_PROXY_HOPS;
    } else {
      process.env.TRUST_PROXY_HOPS = original;
    }
  });

  function withEnv(value: string | undefined): number {
    if (value === undefined) {
      delete process.env.TRUST_PROXY_HOPS;
    } else {
      process.env.TRUST_PROXY_HOPS = value;
    }
    return getTrustProxyHops();
  }

  it('defaults to 1 when unset or empty', () => {
    expect(withEnv(undefined)).toBe(1);
    expect(withEnv('')).toBe(1);
    expect(withEnv('   ')).toBe(1);
  });

  it('honors valid non-negative integers', () => {
    expect(withEnv('0')).toBe(0);
    expect(withEnv('1')).toBe(1);
    expect(withEnv('2')).toBe(2);
    expect(withEnv(' 3 ')).toBe(3);
  });

  it('falls back to 1 on invalid values rather than mis-trusting', () => {
    expect(withEnv('abc')).toBe(1);
    expect(withEnv('-1')).toBe(1);
    expect(withEnv('1.5')).toBe(1);
    expect(withEnv('true')).toBe(1);
  });
});
