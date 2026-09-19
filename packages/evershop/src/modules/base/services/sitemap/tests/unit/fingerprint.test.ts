import { buildFingerprint, hasChanged } from '../../fingerprint.js';
import { CollectorStat } from '../../types.js';

const stat = (count: number, maxUpdatedAt: string | null): CollectorStat => ({
  count,
  maxUpdatedAt
});

describe('buildFingerprint', () => {
  it('is deterministic regardless of entry and locale order', () => {
    const a = buildFingerprint(
      [
        { name: 'products', stat: stat(5, '2026-01-01T00:00:00.000Z') },
        { name: 'categories', stat: stat(3, '2026-01-02T00:00:00.000Z') }
      ],
      ['en', 'de'],
      'en'
    );
    const b = buildFingerprint(
      [
        { name: 'categories', stat: stat(3, '2026-01-02T00:00:00.000Z') },
        { name: 'products', stat: stat(5, '2026-01-01T00:00:00.000Z') }
      ],
      ['de', 'en'],
      'en'
    );
    expect(a).toBe(b);
  });

  it('treats a null maxUpdatedAt as empty', () => {
    expect(
      buildFingerprint([{ name: 'products', stat: stat(0, null) }], ['en'], 'en')
    ).toContain('products:0:');
  });
});

describe('hasChanged', () => {
  const base = buildFingerprint(
    [{ name: 'products', stat: stat(5, '2026-01-01T00:00:00.000Z') }],
    ['en'],
    'en'
  );

  it('is true when there is no prior fingerprint', () => {
    expect(hasChanged(null, base)).toBe(true);
  });

  it('is false on identity', () => {
    const same = buildFingerprint(
      [{ name: 'products', stat: stat(5, '2026-01-01T00:00:00.000Z') }],
      ['en'],
      'en'
    );
    expect(hasChanged(base, same)).toBe(false);
  });

  it('is true when a count changes', () => {
    const next = buildFingerprint(
      [{ name: 'products', stat: stat(6, '2026-01-01T00:00:00.000Z') }],
      ['en'],
      'en'
    );
    expect(hasChanged(base, next)).toBe(true);
  });

  it('is true when maxUpdatedAt advances', () => {
    const next = buildFingerprint(
      [{ name: 'products', stat: stat(5, '2026-02-01T00:00:00.000Z') }],
      ['en'],
      'en'
    );
    expect(hasChanged(base, next)).toBe(true);
  });

  it('is true when the paths hash changes but count/updated_at do not (URL moved)', () => {
    // The exact "assign a category" bug: same count + same updated_at, different URL.
    const before = buildFingerprint(
      [{ name: 'products', stat: { count: 1, maxUpdatedAt: 'x', pathsHash: 'root' } }],
      ['en'],
      'en'
    );
    const after = buildFingerprint(
      [{ name: 'products', stat: { count: 1, maxUpdatedAt: 'x', pathsHash: 'nested' } }],
      ['en'],
      'en'
    );
    expect(hasChanged(before, after)).toBe(true);
  });

  it('is false when the paths hash is identical', () => {
    const a = buildFingerprint(
      [{ name: 'products', stat: { count: 1, maxUpdatedAt: 'x', pathsHash: 'same' } }],
      ['en'],
      'en'
    );
    const b = buildFingerprint(
      [{ name: 'products', stat: { count: 1, maxUpdatedAt: 'x', pathsHash: 'same' } }],
      ['en'],
      'en'
    );
    expect(hasChanged(a, b)).toBe(false);
  });

  it('is true when a locale is added', () => {
    const next = buildFingerprint(
      [{ name: 'products', stat: stat(5, '2026-01-01T00:00:00.000Z') }],
      ['en', 'de'],
      'en'
    );
    expect(hasChanged(base, next)).toBe(true);
  });

  it('is true when the default locale changes (same enabled set)', () => {
    const enDefault = buildFingerprint(
      [{ name: 'products', stat: stat(5, 'x') }],
      ['en', 'de'],
      'en'
    );
    const deDefault = buildFingerprint(
      [{ name: 'products', stat: stat(5, 'x') }],
      ['en', 'de'],
      'de'
    );
    expect(hasChanged(enDefault, deDefault)).toBe(true);
  });
});
