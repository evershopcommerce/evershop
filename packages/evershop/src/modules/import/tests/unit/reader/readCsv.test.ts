import { describe, it, expect } from '@jest/globals';
import { Readable } from 'stream';
import { readCsv } from '../../../services/reader/readCsv.js';
import { chunked, collect, readAll } from '../helpers/readAll.js';

// Every case below is read at seven different chunk sizes by `readAll`, and the
// result must be the same each time.

const cellsOf = (rows: { cells: string[] }[]) => rows.map((row) => row.cells);
// The sentence as a template is checked in say.test.ts; these compare the rest.
const plain = <T extends { say?: unknown }>(issues: T[]) =>
  issues.map(({ say: _say, ...rest }) => rest);

describe('readCsv: rows', () => {
  it('reads the header and the rows, and numbers the rows like a spreadsheet', async () => {
    const result = await readAll('sku,name\nA,Alpha\nB,Beta\n');
    expect(result.columns).toEqual(['sku', 'name']);
    expect(result.headerRow).toBe(1);
    expect(result.rows).toEqual([
      { rowNumber: 2, cells: ['A', 'Alpha'], hasError: false },
      { rowNumber: 3, cells: ['B', 'Beta'], hasError: false }
    ]);
    expect(result.issues).toEqual([]);
    expect(result.dataRows).toBe(2);
    expect(result.stopped).toBe(false);
  });

  it('puts the end event last, and only once', async () => {
    const result = await readAll('a\n1\n2\n');
    const types = result.events.map((event) => event.type);
    expect(types).toEqual(['header', 'row', 'row', 'end']);
  });

  it('reads CRLF, LF and CR line breaks, and a last row without a line break', async () => {
    const expected = [
      ['1', '2'],
      ['3', '4']
    ];
    for (const eol of ['\n', '\r\n', '\r']) {
      const result = await readAll(`a,b${eol}1,2${eol}3,4`);
      expect(cellsOf(result.rows)).toEqual(expected);
      expect(result.issues).toEqual([]);
    }
  });

  it('keeps a lone CR inside a quoted cell, and ends a row at a lone CR outside quotes', async () => {
    const result = await readAll('a,b\r"x\ry",1\rp,q\r');
    expect(cellsOf(result.rows)).toEqual([
      ['x\ry', '1'],
      ['p', 'q']
    ]);
    expect(result.issues).toEqual([]);
  });

  it('reads a file that mixes line breaks', async () => {
    const result = await readAll('a,b\r\n1,2\n3,4\r\n');
    expect(cellsOf(result.rows)).toEqual([
      ['1', '2'],
      ['3', '4']
    ]);
  });

  it('reads quoted commas, doubled quotes and line breaks, and counts a row once', async () => {
    const result = await readAll(
      'name,note\n"Smith, J.","said ""hi"""\n"two\nlines","x"\nlast,row\n'
    );
    expect(result.rows).toEqual([
      { rowNumber: 2, cells: ['Smith, J.', 'said "hi"'], hasError: false },
      { rowNumber: 3, cells: ['two\nlines', 'x'], hasError: false },
      { rowNumber: 4, cells: ['last', 'row'], hasError: false }
    ]);
  });

  it('reads a quoted line break written as CRLF', async () => {
    const result = await readAll('a,b\r\n"x\r\ny",z\r\n');
    expect(cellsOf(result.rows)).toEqual([['x\r\ny', 'z']]);
  });

  it('reads empty cells, including a last one after a comma', async () => {
    const result = await readAll('a,b,c\n1,,3\n1,2,\n,2,3\n"",x\n');
    expect(cellsOf(result.rows.slice(0, 3))).toEqual([
      ['1', '', '3'],
      ['1', '2', ''],
      ['', '2', '3']
    ]);
    // `"",x` is two cells, not three.
    expect(result.rows[3].cells).toEqual(['', 'x']);
    expect(result.issues.map((issue) => issue.code)).toEqual(['ROW_WIDTH']);
  });

  it('keeps the cells as written: spaces stay, the header is trimmed', async () => {
    const result = await readAll(' sku , name \n  A  , Alpha \n');
    expect(result.columns).toEqual(['sku', 'name']);
    expect(cellsOf(result.rows)).toEqual([['  A  ', ' Alpha ']]);
  });

  it('keeps non-Latin text, emoji and a stray byte order mark inside the file', async () => {
    const result = await readAll(
      'name,note\nÁo thun nam,"Đẹp 👕"\n日本語,﻿x\n'
    );
    expect(cellsOf(result.rows)).toEqual([
      ['Áo thun nam', 'Đẹp 👕'],
      ['日本語', '﻿x']
    ]);
  });

  it('reads a single-column file, and a blank line in it is not a row', async () => {
    const result = await readAll('email\na@x.com\n\nb@x.com\n');
    expect(result.rows).toEqual([
      { rowNumber: 2, cells: ['a@x.com'], hasError: false },
      { rowNumber: 4, cells: ['b@x.com'], hasError: false }
    ]);
  });

  it('reads a long file, with a line break inside a cell every so often', async () => {
    const lines = ['id,text'];
    for (let i = 1; i <= 3000; i += 1) {
      lines.push(i % 100 === 0 ? `${i},"line\nbreak ${i}"` : `${i},text ${i}`);
    }
    const result = await collect(chunked(`${lines.join('\n')}\n`, 4096));
    expect(result.dataRows).toBe(3000);
    expect(result.rows[2999]).toEqual({
      rowNumber: 3001,
      cells: ['3000', 'line\nbreak 3000'],
      hasError: false
    });
    expect(result.issues).toEqual([]);
  });
});

