import { describe, it, expect } from '@jest/globals';
import { Readable } from 'stream';
import type { StoredIssue } from '../../../services/job/types.js';
import {
  FileWithErrorsError,
  fileWithErrors,
  HIDDEN_CELL
} from '../../../services/report/fileWithErrors.js';
import type { FileWithErrorsArgs } from '../../../services/report/fileWithErrors.js';
import { MORE_NOT_LISTED } from '../../../services/report/errorsCell.js';
import { chunked, collect } from '../helpers/readAll.js';

const BOM = '﻿';

const issue = (
  rowNumber: number | null,
  column: string | null,
  message: string,
  fields: Partial<StoredIssue> = {}
): StoredIssue => ({
  phase: 'validate',
  rowNumber,
  entityKey: null,
  column,
  code: 'INVALID_VALUE',
  severity: 'error',
  params: {},
  message,
  value: null,
  ...fields
});

async function* listed(issues: StoredIssue[]) {
  for (const one of issues) yield one;
}

async function download(
  file: string | Buffer,
  issues: StoredIssue[] = [],
  more: Partial<FileWithErrorsArgs> = {},
  chunkSize?: number
): Promise<string> {
  let text = '';
  for await (const chunk of fileWithErrors({
    entity: 'category',
    source: chunked(file, chunkSize),
    issues: listed(issues),
    ...more
  })) {
    text += chunk;
  }
  return text;
}

describe('fileWithErrors: the shape of the file (§ 7.3)', () => {
  it('gives every row of the file, with an _errors column, a byte order mark and CRLF', async () => {
    const text = await download('sku,name\nA,Alpha\nB,Beta\nC,Gamma\n', [
      issue(2, 'name', 'Name is wrong.'),
      issue(4, null, 'Row is wrong.')
    ]);
    expect(text).toBe(
      `${BOM}sku,name,_errors\r\n` +
        'A,Alpha,name: Name is wrong.\r\n' +
        'B,Beta,\r\n' +
        'C,Gamma,row: Row is wrong.\r\n'
    );
  });

  it('writes the source cells back as they were, and quotes only what needs it', async () => {
    const file =
      'a,b,c,d\n' +
      '-5,=1+1, padded ,@x\n' +
      '"has, comma","say ""hi""","two\nlines","\n"\n';
    const text = await download(file);
    expect(text).toBe(
      `${BOM}a,b,c,d,_errors\r\n` +
        '-5,=1+1, padded ,@x,\r\n' +
        '"has, comma","say ""hi""","two\nlines","\n",\r\n'
    );
  });

  it('gives back, after reading, the same cells as the file had', async () => {
    const file =
      'a,b,c\n' + '"x,1","y ""q""","z\r\nw"\n' + ',,tail\n' + 'é,日本,\n';
    const original = await collect(chunked(file));
    const again = await collect(
      chunked(await download(file, [issue(2, 'a', 'm')]))
    );
    expect(again.columns).toEqual(original.columns);
    expect(again.issues).toEqual([]);
    expect(again.rows.map((r) => [r.rowNumber, r.cells])).toEqual(
      original.rows.map((r) => [r.rowNumber, r.cells])
    );
  });

  it('is the same whatever the chunks of the file are', async () => {
    const file = 'a,b\n"x,1",é\n\n3,"q\nr"\n';
    const issues = [issue(2, 'a', 'one'), issue(5, 'b', 'two')];
    const whole = await download(file, issues);
    for (const size of [1, 2, 3, 5, 64]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await download(file, issues, {}, size)).toBe(whole);
    }
  });

  it('replaces an _errors column that the file had, wherever it was', async () => {
    const text = await download('a,_errors,b\n1,old text,2\n3,,4\n', [
      issue(3, 'b', 'New.')
    ]);
    expect(text).toBe(`${BOM}a,b,_errors\r\n1,2,\r\n3,4,b: New.\r\n`);
  });

  it('puts the problems of a row in the order of the columns of the header', async () => {
    const text = await download('a,b,c\n1,2,3\n', [
      issue(2, 'c', 'C.'),
      issue(2, 'a', 'A.'),
      issue(2, 'b', 'B.')
    ]);
    expect(text).toBe(`${BOM}a,b,c,_errors\r\n1,2,3,a: A. | b: B. | c: C.\r\n`);
  });

  it('writes a header only for a file with a header and no rows', async () => {
    expect(await download('a,b\n')).toBe(`${BOM}a,b,_errors\r\n`);
  });

  it('writes nothing for a file with nothing in it', async () => {
    expect(await download('')).toBe('');
    expect(await download('\n\n')).toBe('');
  });
});

