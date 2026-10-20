import { describe, it, expect } from '@jest/globals';
import bcrypt from 'bcryptjs';
import {
  cellIssue,
  MAX_POSITION,
  MAX_QTY,
  parseBcryptHash,
  parseBoolean,
  parseColor,
  parseDate,
  parseDecimal,
  parseHttpUrl,
  parseJson,
  parseList,
  parseRedirectPath,
  parseWholeNumber
} from '../../../services/cells/parsers.js';
import type { CellResult } from '../../../services/cells/parsers.js';

const value = <T>(result: CellResult<T>): T => {
  if (!result.ok) {
    throw new Error(`Expected a value, got: ${result.problem}`);
  }
  return result.value;
};

const reason = (result: CellResult<unknown>): unknown => {
  if (result.ok) {
    throw new Error(`Expected a failure, got: ${JSON.stringify(result.value)}`);
  }
  return result.params.reason;
};

describe('parseBoolean (ALL-10)', () => {
  it.each<[string, 0 | 1]>([
    ['1', 1],
    ['0', 0],
    ['true', 1],
    ['false', 0],
    ['TRUE', 1],
    ['False', 0],
    ['tRuE', 1]
  ])('reads %s as %s', (text, expected) => {
    expect(value(parseBoolean(text))).toBe(expected);
  });

  it.each([
    ['yes'],
    ['no'],
    ['2'],
    ['-1'],
    ['01'],
    ['t'],
    ['on'],
    ['1.0'],
    [' 1']
  ])('refuses %j', (text) => {
    const result = parseBoolean(text);
    expect(result.ok).toBe(false);
    expect(reason(result)).toBe('not_boolean');
  });

  it('gives a number, never a string: no_shipping_required is read by truthiness', () => {
    expect(typeof value(parseBoolean('0'))).toBe('number');
  });
});

describe('parseWholeNumber (ALL-20)', () => {
  it.each([
    ['0', '0'],
    ['7', '7'],
    ['007', '7'],
    ['000', '0'],
    [String(MAX_QTY), String(MAX_QTY)],
    ['0'.repeat(400) + '5', '5']
  ])('reads %s as the string %s', (text, expected) => {
    expect(value(parseWholeNumber(text, MAX_QTY))).toBe(expected);
  });

  it('keeps to the maximum of the column', () => {
    expect(value(parseWholeNumber('32767', MAX_POSITION))).toBe('32767');
    const over = parseWholeNumber('32768', MAX_POSITION);
    expect(reason(over)).toBe('out_of_range');
    expect(over).toMatchObject({
      code: 'INVALID_VALUE',
      params: { reason: 'out_of_range', min: 0, max: 32767 }
    });
    expect(reason(parseWholeNumber(String(MAX_QTY + 1), MAX_QTY))).toBe(
      'out_of_range'
    );
    expect(reason(parseWholeNumber('9'.repeat(400), MAX_QTY))).toBe(
      'out_of_range'
    );
  });

  it.each([
    ['-1'],
    ['+1'],
    ['1.5'],
    ['1.0'],
    ['1,000'],
    ['1e3'],
    ['abc'],
    ['１２'],
    ['0x10'],
    [''],
    [' 5']
  ])('refuses %j', (text) => {
    expect(reason(parseWholeNumber(text, MAX_QTY))).toBe('not_whole_number');
  });
});

describe('parseDecimal: price and weight (PRD-04, PRD-05, ALL-20)', () => {
  it.each([
    ['24', '24'],
    ['24.5', '24.5'],
    ['24.50', '24.50'],
    ['0', '0'],
    ['0.99', '0.99'],
    ['007.5', '7.5'],
    ['99999999.99', '99999999.99'],
    ['99999999', '99999999']
  ])('reads %s as the string %s', (text, expected) => {
    expect(value(parseDecimal(text))).toBe(expected);
  });

  it.each([
    ['-1'],
    ['24.999'],
    ['1,200.00'],
    ['.5'],
    ['24.'],
    ['1e3'],
    ['+5'],
    ['24,50'],
    ['abc'],
    ['1 000'],
    ['']
  ])('refuses %j', (text) => {
    expect(reason(parseDecimal(text))).toBe('not_decimal');
  });

  it.each([['100000000'], ['100000000.00'], ['123456789.5'], ['9'.repeat(40)]])(
    'refuses %j as too large for decimal(12,4)',
    (text) => {
      expect(reason(parseDecimal(text))).toBe('out_of_range');
    }
  );

  it('removes leading zeros before it counts the digits', () => {
    expect(value(parseDecimal('0'.repeat(20) + '12.5'))).toBe('12.5');
  });
});

