import { describe, it, expect } from '@jest/globals';
import { createHash } from 'crypto';
import { sanitizeRawHtml } from '../../../../../lib/util/sanitizeHtml.js';
import { descriptionToRows } from '../../../services/cells/description.js';
import type { EditorRow } from '../../../services/cells/description.js';

const NOW = 1_760_000_000_000;
const deps = {
  now: NOW,
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex')
};

const convert = (text: string): EditorRow[] => {
  const rows = descriptionToRows(text, deps);
  if (rows === null) throw new Error('expected rows');
  return rows;
};

const blocksOf = (text: string) => convert(text)[0].columns[0].data.blocks;

describe('descriptionToRows: golden examples (§ 5.7)', () => {
  it('turns one line of plain text into one row, one column, one paragraph', () => {
    // d88ab6ab = the first 8 digits of the SHA-256 of "Soft cotton tee".
    expect(descriptionToRows('Soft cotton tee', deps)).toEqual([
      {
        id: 'rd88ab6ab',
        size: 1,
        className: 'md:grid-cols-1',
        columns: [
          {
            id: 'cd88ab6ab',
            size: 1,
            data: {
              time: NOW,
              version: '2.31.0',
              blocks: [
                {
                  id: 'bd88ab6ab-0',
                  type: 'paragraph',
                  data: { text: 'Soft cotton tee' }
                }
              ]
            }
          }
        ]
      }
    ]);
  });

  it('turns blank-line-separated text into one paragraph block each', () => {
    expect(
      descriptionToRows('First paragraph.\n\nSecond paragraph.', deps)
    ).toEqual([
      {
        id: 'r8b3fc5d6',
        size: 1,
        className: 'md:grid-cols-1',
        columns: [
          {
            id: 'c8b3fc5d6',
            size: 1,
            data: {
              time: NOW,
              version: '2.31.0',
              blocks: [
                {
                  id: 'b8b3fc5d6-0',
                  type: 'paragraph',
                  data: { text: 'First paragraph.' }
                },
                {
                  id: 'b8b3fc5d6-1',
                  type: 'paragraph',
                  data: { text: 'Second paragraph.' }
                }
              ]
            }
          }
        ]
      }
    ]);
  });

  it('turns HTML into one raw block, as it is', () => {
    expect(descriptionToRows('<p>Hello <b>world</b></p>', deps)).toEqual([
      {
        id: 'r41821239',
        size: 1,
        className: 'md:grid-cols-1',
        columns: [
          {
            id: 'c41821239',
            size: 1,
            data: {
              time: NOW,
              version: '2.31.0',
              blocks: [
                {
                  id: 'b41821239-0',
                  type: 'raw',
                  data: { html: '<p>Hello <b>world</b></p>' }
                }
              ]
            }
          }
        ]
      }
    ]);
  });

  it('turns a single line break inside a paragraph into <br>', () => {
    expect(blocksOf('Line one\nLine two')).toEqual([
      {
        id: 'b6991ce0a-0',
        type: 'paragraph',
        data: { text: 'Line one<br>Line two' }
      }
    ]);
  });
});

describe('descriptionToRows: plain text', () => {
  const paragraphs = (text: string) =>
    blocksOf(text).map((block) => (block.data as { text: string }).text);

  it('escapes & < > because the storefront renders a paragraph as HTML', () => {
    expect(paragraphs('Tom & Jerry')).toEqual(['Tom &amp; Jerry']);
    expect(paragraphs('A <b C')).toEqual(['A &lt;b C']);
    expect(paragraphs('a < b and c > d')).toEqual(['a &lt; b and c &gt; d']);
    expect(paragraphs('5 > 3 & 2 < 4')).toEqual(['5 &gt; 3 &amp; 2 &lt; 4']);
  });

  it('does not escape a quote, and does not escape twice', () => {
    expect(paragraphs('He said "hi" & left')).toEqual([
      'He said "hi" &amp; left'
    ]);
    expect(paragraphs('&amp;')).toEqual(['&amp;amp;']);
  });

  it.each([
    ['CRLF', 'One\r\n\r\nTwo\r\nthree'],
    ['CR', 'One\r\rTwo\rthree'],
    ['LF', 'One\n\nTwo\nthree'],
    ['mixed', 'One\r\n\nTwo\nthree']
  ])('reads %s line breaks the same way', (_name, text) => {
    expect(paragraphs(text)).toEqual(['One', 'Two<br>three']);
  });

  it('reads two or more blank lines, and lines with only spaces, as one separator', () => {
    expect(paragraphs('One\n\n\n\nTwo')).toEqual(['One', 'Two']);
    expect(paragraphs('One\n \t \nTwo')).toEqual(['One', 'Two']);
    expect(paragraphs('One\n\n  \n\nTwo')).toEqual(['One', 'Two']);
  });

  it('trims every line, and keeps the order of the lines', () => {
    expect(paragraphs('  One  \n   Two\t\n\n  Three ')).toEqual([
      'One<br>Two',
      'Three'
    ]);
  });

  it('keeps non-Latin text and emoji', () => {
    expect(paragraphs('Áo thun nam\n\n日本語 👕')).toEqual([
      'Áo thun nam',
      '日本語 👕'
    ]);
  });

  it('numbers the blocks in order, with the same prefix', () => {
    const blocks = blocksOf('a\n\nb\n\nc');
    const h = blocks[0].id.split('-')[0];
    expect(blocks.map((block) => block.id)).toEqual([
      `${h}-0`,
      `${h}-1`,
      `${h}-2`
    ]);
  });
});

