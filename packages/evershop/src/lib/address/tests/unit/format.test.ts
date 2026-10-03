import { describe, it, expect } from '@jest/globals';
import { formatAddress } from '../../format.js';

/**
 * `formatAddress` is pure: display strings in, lines out. Fixtures follow the
 * Google records for US, DE, JP, HK and BR.
 */

const US_FMT = '%N%n%O%n%A%n%C, %S %Z';
const US = {
  N: 'Jane Smith',
  A: ['1 Main St'],
  C: 'Mountain View',
  S: 'California',
  Z: '94043',
  country: 'United States'
};

describe('formatAddress — US', () => {
  it('renders the reference example', () => {
    expect(formatAddress(US, US_FMT)).toEqual([
      'Jane Smith',
      '1 Main St',
      'Mountain View, California 94043',
      'United States'
    ]);
  });

  it('drops the comma with a missing state', () => {
    const { S: _s, ...noState } = US;
    expect(formatAddress(noState, US_FMT)[2]).toBe('Mountain View 94043');
  });

  it('drops the trailing space with a missing postal code', () => {
    expect(formatAddress({ ...US, Z: '' }, US_FMT)[2]).toBe(
      'Mountain View, California'
    );
  });

  it('drops the leading separator with a missing city', () => {
    expect(formatAddress({ ...US, C: null }, US_FMT)[2]).toBe('California 94043');
  });

  it('keeps a single value from a line whose other tokens are empty', () => {
    expect(formatAddress({ Z: '94043' }, US_FMT)).toEqual(['94043']);
    expect(formatAddress({ S: 'California' }, US_FMT)).toEqual(['California']);
  });

  it('renders the organization line when present', () => {
    expect(formatAddress({ ...US, O: 'ACME Inc.' }, US_FMT)[1]).toBe('ACME Inc.');
  });

  it('spreads an array A over several lines', () => {
    expect(formatAddress({ ...US, A: ['1 Main St', 'Suite 200', ''] }, US_FMT)).toEqual([
      'Jane Smith',
      '1 Main St',
      'Suite 200',
      'Mountain View, California 94043',
      'United States'
    ]);
  });

  it('omits the country when includeCountry is false', () => {
    expect(formatAddress(US, US_FMT, { includeCountry: false })).toEqual([
      'Jane Smith',
      '1 Main St',
      'Mountain View, California 94043'
    ]);
  });

  it('omits the country line when there is no country', () => {
    const { country: _c, ...noCountry } = US;
    expect(formatAddress(noCountry, US_FMT)).toHaveLength(3);
  });
});

describe('formatAddress — other layouts', () => {
  it('DE: postal code before the city on one row', () => {
    expect(
      formatAddress(
        { N: 'Max Mustermann', A: ['Unter den Linden 1'], C: 'Berlin', Z: '10115', country: 'Germany' },
        '%N%n%O%n%A%n%Z %C'
      )
    ).toEqual(['Max Mustermann', 'Unter den Linden 1', '10115 Berlin', 'Germany']);
    expect(formatAddress({ C: 'Berlin' }, '%Z %C')).toEqual(['Berlin']);
    expect(formatAddress({ Z: '10115' }, '%Z %C')).toEqual(['10115']);
  });

  it('JP native: postcode first with the 〒 prefix, which vanishes with the code', () => {
    const fmt = '〒%Z%n%S%n%A%n%O%n%N';
    expect(
      formatAddress(
        { N: '山田 太郎', A: ['世田谷区 1-2-3'], S: '東京都', Z: '154-0023', country: '日本' },
        fmt
      )
    ).toEqual(['〒154-0023', '東京都', '世田谷区 1-2-3', '山田 太郎', '日本']);
    expect(formatAddress({ N: '山田 太郎', S: '東京都' }, fmt)).toEqual(['東京都', '山田 太郎']);
  });

  it('JP latin: A shares a row with S, so the last address line carries the prefecture', () => {
    expect(
      formatAddress(
        { N: 'Taro Yamada', A: ['1-2-3 Setagaya', 'Apt 5'], S: 'Tokyo', Z: '154-0023', country: 'Japan' },
        '%N%n%O%n%A, %S%n%Z'
      )
    ).toEqual(['Taro Yamada', '1-2-3 Setagaya', 'Apt 5, Tokyo', '154-0023', 'Japan']);
  });

  it('HK native: one token per line, S first', () => {
    expect(
      formatAddress(
        { N: '陳大文', A: ['彌敦道1號'], C: '油尖旺', S: '九龍', country: '香港' },
        '%S%n%C%n%A%n%O%n%N'
      )
    ).toEqual(['九龍', '油尖旺', '彌敦道1號', '陳大文', '香港']);
  });

  it('BR: the hyphen between city and state goes with a missing state', () => {
    expect(formatAddress({ C: 'Rio de Janeiro', S: 'RJ' }, '%C-%S')).toEqual([
      'Rio de Janeiro-RJ'
    ]);
    expect(formatAddress({ C: 'Rio de Janeiro' }, '%C-%S')).toEqual(['Rio de Janeiro']);
  });

  it('MX: a missing postal code leaves the city and state', () => {
    expect(formatAddress({ C: 'Guadalajara', S: 'Jalisco' }, '%Z %C, %S')).toEqual([
      'Guadalajara, Jalisco'
    ]);
  });
});

describe('formatAddress — cleanup', () => {
  it('returns nothing for empty values', () => {
    expect(formatAddress({}, US_FMT)).toEqual([]);
    expect(formatAddress({ N: '  ', A: ['', '  '], country: '' }, US_FMT)).toEqual([]);
  });

  it('removes unknown tokens with their separator', () => {
    expect(formatAddress({ N: 'Jane' }, '%N, %Q')).toEqual(['Jane']);
    expect(formatAddress({ N: 'Jane' }, '%Q%n%N')).toEqual(['Jane']);
  });

  it('keeps a literal percent sign', () => {
    expect(formatAddress({ N: 'Jane' }, '100% %N')).toEqual(['100% Jane']);
  });

  it('collapses whitespace runs and trims', () => {
    expect(formatAddress({ N: '  Jane   Smith ', C: ' Mountain  View ', Z: '94043' }, US_FMT)).toEqual([
      'Jane Smith',
      'Mountain View 94043'
    ]);
  });

  it('collapses separators doubled by a value', () => {
    expect(formatAddress({ C: 'Mountain View,', S: 'California', Z: '94043' }, US_FMT)).toEqual([
      'Mountain View, California 94043'
    ]);
  });

  it('strips separator debris at the ends of a line', () => {
    expect(formatAddress({ C: 'Paris' }, ', %C -')).toEqual(['Paris']);
    expect(formatAddress({ C: 'Paris', S: 'IDF' }, '%C / %S')).toEqual(['Paris / IDF']);
    expect(formatAddress({ C: 'Paris' }, '%C / %S')).toEqual(['Paris']);
  });

  it('never touches hyphens inside a value', () => {
    expect(formatAddress({ C: 'Winston-Salem', S: 'NC', Z: '27101-1234' }, '%C, %S %Z')).toEqual([
      'Winston-Salem, NC 27101-1234'
    ]);
  });

  it('tolerates a missing values map or format without throwing', () => {
    expect(formatAddress(undefined as never, US_FMT)).toEqual([]);
    expect(formatAddress({ N: 'Jane', country: 'France' }, undefined as never)).toEqual(['France']);
  });
});
