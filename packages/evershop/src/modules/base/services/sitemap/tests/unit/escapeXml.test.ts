import { escapeXml } from '../../render/escapeXml.js';

describe('escapeXml', () => {
  it.each([
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['&', '&amp;'],
    ["'", '&apos;'],
    ['"', '&quot;']
  ])('escapes %p', (input, expected) => {
    expect(escapeXml(input)).toBe(expected);
  });

  it('escapes a combined string', () => {
    expect(escapeXml(`a<b>c&d'e"f`)).toBe('a&lt;b&gt;c&amp;d&apos;e&quot;f');
  });

  it('coerces null / undefined / number', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
    expect(escapeXml(42)).toBe('42');
  });
});