describe('readCsv: byte order mark and encoding', () => {
  it('removes a UTF-8 byte order mark from the first header name', async () => {
    const withBom = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('sku,name\nA,Alpha\n')
    ]);
    const result = await readAll(withBom);
    expect(result.columns).toEqual(['sku', 'name']);
    expect(result.issues).toEqual([]);
  });

  it('reads a file that is only a byte order mark as empty', async () => {
    const result = await readAll(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(result.issues.map((issue) => issue.params)).toEqual([
      { reason: 'no_header' }
    ]);
  });

  it('refuses bytes that are not UTF-8', async () => {
    const bad = Buffer.concat([
      Buffer.from('sku,name\nA,'),
      Buffer.from([0xc3, 0x28]),
      Buffer.from('\n')
    ]);
    const result = await readAll(bad, {}, 'issues');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'FILE_ENCODING',
      severity: 'error',
      params: { reason: 'invalid_utf8' }
    });
    expect(result.issues[0].rowNumber).toBeUndefined();
    expect(result.stopped).toBe(true);
  });

  it('refuses a character that is cut off at the end of the file', async () => {
    const cut = Buffer.concat([
      Buffer.from('sku,name\nA,'),
      Buffer.from('Đ').subarray(0, 1)
    ]);
    const result = await readAll(cut, {}, 'issues');
    expect(result.issues.map((issue) => issue.code)).toEqual(['FILE_ENCODING']);
  });

  it('refuses a UTF-16 file by its byte order mark, in both byte orders', async () => {
    const little = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('sku\tname\n', 'utf16le')
    ]);
    const big = Buffer.concat([
      Buffer.from([0xfe, 0xff]),
      Buffer.from('sku\tname\n', 'utf16le').swap16()
    ]);
    for (const file of [little, big]) {
      const result = await readAll(file, {}, 'issues');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'FILE_ENCODING',
        params: { reason: 'utf16' }
      });
    }
  });
});