describe('fileWithErrors: row numbers are the rows of the file', () => {
  it('writes a blank line, and a row of empty cells, as a blank line, so the rows keep their numbers', async () => {
    const file = 'a,b\n1,2\n\n,\n3,4\n';
    const text = await download(file, [issue(5, 'a', 'Last row.')]);
    expect(text).toBe(
      `${BOM}a,b,_errors\r\n1,2,\r\n\r\n\r\n3,4,a: Last row.\r\n`
    );
    const again = await collect(chunked(text));
    expect(again.rows.map((r) => r.rowNumber)).toEqual([2, 5]);
  });

  it('keeps the blank lines that come before the header', async () => {
    const text = await download('\n\na,b\n1,2\n', [issue(4, 'b', 'Bad.')]);
    // The byte order mark is the first thing in the file.
    expect(text).toBe(`${BOM}\r\n\r\na,b,_errors\r\n1,2,b: Bad.\r\n`);
  });

  it('keeps a long run of blank lines', async () => {
    const text = await download(`a\n1\n${'\n'.repeat(10_000)}2\n`);
    const again = await collect(chunked(text));
    expect(again.rows.map((r) => r.rowNumber)).toEqual([2, 10_003]);
  });

  it('does not give a problem of a blank line to the row after it', async () => {
    const text = await download('a\n1\n\n2\n', [
      issue(3, 'a', 'On a blank line.'),
      issue(4, 'a', 'On a row.')
    ]);
    expect(text).toBe(`${BOM}a,_errors\r\n1,\r\n\r\n2,a: On a row.\r\n`);
  });

  it('does not write the problems of the file as a whole: they are on the page', async () => {
    const text = await download('a\n1\n', [
      issue(null, null, 'About the file.')
    ]);
    expect(text).toBe(`${BOM}a,_errors\r\n1,\r\n`);
  });

  it('ignores a problem for a row that the file does not have', async () => {
    const text = await download('a\n1\n2\n', [
      issue(2, 'a', 'Real.'),
      issue(40, 'a', 'Far away.')
    ]);
    expect(text).toBe(`${BOM}a,_errors\r\n1,a: Real.\r\n2,\r\n`);
  });

  it('puts each problem on its own row, many on one row', async () => {
    const text = await download('a,b\n1,2\n3,4\n', [
      issue(2, 'a', 'A1.'),
      issue(2, 'b', 'B1.'),
      issue(3, 'b', 'B2.', { severity: 'warning' })
    ]);
    expect(text).toBe(
      `${BOM}a,b,_errors\r\n1,2,a: A1. | b: B1.\r\n3,4,warning: b: B2.\r\n`
    );
  });
});

describe('fileWithErrors: a row with the wrong number of cells (ROW_WIDTH)', () => {
  it('pads a short row to the width of the header, so _errors stays in its column', async () => {
    const text = await download('a,b,c\n1,2\n', [issue(2, null, 'Short.')]);
    expect(text).toBe(`${BOM}a,b,c,_errors\r\n1,2,,row: Short.\r\n`);
  });

  it('puts the extra cells of a long row after _errors', async () => {
    const text = await download('a,b\n1,2,3,4\n', [issue(2, null, 'Long.')]);
    expect(text).toBe(`${BOM}a,b,_errors\r\n1,2,row: Long.,3,4\r\n`);
  });
});

