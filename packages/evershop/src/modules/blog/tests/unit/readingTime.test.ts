import { readingTime } from '../../services/readingTime.js';

/** Build an Editor.js document (rows → columns → blocks) from a block list. */
function doc(blocks: Array<Record<string, unknown>>) {
  return [
    { id: 'r1', size: 1, columns: [{ id: 'c1', size: 1, data: { blocks } }] }
  ];
}

/** `n` space-separated word tokens. */
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
}

describe('readingTime', () => {
  it('returns 1 for empty / null / invalid content', () => {
    expect(readingTime([])).toBe(1);
    expect(readingTime(null)).toBe(1);
    expect(readingTime(undefined)).toBe(1);
    expect(readingTime('not json')).toBe(1);
  });

  it('counts words at the configured WPM (400 words @ 200wpm = 2 min)', () => {
    const d = doc([{ type: 'paragraph', data: { text: words(400) } }]);
    expect(readingTime(d, { wpm: 200 })).toBe(2);
  });

  it('parses a JSON string identically to an array (200 words = 1 min)', () => {
    const d = doc([{ type: 'header', data: { text: words(200) } }]);
    expect(readingTime(JSON.stringify(d), { wpm: 200 })).toBe(1);
  });

  it('attributes decaying seconds to images (10+9+8 = 27s → 1 min)', () => {
    const d = doc([{ type: 'image' }, { type: 'image' }, { type: 'image' }]);
    expect(readingTime(d)).toBe(1);
  });

  it('counts productList blocks as nominal scan time (5 × 12 = 60 words → 1 min)', () => {
    const d = doc([
      { type: 'productList', data: { products: new Array(5).fill({}) } }
    ]);
    expect(readingTime(d, { wpm: 200 })).toBe(1);
  });

  it('combines words and images (600 words = 180s + 19s images → 4 min)', () => {
    const d = doc([
      { type: 'paragraph', data: { text: words(600) } },
      { type: 'image' },
      { type: 'image' }
    ]);
    expect(readingTime(d, { wpm: 200 })).toBe(4);
  });

  it('handles list items in both string and object form (200 words → 1 min)', () => {
    const d = doc([
      { type: 'list', data: { items: [words(100), { content: words(100) }] } }
    ]);
    expect(readingTime(d, { wpm: 200 })).toBe(1);
  });

  it('strips HTML before counting', () => {
    const d = doc([
      { type: 'paragraph', data: { text: `<b>${words(200)}</b>` } }
    ]);
    expect(readingTime(d, { wpm: 200 })).toBe(1);
  });
});