describe('readCsv: blank lines', () => {
  it('ignores a blank line but counts it, so that the numbers match the spreadsheet', async () => {
    const result = await readAll('a,b\n1,2\n\n3,4\n\n\n5,6\n\n');
    expect(result.rows.map((row) => row.rowNumber)).toEqual([2, 4, 7]);
    expect(result.dataRows).toBe(3);
    expect(result.issues).toEqual([]);
  });

  it('takes the first line that is not blank as the header', async () => {
    const result = await readAll('\n\na,b\n1,2\n');
    expect(result.headerRow).toBe(3);
    expect(result.rows).toEqual([
      { rowNumber: 4, cells: ['1', '2'], hasError: false }
    ]);
  });

  it('treats a row of only empty cells as a blank line: skipped, but counted', async () => {
    // Excel leaves rows like `,,` at the end of a sheet.
    const result = await readAll('a,b\n,\n1,2\n"", \n  ,\t\n3,4\n,\n');
    expect(result.rows.map((row) => row.rowNumber)).toEqual([3, 6]);
    expect(result.dataRows).toBe(2);
    expect(result.issues).toEqual([]);
  });

  it('skips a row of empty cells whatever its width: no ROW_WIDTH for it', async () => {
    const result = await readAll('a,b\n,,,,\n1,2\n,\n');
    expect(cellsOf(result.rows)).toEqual([['1', '2']]);
    expect(result.issues).toEqual([]);
  });

  it('skips a quoted empty cell in a single-column file', async () => {
    const result = await readAll('email\n""\na@x.com\n');
    expect(result.rows).toEqual([
      { rowNumber: 3, cells: ['a@x.com'], hasError: false }
    ]);
  });

  it('does not take a row of empty cells for the header', async () => {
    const result = await readAll(',,\na,b\n1,2\n');
    expect(result.headerRow).toBe(2);
    expect(result.columns).toEqual(['a', 'b']);
  });

  it('keeps a row that has something in at least one cell', async () => {
    const result = await readAll('a,b\n,x\n"a b",\n');
    expect(cellsOf(result.rows)).toEqual([
      ['', 'x'],
      ['a b', '']
    ]);
  });
});

describe('readCsv: the width of a row (ALL-06)', () => {
  it('reports a row with too few and a row with too many cells, and goes on', async () => {
    const result = await readAll('a,b,c\n1,2,3\n1,2\n1,2,3,4\n7,8,9\n');
    expect(plain(result.issues)).toEqual([
      {
        code: 'ROW_WIDTH',
        severity: 'error',
        rowNumber: 3,
        params: { expected: 3, actual: 2 },
        message: expect.stringContaining(
          'Row 3 has 2 cells but the header has 3'
        )
      },
      {
        code: 'ROW_WIDTH',
        severity: 'error',
        rowNumber: 4,
        params: { expected: 3, actual: 4 },
        message: expect.stringContaining(
          'Row 4 has 4 cells but the header has 3'
        )
      }
    ]);
    expect(result.rows.map((row) => [row.rowNumber, row.hasError])).toEqual([
      [2, false],
      [3, true],
      [4, true],
      [5, false]
    ]);
    // The cells of a row of the wrong width are given as they are.
    expect(result.rows[1].cells).toEqual(['1', '2']);
    expect(result.rows[2].cells).toEqual(['1', '2', '3', '4']);
    expect(result.dataRows).toBe(4);
    expect(result.stopped).toBe(false);
  });

  it('puts the issues of a row before the row', async () => {
    const result = await readAll('a,b\n1\n');
    expect(result.events.map((event) => event.type)).toEqual([
      'header',
      'issue',
      'row',
      'end'
    ]);
  });

  it('ends the stream after a row of the wrong width in the last line, too', async () => {
    const result = await readAll('a,b\n1,2\n3');
    expect(result.issues.map((issue) => issue.code)).toEqual(['ROW_WIDTH']);
    expect(result.events[result.events.length - 1].type).toBe('end');
  });

  it('flags a row that is not wrapped in quotes properly (a comma in a cell)', async () => {
    const result = await readAll('name,price\nWidget, large,9\n');
    expect(result.issues.map((issue) => issue.params)).toEqual([
      { expected: 2, actual: 3 }
    ]);
  });
});