describe('fileWithErrors: a password does not come back (§ 5.4.1)', () => {
  const file =
    'email,password,password_hash\na@x.test,secret,$2a$10$h\nb@x.test,,\n';

  it('writes a plain-text password cell of a customer as (hidden), and nothing else changes', async () => {
    const text = await download(file, [], { entity: 'customer' });
    expect(text).toBe(
      `${BOM}email,password,password_hash,_errors\r\n` +
        `a@x.test,${HIDDEN_CELL},$2a$10$h,\r\n` +
        'b@x.test,,,\r\n'
    );
    expect(text).not.toContain('secret');
  });

  it('leaves an empty password empty: "(hidden)" must not become a password', async () => {
    const text = await download(file, [], { entity: 'customer' });
    expect(text.split('\r\n')[2]).toBe('b@x.test,,,');
  });

  it('hides every column called password, and a cell of spaces is a cell too', async () => {
    const text = await download('password,x,password\n  ,1,abc\n', [], {
      entity: 'customer'
    });
    expect(text).toBe(
      `${BOM}password,x,password,_errors\r\n  ,1,${HIDDEN_CELL},\r\n`
    );
  });

  it('does not touch a column called password in another entity', async () => {
    const text = await download('password\nx\n', [], { entity: 'category' });
    expect(text).toContain('x,');
    expect(text).not.toContain(HIDDEN_CELL);
  });
});

describe('fileWithErrors: problems over the cap (§ 8.4)', () => {
  const file = 'a\n1\n2\n3\n4\n';

  it('marks the rows from the first unlisted row on, with and without problems of their own', async () => {
    const text = await download(
      file,
      [issue(2, 'a', 'One.'), issue(4, 'a', 'Three.')],
      { firstUnlistedRow: 4 }
    );
    expect(text).toBe(
      `${BOM}a,_errors\r\n` +
        '1,a: One.\r\n' +
        '2,\r\n' +
        `3,a: Three. | ${MORE_NOT_LISTED}\r\n` +
        `4,${MORE_NOT_LISTED}\r\n`
    );
  });

  it('marks nothing when no problem was left out', async () => {
    expect(await download(file, [], { firstUnlistedRow: null })).not.toContain(
      MORE_NOT_LISTED
    );
    expect(await download(file)).not.toContain(MORE_NOT_LISTED);
  });
});

describe('fileWithErrors: a file it cannot copy to the end', () => {
  it.each([
    ['a quote that never closes', 'a,b\n1,"2\n3,4\n', {}],
    ['more rows than the limit', 'a\n1\n2\n3\n', { limits: { maxRows: 2 } }],
    [
      'a file that is not UTF-8',
      Buffer.from([0x61, 0x0a, 0xff, 0xfe, 0x0a]),
      {}
    ],
    ['a semicolon-separated file', 'a;b\n1;2\n', {}]
  ])(
    'throws, so that the download fails, for %s',
    async (_name, file, more) => {
      await expect(
        download(file as string | Buffer, [], more as never)
      ).rejects.toBeInstanceOf(FileWithErrorsError);
    }
  );

  it('throws what the source throws, after it has given some rows', async () => {
    const boom = new Error('connection lost');
    const source = new Readable({
      read() {
        this.push(Buffer.from('a\n1\n2\n'));
        process.nextTick(() => this.destroy(boom));
      }
    });
    const got: string[] = [];
    await expect(
      (async () => {
        for await (const chunk of fileWithErrors({
          entity: 'category',
          source,
          issues: listed([])
        })) {
          got.push(chunk);
        }
      })()
    ).rejects.toBe(boom);
  });
});

