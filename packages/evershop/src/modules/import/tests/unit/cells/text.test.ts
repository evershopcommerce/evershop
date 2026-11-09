import { describe, it, expect } from '@jest/globals';
import {
  escapeHtmlTags,
  isEscapeExempt,
  prepareText
} from '../../../services/cells/text.js';
import type { ImportEntity } from '../../../services/types.js';

describe('escapeHtmlTags (D-23): what REST escapes, and nothing else', () => {
  it.each([
    ['<b>bold</b>', '&lt;b&gt;bold&lt;/b&gt;'],
    [
      '<a href="x?a=1&b=2">link</a>',
      '&lt;a href="x?a=1&b=2"&gt;link&lt;/a&gt;'
    ],
    ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['<IMG src=x onerror=alert(1)>', '&lt;IMG src=x onerror=alert(1)&gt;'],
    ['A <b> C', 'A &lt;b&gt; C'],
    ['<p\nclass="a">x</p>', '&lt;p\nclass="a"&gt;x&lt;/p&gt;']
  ])('escapes the tags in %j', (input, expected) => {
    expect(escapeHtmlTags(input)).toBe(expected);
  });

  it.each([
    ['Tom & Jerry'],
    ['a < b and c > d'],
    ['x<y'],
    ['5 > 3'],
    ['"quoted" and \'single\''],
    ['<h1>a tag name with a digit is not matched by REST either</h1>'],
    ['<br/>'],
    ['<>'],
    ['< b >'],
    ['']
  ])('leaves %j alone', (input) => {
    expect(escapeHtmlTags(input)).toBe(input);
  });

  it('escapes every tag, also next to text that is not a tag', () => {
    expect(escapeHtmlTags('1 < 2 <i>and</i> 3 > 2')).toBe(
      '1 < 2 &lt;i&gt;and&lt;/i&gt; 3 > 2'
    );
  });

  it('stays fast on a cell of many "<a " and no ">" (the plain expression takes 0.7 s)', () => {
    const cell = '<a '.repeat(21_845);
    const start = Date.now();
    expect(escapeHtmlTags(cell)).toBe(cell);
    expect(escapeHtmlTags(`>${cell}`)).toBe(`>${cell}`);
    expect(Date.now() - start).toBeLessThan(200);
  });
});

describe('isEscapeExempt (ALL-22)', () => {
  it.each<[ImportEntity, string, boolean]>([
    ['product', 'description', true],
    ['category', 'description', true],
    ['product', 'metafield:custom.material', true],
    ['category', 'metafield:custom.banner', true],
    ['customer', 'metafield:custom.vip', true],
    ['customer', 'password', true],
    ['customer', 'password_hash', true],
    ['product', 'short_description', false],
    ['product', 'name', false],
    ['product', 'meta_description', false],
    ['product', 'attr:color', false],
    ['product', 'redirect_from', false],
    ['category', 'meta_description', false],
    ['customer', 'full_name', false],
    ['customer', 'description', false],
    ['customerAddress', 'address_line_1', false],
    ['customerAddress', 'extra', false],
    ['product', 'password', false]
  ])('%s / %s: %s', (entity, column, exempt) => {
    expect(isEscapeExempt(entity, column)).toBe(exempt);
  });
});

describe('prepareText (§ 5.1)', () => {
  it('trims a cell', () => {
    expect(prepareText('  Blue tee \t', 'product', 'name')).toBe('Blue tee');
  });

  it.each([[''], ['   '], ['\t\n'], [' ']])(
    'gives null for the blank cell %j: not provided',
    (cell) => {
      expect(prepareText(cell, 'product', 'name')).toBeNull();
      expect(prepareText(cell, 'product', 'description')).toBeNull();
    }
  );

  it('escapes a cell, after trimming', () => {
    expect(prepareText(' <b>Sale</b> ', 'product', 'name')).toBe(
      '&lt;b&gt;Sale&lt;/b&gt;'
    );
    expect(prepareText('<i>x</i>', 'product', 'short_description')).toBe(
      '&lt;i&gt;x&lt;/i&gt;'
    );
  });

  it('does not escape an exempt column', () => {
    expect(prepareText('<p>Soft</p>', 'product', 'description')).toBe(
      '<p>Soft</p>'
    );
    expect(prepareText('<p>x</p>', 'category', 'metafield:custom.note')).toBe(
      '<p>x</p>'
    );
    expect(prepareText('a<b>c', 'customer', 'password')).toBe('a<b>c');
  });

  it('keeps the spaces of a password and trims everything else', () => {
    expect(prepareText('  secret  ', 'customer', 'password')).toBe(
      '  secret  '
    );
    expect(prepareText('  $2a$10$x  ', 'customer', 'password_hash')).toBe(
      '$2a$10$x'
    );
  });

  it('treats a password of only spaces as a value, and an empty one as blank', () => {
    expect(prepareText('      ', 'customer', 'password')).toBe('      ');
    expect(prepareText('', 'customer', 'password')).toBeNull();
  });
});