describe('readCsv: the header', () => {
  it('refuses a semicolon-separated file, with the delimiter named', async () => {
    const result = await readAll('sku;name;price\nA;Alpha;1\n');
    expect(plain(result.issues)).toEqual([
      {
        code: 'WRONG_DELIMITER',
        severity: 'error',
        params: { delimiter: ';' },
        message: expect.stringContaining('semicolon')
      }
    ]);
    expect(result.stopped).toBe(true);
    expect(result.columns).toBeUndefined();
    expect(result.rows).toEqual([]);
  });

  it('refuses a tab-separated file', async () => {
    const result = await readAll('sku\tname\tprice\nA\tAlpha\t1\n');
    expect(result.issues.map((issue) => [issue.code, issue.params])).toEqual([
      ['WRONG_DELIMITER', { delimiter: '\t' }]
    ]);
    expect(result.stopped).toBe(true);
  });

  it('accepts a semicolon or a tab inside a header that has several columns', async () => {
    const result = await readAll('sku,a;b,c\td\n1,2,3\n');
    expect(result.columns).toEqual(['sku', 'a;b', 'c\td']);
    expect(result.issues).toEqual([]);
  });

  it('accepts a one-column file that has no semicolon or tab', async () => {
    const result = await readAll('email\na@x.com\n');
    expect(result.columns).toEqual(['email']);
    expect(result.issues).toEqual([]);
  });

  it('reports a column that appears twice, with the positions, and goes on reading', async () => {
    const result = await readAll('sku,name,sku\nA,Alpha,B\n');
    expect(plain(result.issues)).toEqual([
      {
        code: 'DUPLICATE_COLUMN',
        severity: 'error',
        column: 'sku',
        params: { column: 'sku', positions: [1, 3] },
        message: expect.stringContaining('"sku" appears more than once')
      }
    ]);
    expect(result.columns).toEqual(['sku', 'name', 'sku']);
    expect(result.stopped).toBe(false);
    expect(result.rows).toHaveLength(1);
  });

  it('finds the duplicates of a very wide header at once, and lists the first positions only', async () => {
    const width = 200_000;
    const header = Array.from({ length: width }, () => 'a').join(',');
    const started = Date.now();
    // One read: readAll cuts the input down to one byte per chunk, which is not what is measured here.
    const result = await collect(chunked(`${header}\n1\n`));
    expect(Date.now() - started).toBeLessThan(2000);
    const dup = result.issues.filter((i) => i.code === 'DUPLICATE_COLUMN');
    expect(dup).toHaveLength(1);
    expect((dup[0].params.positions as number[]).length).toBe(20);
    expect(dup[0].message.length).toBeLessThan(300);
  });

  it('compares column names after trimming, and with letter case (names are case-sensitive)', async () => {
    const trimmed = await readAll('sku, sku \n1,2\n');
    expect(trimmed.issues.map((issue) => issue.code)).toEqual([
      'DUPLICATE_COLUMN'
    ]);
    const cased = await readAll('sku,SKU\n1,2\n');
    expect(cased.issues).toEqual([]);
  });

  it('does not call blank column names duplicates (a spreadsheet adds empty columns)', async () => {
    const result = await readAll('sku,name,,\nA,Alpha,,\n');
    expect(result.columns).toEqual(['sku', 'name', '', '']);
    expect(result.issues).toEqual([]);
  });

  it('leaves out the _errors column (ALL-19), in the header and in every row', async () => {
    const result = await readAll(
      'sku,_errors,name\nA,"row: x",Alpha\nB,,Beta\n'
    );
    expect(result.columns).toEqual(['sku', 'name']);
    expect(cellsOf(result.rows)).toEqual([
      ['A', 'Alpha'],
      ['B', 'Beta']
    ]);
    expect(result.issues).toEqual([]);
  });

  it('still counts the _errors column when it checks the width of a row', async () => {
    const result = await readAll('sku,name,_errors\nA,Alpha\nB,Beta,\n');
    expect(result.issues.map((issue) => issue.code)).toEqual(['ROW_WIDTH']);
    expect(result.rows[0].hasError).toBe(true);
    expect(result.rows[1]).toEqual({
      rowNumber: 3,
      cells: ['B', 'Beta'],
      hasError: false
    });
  });

  it('does not call a repeated _errors column a duplicate', async () => {
    const result = await readAll('sku,_errors,_errors\nA,x,y\n');
    expect(result.issues).toEqual([]);
    expect(result.columns).toEqual(['sku']);
  });
});

describe('readCsv: an empty file (ALL-02)', () => {
  it.each([
    ['nothing at all', '', 'no_header'],
    ['only line breaks', '\n\r\n\n', 'no_header'],
    ['a header and nothing else', 'sku,name\n', 'no_rows'],
    ['a header and blank lines', 'sku,name\n\n\n', 'no_rows'],
    ['a header and rows of empty cells', 'sku,name\n,\n,\n', 'no_rows'],
    ['a header without a line break', 'sku,name', 'no_rows']
  ])('reports %s', async (_name, input, reason) => {
    const result = await readAll(input);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'FILE_EMPTY',
      severity: 'error',
      params: { reason }
    });
    expect(result.issues[0].rowNumber).toBeUndefined();
    expect(result.dataRows).toBe(0);
    expect(result.stopped).toBe(false);
  });
});