describe('fileWithErrors: streaming', () => {
  const chunksOf = async (file: string) => {
    const chunks: string[] = [];
    for await (const chunk of fileWithErrors({
      entity: 'category',
      source: chunked(file, 8192),
      issues: listed([])
    })) {
      chunks.push(chunk);
    }
    return chunks;
  };

  it('gives no chunk at all for a file with nothing in it, and never an empty one', async () => {
    expect(await chunksOf('')).toEqual([]);
    const chunks = await chunksOf('a\n1\n');
    expect(chunks).toHaveLength(1);
    expect(chunks.every((chunk) => chunk !== '')).toBe(true);
  });

  it('writes a very long run of blank lines in chunks, and does not build it in one piece', async () => {
    const chunks = await chunksOf(`a\n1\n${'\n'.repeat(200_000)}2\n`);
    expect(chunks.length).toBeGreaterThan(5);
    // A chunk is cut as soon as it has 64 KiB: the blank lines are added 4096 lines (8 KiB) at a time.
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThan(64 * 1024 + 8192 + 100);
    }
    const again = await collect(chunked(chunks.join('')));
    expect(again.rows.map((r) => r.rowNumber)).toEqual([2, 200_003]);
  });

  it('writes a big file in chunks of about 64 KiB, in the order of the file', async () => {
    const rows = 30_000;
    const file = `a,b\n${Array.from(
      { length: rows },
      (_, n) => `${n},value ${n}`
    ).join('\n')}\n`;
    const problems = Array.from({ length: rows }, (_, n) =>
      issue(n + 2, 'b', `Problem ${n}.`)
    );
    const chunks: string[] = [];
    for await (const chunk of fileWithErrors({
      entity: 'category',
      source: chunked(file, 8192),
      issues: listed(problems)
    })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(5);
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.length).toBeGreaterThanOrEqual(64 * 1024);
      expect(chunk.length).toBeLessThan(64 * 1024 + 200);
    }
    const lines = chunks.join('').split('\r\n');
    expect(lines[0]).toBe(`${BOM}a,b,_errors`);
    expect(lines[1]).toBe('0,value 0,b: Problem 0.');
    expect(lines[rows]).toBe(
      `${rows - 1},value ${rows - 1},b: Problem ${rows - 1}.`
    );
  });

  it('asks for the problems as it needs them, not all at the start', async () => {
    let pulled = 0;
    async function* counting() {
      for (let n = 0; n < 100_000; n += 1) {
        pulled += 1;
        yield issue(n + 2, 'a', 'x');
      }
    }
    const file = `a\n${Array.from({ length: 100_000 }, (_, n) => n).join(
      '\n'
    )}\n`;
    const stream = fileWithErrors({
      entity: 'category',
      source: chunked(file, 4096),
      issues: counting()
    });
    const first = await stream.next();
    expect(first.done).toBe(false);
    expect(pulled).toBeLessThan(20_000);
    await stream.return();
  });

  it('closes the source and the list of problems when the reader of the download stops', async () => {
    let closed = false;
    const issues: AsyncIterable<StoredIssue> = {
      [Symbol.asyncIterator]() {
        let row = 1;
        return {
          async next() {
            row += 1;
            return { done: false, value: issue(row, 'a', 'x') };
          },
          async return() {
            closed = true;
            return { done: true, value: undefined };
          }
        };
      }
    };
    const file = `a\n${Array.from({ length: 60_000 }, (_, n) => n).join(
      '\n'
    )}\n`;
    const source = chunked(file, 4096);
    const stream = fileWithErrors({ entity: 'category', source, issues });
    await stream.next();
    await stream.return();
    expect(closed).toBe(true);
    // The stream tears itself down on the next turn of the event loop.
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([
      new Promise((resolve) => {
        source.once('close', resolve);
      }),
      new Promise((resolve) => {
        timer = setTimeout(resolve, 1000);
      })
    ]);
    clearTimeout(timer);
    expect(source.destroyed).toBe(true);
  });
});
