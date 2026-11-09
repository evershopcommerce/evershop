import { describe, it, expect } from '@jest/globals';
import { csvCell, csvLine } from '../../../services/report/csvWrite.js';
import { readAll } from '../helpers/readAll.js';

describe('csvCell', () => {
  it.each([
    ['', ''],
    ['plain', 'plain'],
    [' padded ', ' padded '],
    ['-5', '-5'],
    ['=1+1', '=1+1'],
    ['é ü 日本', 'é ü 日本'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['two\nlines', '"two\nlines"'],
    ['carriage\rreturn', '"carriage\rreturn"'],
    ['"', '""""']
  ])('writes %j as %j', (text, written) => {
    expect(csvCell(text)).toBe(written);
  });
});

describe('csvLine', () => {
  it('joins the cells with commas and ends with CRLF', () => {
    expect(csvLine(['a', 'b,c', ''])).toBe('a,"b,c",\r\n');
  });

  it('writes a row of one empty cell as an empty line', () => {
    expect(csvLine([''])).toBe('\r\n');
  });
});

describe('csvLine and the reader agree', () => {
  it('reads back the text that went in, whatever it holds', async () => {
    let seed = 20261018;
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const alphabet = ['a', 'Z', '1', ',', '"', '\n', '\r', ' ', 'é', '=', '-'];
    const text = () =>
      Array.from(
        { length: next(8) },
        () => alphabet[next(alphabet.length)]
      ).join('');
    // The first cell of every row is not empty: a row of only empty cells is a blank line.
    const rows = Array.from({ length: 200 }, () => [
      `x${text()}`,
      text(),
      text()
    ]);
    const file = csvLine(['one', 'two', 'three']) + rows.map(csvLine).join('');
    const read = await readAll(file);
    expect(read.issues).toEqual([]);
    expect(read.rows.map((row) => row.cells)).toEqual(rows);
  });
});