describe('readCsv: a quote that is never closed', () => {
  it('names the row where the quote opens, when the file ends', async () => {
    const result = await readAll(
      'a,b\n1,2\n3,"never closed\n5,6\n7,8\n',
      {},
      'issues'
    );
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'UNCLOSED_QUOTE',
      severity: 'error',
      params: { row: 3 }
    });
    expect(result.issues[0].rowNumber).toBeUndefined();
    expect(result.stopped).toBe(true);
  });

  it('names the right row after quoted line breaks and blank lines', async () => {
    const result = await readAll(
      'a,b\n"x\ny",1\n\n"p""q",2\n5,"open\n',
      {},
      'issues'
    );
    // Rows: 1 header, 2 the quoted line break (two lines, one row), 3 blank,
    // 4 the escaped quote, 5 the open quote.
    expect(result.issues[0]).toMatchObject({
      code: 'UNCLOSED_QUOTE',
      params: { row: 5 }
    });
  });

  it('is not fooled by quotes that are closed', async () => {
    const result = await readAll('a,b\n"x","y"\n"p""q","r"\n');
    expect(result.issues).toEqual([]);
  });

  it('stops a row that grows past the limit while the quote is open (the file is not read to the end)', async () => {
    const huge = `a,b\n1,"${'x'.repeat(5000)}\n`;
    const result = await readAll(huge, { maxRowBytes: 1000 }, 'issues');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'ROW_TOO_LARGE',
      params: { row: 2, maxRowBytes: 1000, quoteOpen: true }
    });
    expect(result.issues[0].message).toContain('never closed');
    expect(result.stopped).toBe(true);
  });
});

describe('readCsv: the size of a row', () => {
  const rowOf = (bytes: number) => `1,${'x'.repeat(bytes - 3)}\n`;

  it('accepts a row of exactly the limit, line break included', async () => {
    const result = await readAll(`a,b\n${rowOf(100)}`, { maxRowBytes: 100 });
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });

  it('refuses a row that is one byte over, and names the row', async () => {
    const result = await readAll(
      `a,b\n1,2\n\n${rowOf(101)}`,
      { maxRowBytes: 100 },
      'issues'
    );
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'ROW_TOO_LARGE',
      params: { row: 4, maxRowBytes: 100, quoteOpen: false }
    });
    expect(result.stopped).toBe(true);
  });

  it('counts the bytes of a row, not its characters', async () => {
    // 50 characters of 3 bytes each.
    const result = await readAll(
      `a\n${'日'.repeat(50)}\n`,
      {
        maxRowBytes: 140
      },
      'issues'
    );
    expect(result.issues[0]).toMatchObject({ code: 'ROW_TOO_LARGE' });
  });

  it('measures each row on its own: a long file of short rows is fine', async () => {
    const lines = ['a,b'];
    for (let i = 0; i < 500; i += 1) {
      lines.push('12345678,12345678');
    }
    for (const eol of ['\n', '\r\n', '\r']) {
      const result = await collect(chunked(lines.join(eol) + eol, 5), {
        maxRowBytes: 50
      });
      expect(result.issues).toEqual([]);
      expect(result.dataRows).toBe(500);
    }
  });

  it('allows a quoted cell with line breaks up to the limit', async () => {
    const cell = `${'line\n'.repeat(15)}end`;
    const result = await readAll(`a\n"${cell}"\n`, { maxRowBytes: 100 });
    expect(result.issues).toEqual([]);
    expect(result.rows[0].cells).toEqual([cell]);
  });
});

describe('readCsv: the number of rows (ALL-03)', () => {
  it('accepts exactly the maximum', async () => {
    const result = await readAll('a\n1\n2\n3\n', { maxRows: 3 });
    expect(result.issues).toEqual([]);
    expect(result.dataRows).toBe(3);
  });

  it('stops at the first row over the maximum', async () => {
    const result = await readAll('a\n1\n2\n3\n4\n5\n', { maxRows: 3 });
    expect(plain(result.issues)).toEqual([
      {
        code: 'FILE_TOO_LARGE',
        severity: 'error',
        params: { reason: 'rows', maxRows: 3 },
        message: expect.stringContaining('more than 3 data rows')
      }
    ]);
    expect(result.rows.map((row) => row.cells[0])).toEqual(['1', '2', '3']);
    expect(result.stopped).toBe(true);
  });

  it('does not count blank lines', async () => {
    const result = await readAll('a\n1\n\n\n2\n\n3\n\n', { maxRows: 3 });
    expect(result.issues).toEqual([]);
    expect(result.dataRows).toBe(3);
  });
});