describe('parseDate', () => {
  it.each([
    ['2026-10-17'],
    ['2024-02-29'],
    ['2000-02-29'],
    ['0001-01-01'],
    ['9999-12-31'],
    ['2026-04-30']
  ])('accepts %s', (text) => {
    expect(value(parseDate(text))).toBe(text);
  });

  it.each([
    ['2026-02-30'],
    ['2025-02-29'],
    ['1900-02-29'],
    ['2026-04-31'],
    ['2026-13-01'],
    ['2026-00-10'],
    ['2026-10-00'],
    ['2026-10-32'],
    ['2026-1-1'],
    ['26-10-17'],
    ['2026/10/17'],
    ['17-10-2026'],
    ['2026-10-17T00:00:00Z'],
    ['2026-10-17 '],
    ['today'],
    ['']
  ])('refuses %j', (text) => {
    expect(reason(parseDate(text))).toBe('not_date');
  });
});

describe('parseColor', () => {
  it.each([['#1A2B3C'], ['#1a2b3c'], ['#000000'], ['#fFfFfF']])(
    'accepts %s',
    (text) => {
      expect(value(parseColor(text))).toBe(text);
    }
  );

  it.each([
    ['#FFF'],
    ['1A2B3C'],
    ['#GGGGGG'],
    ['#1A2B3C0'],
    ['red'],
    ['#12345'],
    ['']
  ])('refuses %j', (text) => {
    expect(reason(parseColor(text))).toBe('not_color');
  });
});

describe('parseList', () => {
  it.each([
    ['a|b|c', ['a', 'b', 'c']],
    [' a | b ', ['a', 'b']],
    ['single', ['single']],
    ['a||b', ['a', 'b']],
    ['a|b|', ['a', 'b']],
    ['|a', ['a']],
    ['a| |b', ['a', 'b']],
    ['|', []],
    ['||', []],
    ['red, green|blue', ['red, green', 'blue']],
    ['a|a', ['a', 'a']]
  ])('splits %j into %j', (text, expected) => {
    expect(parseList(text)).toEqual(expected);
  });
});

