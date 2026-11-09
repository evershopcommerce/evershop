import { describe, it, expect } from '@jest/globals';
import { limitBytes, rechunk } from '../../../services/jobs/rechunk.js';

async function* pieces(...list: Array<Uint8Array | string>) {
  for (const piece of list) yield piece;
}

const collect = async (source: AsyncIterable<Buffer>) => {
  const out: Buffer[] = [];
  for await (const chunk of source) out.push(Buffer.from(chunk));
  return out;
};

const bytesOf = (n: number, from = 0) =>
  Buffer.from(Array.from({ length: n }, (_, i) => (from + i) % 251));

describe('rechunk: chunks of exactly the size asked, the last one smaller', () => {
  it('cuts one big piece', async () => {
    const out = await collect(rechunk(pieces(bytesOf(25)), 10));
    expect(out.map((c) => c.length)).toEqual([10, 10, 5]);
    expect(Buffer.concat(out).equals(bytesOf(25))).toBe(true);
  });

  it('joins small pieces', async () => {
    const out = await collect(
      rechunk(
        pieces(bytesOf(3), bytesOf(3, 3), bytesOf(5, 6), bytesOf(1, 11)),
        4
      )
    );
    expect(out.map((c) => c.length)).toEqual([4, 4, 4]);
    expect(Buffer.concat(out).equals(bytesOf(12))).toBe(true);
  });

  it('gives no short chunk when the stream ends on a boundary', async () => {
    const out = await collect(
      rechunk(pieces(bytesOf(10), bytesOf(10, 10)), 10)
    );
    expect(out.map((c) => c.length)).toEqual([10, 10]);
  });

  it('gives a piece of exactly the size as it is, and one byte more as two chunks', async () => {
    expect(
      (await collect(rechunk(pieces(bytesOf(8)), 8))).map((c) => c.length)
    ).toEqual([8]);
    expect(
      (await collect(rechunk(pieces(bytesOf(9)), 8))).map((c) => c.length)
    ).toEqual([8, 1]);
  });

  it('gives no chunk for an empty stream, nor for empty pieces', async () => {
    expect(await collect(rechunk(pieces(), 8))).toEqual([]);
    expect(await collect(rechunk(pieces('', new Uint8Array(0)), 8))).toEqual(
      []
    );
  });

  it('takes text as UTF-8, and keeps a character cut between two chunks', async () => {
    const text = 'é日本語€';
    const out = await collect(rechunk(pieces(text), 3));
    expect(Buffer.concat(out).toString('utf8')).toBe(text);
    expect(out.every((c, n) => n === out.length - 1 || c.length === 3)).toBe(
      true
    );
  });

  it('gives back the same bytes, whatever the pieces are (random cuts)', async () => {
    let seed = 20261018;
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    for (let round = 0; round < 200; round += 1) {
      const whole = bytesOf(next(300));
      const list: Buffer[] = [];
      for (let at = 0; at < whole.length; ) {
        const take = next(40);
        list.push(whole.subarray(at, at + take));
        at += take;
        if (take === 0 && list.length > 1000) break;
      }
      const size = 1 + next(50);
      const out = await collect(rechunk(pieces(...list), size));
      expect(Buffer.concat(out).equals(whole)).toBe(true);
      out.slice(0, -1).forEach((chunk) => expect(chunk.length).toBe(size));
      if (out.length > 0) {
        expect(out[out.length - 1].length).toBeGreaterThan(0);
        expect(out[out.length - 1].length).toBeLessThanOrEqual(size);
      }
    }
  });

  it('holds no more than a chunk and the piece in hand: it reads on only when asked', async () => {
    let pulled = 0;
    async function* many() {
      for (let n = 0; n < 1000; n += 1) {
        pulled += 1;
        yield bytesOf(10);
      }
    }
    const chunks = rechunk(many(), 100);
    await chunks.next();
    // One chunk of 100 bytes is ten pieces of 10: the stream is not read further.
    expect(pulled).toBe(10);
    await chunks.return(undefined);
  });
});

describe('limitBytes: stops a file that is too large as it streams', () => {
  const exceeded = () => new Error('too large');

  it('lets through what is within the limit, up to the last byte', async () => {
    const out = await collect(
      limitBytes(pieces(bytesOf(5), bytesOf(5)), 10, exceeded)
    );
    expect(Buffer.concat(out).length).toBe(10);
  });

  it('throws at the first byte over the limit', async () => {
    await expect(
      collect(limitBytes(pieces(bytesOf(5), bytesOf(6)), 10, exceeded))
    ).rejects.toThrow('too large');
  });

  it('does not read on after the limit', async () => {
    let pulled = 0;
    async function* many() {
      for (let n = 0; n < 1000; n += 1) {
        pulled += 1;
        yield bytesOf(10);
      }
    }
    await expect(collect(limitBytes(many(), 25, exceeded))).rejects.toThrow(
      'too large'
    );
    expect(pulled).toBe(3);
  });

  it('counts the bytes of a text, not its characters', async () => {
    await expect(
      collect(limitBytes(pieces('日本'), 5, exceeded))
    ).rejects.toThrow('too large');
    expect(
      Buffer.concat(await collect(limitBytes(pieces('日'), 3, exceeded))).length
    ).toBe(3);
  });

  it('lets an empty file through', async () => {
    expect(await collect(limitBytes(pieces(), 0, exceeded))).toEqual([]);
  });
});