describe('readCsv: the cells (ALL-12)', () => {
  it('flags a cell that is too long, with the start of it as the value', async () => {
    const result = await readAll('sku,name\nA,abcdefghij\nB,ok\n', {
      maxCellLength: 5
    });
    expect(plain(result.issues)).toEqual([
      {
        code: 'INVALID_VALUE',
        severity: 'error',
        rowNumber: 2,
        column: 'name',
        params: { reason: 'too_long', maxLength: 5 },
        message: expect.stringContaining('longer than 5 characters'),
        value: 'abcdefghij'
      }
    ]);
    expect(result.rows.map((row) => row.hasError)).toEqual([true, false]);
    // The cell is still there, as written.
    expect(result.rows[0].cells).toEqual(['A', 'abcdefghij']);
  });

  it('accepts a cell of exactly the maximum length', async () => {
    const result = await readAll('a\nabcde\n', { maxCellLength: 5 });
    expect(result.issues).toEqual([]);
  });

  it('truncates the value that it puts in the issue', async () => {
    const result = await readAll(`a\n${'y'.repeat(500)}\n`, {
      maxCellLength: 5
    });
    expect(result.issues[0].value).toBe(`${'y'.repeat(100)}…`);
  });

  it('flags a NUL character, and leaves the cell out of the issue', async () => {
    const result = await readAll('sku,name\nA,bad\u0000cell\nB,fine\n');
    expect(plain(result.issues)).toEqual([
      {
        code: 'INVALID_VALUE',
        severity: 'error',
        rowNumber: 2,
        column: 'name',
        params: { reason: 'nul' },
        message: expect.stringContaining('NUL')
      }
    ]);
    expect(result.issues[0].value).toBeUndefined();
    expect(JSON.stringify(result.issues)).not.toContain('\u0000');
  });

  it('flags every cell of a row that has a problem, one issue each', async () => {
    const result = await readAll('a,b,c\nxxxxxxx,ok,yyyyyyy\n', {
      maxCellLength: 5
    });
    expect(result.issues.map((issue) => issue.column)).toEqual(['a', 'c']);
  });

  it('never puts the value of a password column in an issue', async () => {
    const result = await readAll(
      'email,password,password_hash\na@x.com,secret-secret,$2b$10$abcdefghij\n',
      { maxCellLength: 8 }
    );
    expect(result.issues.map((issue) => issue.column)).toEqual([
      'password',
      'password_hash'
    ]);
    for (const issue of result.issues) {
      expect(issue.value).toBeUndefined();
    }
    expect(JSON.stringify(result.issues)).not.toContain('secret');
  });
});

describe('readCsv: the stream', () => {
  it('throws when the source fails: that is not a problem with the file', async () => {
    let sent = false;
    const source = new Readable({
      read() {
        if (!sent) {
          sent = true;
          this.push('a,b\n1,2\n');
        } else {
          this.destroy(new Error('database connection lost'));
        }
      }
    });
    await expect(collect(source)).rejects.toThrow('database connection lost');
  });

  it('destroys the source when the consumer stops early', async () => {
    const source = chunked(`a\n${'1\n'.repeat(10_000)}`, 64);
    const events = readCsv(source);
    expect((await events.next()).value).toMatchObject({ type: 'header' });
    expect((await events.next()).value).toMatchObject({ type: 'row' });
    await events.return();
    expect(source.destroyed).toBe(true);
  });

  it('destroys the source when a problem with the file stops the reading', async () => {
    const source = chunked(`a,b\n"open\n${'x'.repeat(5000)}`, 64);
    const result = await collect(source, { maxRowBytes: 500 });
    expect(result.stopped).toBe(true);
    expect(source.destroyed).toBe(true);
  });

  it('reads a source that gives strings as well as buffers', async () => {
    const source = Readable.from(['a,b\n', '1,2\n'], { objectMode: false });
    const result = await collect(source);
    expect(cellsOf(result.rows)).toEqual([['1', '2']]);
  });
});
