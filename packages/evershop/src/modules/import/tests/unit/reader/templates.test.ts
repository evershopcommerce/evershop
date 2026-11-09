import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { chunked, collect, readAll } from '../helpers/readAll.js';

/**
 * The four example files of the specification are the reference for the file
 * format. The expected numbers below come from Python's `csv` module, not from
 * the reader: `records` is the number of rows as a spreadsheet counts them
 * (the header is one), and a product description has line breaks in it, so it
 * differs from the number of lines in the file.
 */
const templates = [
  {
    file: 'categories.csv',
    columns: 10,
    first: 'url_key',
    records: 7,
    lastKey: 'archive'
  },
  {
    file: 'products.csv',
    columns: 31,
    first: 'sku',
    records: 13,
    lastKey: 'GIFT-CARD-50'
  },
  {
    file: 'customers.csv',
    columns: 8,
    first: 'email',
    records: 6,
    lastKey: 'blocked.example@example.com'
  },
  {
    file: 'customer-addresses.csv',
    columns: 17,
    first: 'email',
    records: 8,
    lastKey: 'lan.nguyen@example.com'
  }
];

function load(file: string): Buffer {
  return readFileSync(
    fileURLToPath(new URL(`../../fixtures/${file}`, import.meta.url))
  );
}

describe.each(templates)('the example file $file', (template) => {
  it('is read without a single issue', async () => {
    const result = await readAll(load(template.file));
    expect(result.issues).toEqual([]);
    expect(result.columns).toHaveLength(template.columns);
    expect(result.columns?.[0]).toBe(template.first);
    expect(result.dataRows).toBe(template.records - 1);
    expect(result.rows.every((row) => !row.hasError)).toBe(true);
    for (const row of result.rows) {
      expect(row.cells).toHaveLength(template.columns);
    }
  });

  it('numbers its rows like a spreadsheet', async () => {
    const result = await readAll(load(template.file));
    const last = result.rows[result.rows.length - 1];
    expect(last.rowNumber).toBe(template.records);
    expect(last.cells[0]).toBe(template.lastKey);
    expect(result.rows.map((row) => row.rowNumber)).toEqual(
      Array.from({ length: template.records - 1 }, (_, i) => i + 2)
    );
  });

  it('is read the same when a spreadsheet saves it with CRLF and a byte order mark', async () => {
    const text = load(template.file).toString('utf8');
    const saved = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(text.replace(/\n/g, '\r\n'), 'utf8')
    ]);
    const plain = await collect(chunked(load(template.file)));
    const again = await collect(chunked(saved, 100));
    expect(again.issues).toEqual([]);
    expect(again.columns).toEqual(plain.columns);
    // The line breaks inside quoted cells become CRLF too; compare without them.
    const flat = (rows: { cells: string[] }[]) =>
      rows.map((row) => row.cells.map((cell) => cell.replace(/\r\n/g, '\n')));
    expect(flat(again.rows)).toEqual(flat(plain.rows));
  });
});

describe('the example files: contents', () => {
  it('reads the quoted comma, quote and line break cases of the product file as one cell each', async () => {
    const result = await readAll(load('products.csv'));
    const all = result.rows.flatMap((row) => row.cells);
    expect(all.some((cell) => cell.includes('\n'))).toBe(true);
    expect(all.some((cell) => cell.includes('"'))).toBe(true);
    expect(all.some((cell) => cell.includes(', '))).toBe(true);
  });
});
