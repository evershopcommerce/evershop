import { describe, it, expect } from '@jest/globals';
import {
  composeRecipient,
  splitNameFallback,
  normalizeNameParts
} from '../../names.js';
import type { AddressRow } from '../../types.js';

describe('composeRecipient', () => {
  it('joins given then family for given_first', () => {
    expect(composeRecipient({ givenName: 'Jane', familyName: 'Smith' }, 'given_first')).toBe(
      'Jane Smith'
    );
  });

  it('joins family then given for family_first', () => {
    expect(composeRecipient({ givenName: 'Văn A', familyName: 'Nguyễn' }, 'family_first')).toBe(
      'Nguyễn Văn A'
    );
    expect(composeRecipient({ givenName: '太郎', familyName: '山田' }, 'family_first')).toBe(
      '山田 太郎'
    );
  });

  it('yields the present part alone and trims', () => {
    expect(composeRecipient({ givenName: ' Madonna ' }, 'given_first')).toBe('Madonna');
    expect(composeRecipient({ familyName: 'Nguyễn', givenName: '  ' }, 'family_first')).toBe(
      'Nguyễn'
    );
    expect(composeRecipient({ givenName: null, familyName: undefined }, 'given_first')).toBe('');
  });
});

describe('splitNameFallback', () => {
  it('splits on the last space for given_first', () => {
    expect(splitNameFallback('Jane Smith', 'given_first')).toEqual({
      givenName: 'Jane',
      familyName: 'Smith',
      lossy: true
    });
    expect(splitNameFallback('Ana María García', 'given_first')).toEqual({
      givenName: 'Ana María',
      familyName: 'García',
      lossy: true
    });
  });

  it('splits on the first space for family_first', () => {
    expect(splitNameFallback('Nguyễn Văn A', 'family_first')).toEqual({
      givenName: 'Văn A',
      familyName: 'Nguyễn',
      lossy: true
    });
  });

  it('puts a single token in the given name', () => {
    expect(splitNameFallback('Madonna', 'given_first')).toEqual({
      givenName: 'Madonna',
      familyName: '',
      lossy: true
    });
    expect(splitNameFallback('  ', 'family_first')).toEqual({
      givenName: '',
      familyName: '',
      lossy: true
    });
  });

  it('always carries the lossy marker and normalizes whitespace', () => {
    const result = splitNameFallback('  Jane   Smith ', 'given_first');
    expect(result.lossy).toBe(true);
    expect(result).toEqual({ givenName: 'Jane', familyName: 'Smith', lossy: true });
  });

  it('round-trips the composed cases', () => {
    const cases: [string, string, 'given_first' | 'family_first'][] = [
      ['Jane', 'Smith', 'given_first'],
      ['Văn A', 'Nguyễn', 'family_first'],
      ['太郎', '山田', 'family_first']
    ];
    for (const [givenName, familyName, order] of cases) {
      const composed = composeRecipient({ givenName, familyName }, order);
      expect(splitNameFallback(composed, order)).toEqual({ givenName, familyName, lossy: true });
    }
  });
});

describe('normalizeNameParts', () => {
  const previous: AddressRow = {
    recipient: 'Jane Smith',
    given_name: 'Jane',
    family_name: 'Smith',
    telephone: '+1 650 253 0000',
    country: 'US'
  };

  it('composes the recipient from parts when it is absent', () => {
    const out = normalizeNameParts(
      { given_name: 'Văn A', family_name: 'Nguyễn', country: 'VN' },
      { nameFormat: 'single', nameOrder: 'family_first' }
    );
    expect(out.recipient).toBe('Nguyễn Văn A');
    expect(
      normalizeNameParts(
        { given_name: 'Jane', family_name: 'Smith', recipient: '' },
        { nameFormat: 'split', nameOrder: 'given_first' }
      ).recipient
    ).toBe('Jane Smith');
  });

  it('keeps a recipient sent alone and invents no parts', () => {
    for (const nameFormat of ['single', 'split'] as const) {
      const out = normalizeNameParts(
        { recipient: 'Jane Smith', country: 'US' },
        { nameFormat, nameOrder: 'given_first' }
      );
      expect(out).toEqual({ recipient: 'Jane Smith', country: 'US' });
      expect('given_name' in out).toBe(false);
      expect('family_name' in out).toBe(false);
    }
  });

  it('keeps both when both are sent in single mode', () => {
    const out = normalizeNameParts(
      { recipient: 'J. Smith', given_name: 'Jane', family_name: 'Smith' },
      { nameFormat: 'single', nameOrder: 'given_first' }
    );
    expect(out).toEqual({ recipient: 'J. Smith', given_name: 'Jane', family_name: 'Smith' });
  });

  it('always recomposes the recipient from sent parts in split mode', () => {
    const out = normalizeNameParts(
      { recipient: 'J. Smith', given_name: 'Jane', family_name: 'Smith' },
      { nameFormat: 'split', nameOrder: 'given_first' }
    );
    expect(out.recipient).toBe('Jane Smith');
  });

  it('recomposes with the stored part when only one part is sent on update', () => {
    const out = normalizeNameParts(
      { family_name: 'Doe' },
      { nameFormat: 'split', nameOrder: 'given_first', previous }
    );
    expect(out).toEqual({ family_name: 'Doe', recipient: 'Jane Doe' });
  });

  it('clears the parts when the recipient is edited directly in single mode', () => {
    const out = normalizeNameParts(
      { recipient: 'Janet Smith' },
      { nameFormat: 'single', nameOrder: 'given_first', previous }
    );
    expect(out).toEqual({ recipient: 'Janet Smith', given_name: null, family_name: null });
  });

  it('leaves the parts alone when the recipient is unchanged or not sent', () => {
    expect(
      normalizeNameParts(
        { recipient: ' Jane Smith ' },
        { nameFormat: 'single', nameOrder: 'given_first', previous }
      )
    ).toEqual({ recipient: ' Jane Smith ' });
    expect(
      normalizeNameParts(
        { telephone: '+1 650 253 0001' },
        { nameFormat: 'single', nameOrder: 'given_first', previous }
      )
    ).toEqual({ telephone: '+1 650 253 0001' });
  });

  it('does not clear parts on create or when parts travel with the recipient', () => {
    expect(
      normalizeNameParts({ recipient: 'Jane Smith' }, { nameFormat: 'single', nameOrder: 'given_first' })
    ).toEqual({ recipient: 'Jane Smith' });
    expect(
      normalizeNameParts(
        { recipient: 'Janet Smith', given_name: 'Janet', family_name: 'Smith' },
        { nameFormat: 'single', nameOrder: 'given_first', previous }
      )
    ).toEqual({ recipient: 'Janet Smith', given_name: 'Janet', family_name: 'Smith' });
  });

  it('returns a new object and leaves the input untouched', () => {
    const input: AddressRow = { given_name: 'Jane', family_name: 'Smith' };
    const out = normalizeNameParts(input, { nameFormat: 'split', nameOrder: 'given_first' });
    expect(out).not.toBe(input);
    expect(input).toEqual({ given_name: 'Jane', family_name: 'Smith' });
    expect(out.recipient).toBe('Jane Smith');
  });
});