describe('parseJson (ALL-11, ADR-10)', () => {
  it('reads an object and an array', () => {
    expect(value(parseJson('{"fit":"Relaxed","gsm":180}', 'object'))).toEqual({
      fit: 'Relaxed',
      gsm: 180
    });
    expect(value(parseJson('[{"content":[]}]', 'array'))).toEqual([
      { content: [] }
    ]);
  });

  it('reads any kind of value when it is told to', () => {
    expect(value(parseJson('5', 'any'))).toBe(5);
    expect(value(parseJson('"x"', 'any'))).toBe('x');
    expect(value(parseJson('null', 'any'))).toBeNull();
    expect(value(parseJson('[1]', 'any'))).toEqual([1]);
  });

  it.each([
    ['{"a":'],
    ['{a:1}'],
    ["{'a':1}"],
    ['[1,]'],
    ['not json'],
    ['{"a":1} x'],
    ['']
  ])('refuses %j as INVALID_JSON', (text) => {
    const result = parseJson(text, 'any');
    expect(result).toMatchObject({ ok: false, code: 'INVALID_JSON' });
  });

  it('refuses the wrong kind of value as INVALID_VALUE', () => {
    expect(parseJson('[1]', 'object')).toMatchObject({
      ok: false,
      code: 'INVALID_VALUE',
      params: { reason: 'not_object' }
    });
    expect(parseJson('null', 'object')).toMatchObject({
      params: { reason: 'not_object' }
    });
    expect(parseJson('5', 'object')).toMatchObject({
      params: { reason: 'not_object' }
    });
    expect(parseJson('{"a":1}', 'array')).toMatchObject({
      ok: false,
      code: 'INVALID_VALUE',
      params: { reason: 'not_array' }
    });
  });

  it('drops a key named __proto__, at any depth, so that a merge cannot reach a prototype', () => {
    const top = value(
      parseJson('{"__proto__":{"polluted":true},"a":1}', 'object')
    ) as Record<string, unknown>;
    expect(Object.keys(top)).toEqual(['a']);
    expect(Object.getPrototypeOf(top)).toBe(Object.prototype);
    const nested = value(
      parseJson(
        '{"a":{"__proto__":{"polluted":true},"b":2},"c":[{"__proto__":1}]}',
        'object'
      )
    );
    expect(nested).toEqual({ a: { b: 2 }, c: [{}] });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // A merge of the result changes nothing for other objects.
    const target: Record<string, unknown> = {};
    Object.assign(target, top);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('does not throw on a very deep value (a cell is at most 64 KiB)', () => {
    const deep = '['.repeat(30_000) + ']'.repeat(30_000);
    expect(() => parseJson(deep, 'array')).not.toThrow();
  });
});

describe('parseHttpUrl (IMG-01)', () => {
  it.each([
    ['https://example.com/a.jpg'],
    ['http://example.com/a.jpg'],
    ['HTTPS://Example.com/A.JPG'],
    ['https://example.com:8080/a/b.png?x=1&y=2#top'],
    ['https://cdn.example.com/img/tee%20blue.jpg'],
    ['https://192.0.2.10/a.png'],
    ['https://[2001:db8::1]/a.png']
  ])('accepts %s and gives it back as written', (text) => {
    expect(value(parseHttpUrl(text))).toBe(text);
  });

  it.each([
    ['ftp://example.com/a.jpg'],
    ['//example.com/a.jpg'],
    ['example.com/a.jpg'],
    ['/media/a.jpg'],
    ['file:///etc/passwd'],
    ['javascript:alert(1)'],
    ['data:image/png;base64,AAAA'],
    ['http://'],
    ['https://'],
    ['https:// example.com/a.jpg'],
    ['https://exa mple.com/a.jpg'],
    ['https://example.com/my image.jpg'],
    ['https://example.com/a\nb.jpg'],
    ['https://example.com/a\tb.jpg'],
    ['https://example.com/\u0000'],
    ['https://example.com/a\u007f'],
    ['http:example.com'],
    ['']
  ])('refuses %j', (text) => {
    expect(reason(parseHttpUrl(text))).toBe('not_url');
  });
});

describe('parseRedirectPath (PRD-23)', () => {
  it.each([['/old-product'], ['/a/b/'], ['/Old_Path.html'], ['/a%20b'], ['/']])(
    'accepts %s as written, a trailing slash included',
    (text) => {
      expect(value(parseRedirectPath(text))).toBe(text);
    }
  );

  it.each([
    ['old'],
    ['/a b'],
    ['/a?x=1'],
    ['/a#b'],
    ['/a\tb'],
    ['/a\nb'],
    [''],
    ['http://x.com/a']
  ])('refuses %j', (text) => {
    expect(reason(parseRedirectPath(text))).toBe('not_path');
  });
});

describe('parseBcryptHash (CUS-06)', () => {
  it('accepts hashes made by bcryptjs, at the costs it supports', () => {
    for (const cost of [4, 5, 10]) {
      const hash = bcrypt.hashSync('secret', cost);
      expect(value(parseBcryptHash(hash))).toBe(hash);
    }
  });

  const body = 'a'.repeat(53);
  it.each([
    [`$2a$04$${body}`],
    [`$2b$10$${body}`],
    [`$2y$10$${body}`],
    [`$2y$15$${body}`],
    [`$2a$10$${'./AZaz09'.repeat(6)}${'.'.repeat(5)}`]
  ])('accepts %s', (text) => {
    expect(value(parseBcryptHash(text))).toBe(text);
  });

  it.each([
    [`$2x$10$${body}`],
    [`$2a$03$${body}`],
    [`$2a$32$${body}`],
    // A cost this high would keep the store busy for hours at the first login.
    [`$2a$16$${body}`],
    [`$2y$31$${body}`],
    [`$2a$9$${body}`],
    [`$2a$10$${body.slice(1)}`],
    [`$2a$10$${body}a`],
    [`$2a$10$${body.slice(1)}!`],
    [`$2a$10$ ${body.slice(1)}`],
    ['$P$B1234567890123456789012345678'],
    ['5f4dcc3b5aa765d61d8327deb882cf99'],
    ['secret'],
    ['']
  ])('refuses %j', (text) => {
    expect(reason(parseBcryptHash(text))).toBe('not_bcrypt');
  });
});

describe('cellIssue', () => {
  it('names the row, the column and the cell', () => {
    const failure = parseDecimal('24.999');
    if (failure.ok) throw new Error('expected a failure');
    expect(
      cellIssue(failure, { rowNumber: 7, column: 'price', value: '24.999' })
    ).toEqual({
      code: 'INVALID_VALUE',
      severity: 'error',
      rowNumber: 7,
      column: 'price',
      params: { reason: 'not_decimal' },
      message: expect.stringMatching(
        /^The value in column "price" must be a number/
      ),
      value: '24.999'
    });
  });

  it('keeps the code of the failure', () => {
    const failure = parseJson('{', 'object');
    if (failure.ok) throw new Error('expected a failure');
    expect(
      cellIssue(failure, { rowNumber: 3, column: 'extra', value: '{' })
    ).toMatchObject({ code: 'INVALID_JSON', severity: 'error', rowNumber: 3 });
  });

  it('never carries the value of a password column', () => {
    const failure = parseBcryptHash('secret');
    if (failure.ok) throw new Error('expected a failure');
    const issue = cellIssue(failure, {
      rowNumber: 2,
      column: 'password_hash',
      value: 'secret'
    });
    expect(issue.value).toBeUndefined();
    expect(JSON.stringify(issue)).not.toContain('secret');
  });
});
