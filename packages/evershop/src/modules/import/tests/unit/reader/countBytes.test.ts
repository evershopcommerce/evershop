import { Readable } from 'stream';
import { describe, expect, it } from '@jest/globals';
import { countBytes } from '../../../services/reader/countBytes.js';
import { readCsv } from '../../../services/reader/readCsv.js';

/**
 * The byte counter of the check's progress: it counts what passes, changes
 * nothing, and ends and fails as its source does.
 */
const collect = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

describe('countBytes', () => {
  it('passes the bytes on unchanged and counts them as they are taken', async () => {
    const totals: number[] = [];
    const source = Readable.from([
      Buffer.from('abc'),
      Buffer.from('defgh'),
      Buffer.from('i')
    ]);
    const out = await collect(countBytes(source, (t) => totals.push(t)));
    expect(out.toString()).toBe('abcdefghi');
    expect(totals[totals.length - 1]).toBe(9);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    expect(new Set(totals).size).toBe(totals.length);
  });

  it('counts bytes and not characters', async () => {
    let total = 0;
    const text = 'Nguyễn Thị Lan, 田中 愛子';
    await collect(
      countBytes(Readable.from([Buffer.from(text)]), (t) => {
        total = t;
      })
    );
    expect(total).toBe(Buffer.byteLength(text));
    expect(total).toBeGreaterThan(text.length);
  });

  it('counts a source that gives text', async () => {
    let total = 0;
    // A source that has been given an encoding hands out strings, not buffers.
    const source = Readable.from([Buffer.from('é'), Buffer.from('ab')]);
    source.setEncoding('utf8');
    const out = await collect(
      countBytes(source, (t) => {
        total = t;
      })
    );
    expect(out.toString()).toBe('éab');
    expect(total).toBe(4);
  });

  it('counts nothing for an empty source and ends', async () => {
    const calls: number[] = [];
    const out = await collect(
      countBytes(Readable.from([]), (t) => calls.push(t))
    );
    expect(out.length).toBe(0);
    expect(calls).toEqual([]);
  });

  it('fails when the source fails', async () => {
    async function* broken() {
      yield Buffer.from('abc');
      throw new Error('the connection dropped');
    }
    await expect(
      collect(countBytes(Readable.from(broken()), () => undefined))
    ).rejects.toThrow('the connection dropped');
  });

  it('reads a CSV file as the file itself, whatever the chunks', async () => {
    const text = 'a,b\n1,2\n3,"4,5"\n';
    const bytes = Buffer.from(text);
    for (const size of [1, 3, bytes.length]) {
      const chunks = Array.from(
        { length: Math.ceil(bytes.length / size) },
        (_, i) => bytes.subarray(i * size, (i + 1) * size)
      );
      let total = 0;
      const rows: string[][] = [];
      // eslint-disable-next-line no-await-in-loop
      for await (const event of readCsv(
        countBytes(Readable.from(chunks), (t) => {
          total = t;
        })
      )) {
        if (event.type === 'row') rows.push(event.row.cells);
      }
      expect(rows).toEqual([
        ['1', '2'],
        ['3', '4,5']
      ]);
      expect(total).toBe(bytes.length);
    }
  });
});