describe('descriptionToRows: HTML', () => {
  it.each([
    ['<p>Soft</p>'],
    ['<br>'],
    ['Line one<br>Line two'],
    ['<h1>Title</h1>\n<ul><li>a</li></ul>'],
    ['text <a href="https://example.com/?a=1&b=2">link</a> text'],
    ['<IMG SRC="x.png">'],
    ['<my-element>x</my-element>'],
    ['</p>']
  ])('takes %j for HTML: one raw block, with the text as it is', (text) => {
    const blocks = blocksOf(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'raw', data: { html: text } });
  });

  it.each([
    ['a < b and c > d'],
    ['x<y'],
    ['1 <2'],
    ['<>'],
    ['< p >'],
    ['<3 you >'],
    ['Price > 5']
  ])('takes %j for plain text, not for HTML', (text) => {
    expect(blocksOf(text)[0].type).toBe('paragraph');
  });

  it('keeps the line breaks of HTML as they are', () => {
    expect(blocksOf('<p>a</p>\r\n\r\n<p>b</p>')[0]).toMatchObject({
      data: { html: '<p>a</p>\r\n\r\n<p>b</p>' }
    });
  });

  it('is cleaned by the service afterwards: the output has the shape sanitizeRawHtml walks', () => {
    const rows = convert(
      '<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(2)>'
    );
    sanitizeRawHtml(rows as never);
    const html = (rows[0].columns[0].data.blocks[0].data as { html: string })
      .html;
    expect(html).toContain('<p>Hi</p>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });
});

describe('descriptionToRows: blank, ids and time', () => {
  it.each([[''], ['   '], ['\n\n'], ['\t \r\n']])(
    'gives null for the blank text %j: not provided',
    (text) => {
      expect(descriptionToRows(text, deps)).toBeNull();
    }
  );

  it('gives the same value for the same text, and other ids for other text', () => {
    expect(convert('Same text')).toEqual(convert('Same text'));
    expect(convert('Same text')[0].id).not.toBe(convert('Other text')[0].id);
  });

  it('writes the time it was given', () => {
    const rows = descriptionToRows('x', { ...deps, now: 42 });
    expect(rows?.[0].columns[0].data.time).toBe(42);
  });

  it('builds the ids from the first 8 hex digits of the hash it is given', () => {
    const rows = descriptionToRows('x', {
      now: 1,
      sha256Hex: () => 'abcdef0123456789'
    });
    expect(rows?.[0].id).toBe('rabcdef01');
    expect(rows?.[0].columns[0].id).toBe('cabcdef01');
    expect(rows?.[0].columns[0].data.blocks[0].id).toBe('babcdef01-0');
  });

  it('always gives one row with one column and at least one block, with unique ids', () => {
    const pieces = [
      'a',
      ' ',
      '\n',
      '\r\n',
      '<b>',
      '</p>',
      '&',
      '<',
      '>',
      '|',
      '日'
    ];
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let i = 0; i < 500; i += 1) {
      let text = '';
      const length = next() % 30;
      for (let j = 0; j < length; j += 1) {
        text += pieces[next() % pieces.length];
      }
      const rows = descriptionToRows(text, deps);
      if (text.trim() === '') {
        expect(rows).toBeNull();
      } else {
        expect(rows).toHaveLength(1);
        expect(rows?.[0].columns).toHaveLength(1);
        const ids = rows![0].columns[0].data.blocks.map((block) => block.id);
        expect(ids.length).toBeGreaterThan(0);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('stays fast on a cell of many "<a " and no ">"', () => {
    const start = Date.now();
    expect(blocksOf('<a '.repeat(21_845))[0].type).toBe('paragraph');
    expect(Date.now() - start).toBeLessThan(200);
  });
});
