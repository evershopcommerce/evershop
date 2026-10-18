import { describe, it, expect } from '@jest/globals';
import type { StoredIssue } from '../../../services/job/types.js';
import {
  errorsCell,
  MAX_PROBLEMS_PER_ROW,
  MORE_NOT_LISTED
} from '../../../services/report/errorsCell.js';

const issue = (fields: Partial<StoredIssue> = {}): StoredIssue => ({
  phase: 'validate',
  rowNumber: 2,
  entityKey: 'women',
  column: 'status',
  code: 'INVALID_VALUE',
  severity: 'error',
  params: {},
  message: 'It is wrong.',
  value: null,
  ...fields
});

const COLUMNS = ['url_key', 'name', 'status', 'position'];

describe('errorsCell: the text of one row (§ 7.3)', () => {
  it('starts a problem of a column with the name of the column', () => {
    expect(errorsCell([issue()], { columns: COLUMNS })).toBe(
      'status: It is wrong.'
    );
  });

  it('starts a problem of the whole row with "row:"', () => {
    expect(
      errorsCell([issue({ column: null, message: 'Cells missing.' })], {
        columns: COLUMNS
      })
    ).toBe('row: Cells missing.');
  });

  it('starts a warning with "warning:", with the column after it when there is one', () => {
    expect(
      errorsCell([issue({ severity: 'warning' })], { columns: COLUMNS })
    ).toBe('warning: status: It is wrong.');
    expect(
      errorsCell([issue({ severity: 'warning', column: null })], {
        columns: COLUMNS
      })
    ).toBe('warning: It is wrong.');
  });

  it('is empty for a row with no problem', () => {
    expect(errorsCell([], { columns: COLUMNS })).toBe('');
  });

  it('separates the problems with " | " on one line', () => {
    const text = errorsCell(
      [issue({ message: 'One.' }), issue({ column: 'name', message: 'Two.' })],
      { columns: COLUMNS }
    );
    expect(text).toBe('name: Two. | status: One.');
  });

  it('puts errors before warnings, the row before its columns, and columns left to right', () => {
    const text = errorsCell(
      [
        issue({ column: 'position', message: 'p' }),
        issue({ column: 'name', severity: 'warning', message: 'w-name' }),
        issue({ column: null, message: 'whole' }),
        issue({ column: 'url_key', message: 'u' }),
        issue({ column: 'unknown_col', message: 'x' }),
        issue({ column: null, severity: 'warning', message: 'w-row' })
      ],
      { columns: COLUMNS }
    );
    expect(text.split(' | ')).toEqual([
      'row: whole',
      'url_key: u',
      'position: p',
      'unknown_col: x',
      'warning: w-row',
      'warning: name: w-name'
    ]);
  });

  it('keeps the order they were found in for the same column', () => {
    const text = errorsCell(
      [issue({ message: 'first' }), issue({ message: 'second' })],
      { columns: COLUMNS }
    );
    expect(text).toBe('status: first | status: second');
  });

  it('trims the sentence, also when the edge of it is a line break', () => {
    expect(
      errorsCell([issue({ message: '\n  Spaced out. \r\n' })], {
        columns: COLUMNS
      })
    ).toBe('status: Spaced out.');
  });

  it('does not write the value of the cell (a password must not come back)', () => {
    const text = errorsCell(
      [
        issue({
          column: 'password',
          value: 'hunter2-SECRET',
          message: 'The password is too short.'
        })
      ],
      { columns: ['password'] }
    );
    expect(text).not.toContain('hunter2');
    expect(text).toBe('password: The password is too short.');
  });

  it('renders the message from the code and the parameters when it is given a renderer', () => {
    const seen: unknown[] = [];
    const text = errorsCell(
      [
        issue({
          code: 'INVALID_VALUE',
          params: { reason: 'not_a_number' },
          message: 'English.'
        })
      ],
      {
        columns: COLUMNS,
        render: (i) => {
          seen.push([i.code, i.params, i.column, i.severity]);
          return 'Đây là tiếng Việt.';
        }
      }
    );
    expect(text).toBe('status: Đây là tiếng Việt.');
    expect(seen).toEqual([
      ['INVALID_VALUE', { reason: 'not_a_number' }, 'status', 'error']
    ]);
  });
});

describe('errorsCell: the cap on one row', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => issue({ message: `m${i}` }));

  it('writes all of them up to the cap', () => {
    const text = errorsCell(many(MAX_PROBLEMS_PER_ROW), { columns: COLUMNS });
    expect(text.split(' | ')).toHaveLength(MAX_PROBLEMS_PER_ROW);
    expect(text).not.toContain('more');
  });

  it('counts the rest', () => {
    const text = errorsCell(many(MAX_PROBLEMS_PER_ROW + 3), {
      columns: COLUMNS
    });
    const parts = text.split(' | ');
    expect(parts).toHaveLength(MAX_PROBLEMS_PER_ROW + 1);
    expect(parts[MAX_PROBLEMS_PER_ROW - 1]).toBe(
      `status: m${MAX_PROBLEMS_PER_ROW - 1}`
    );
    expect(parts[MAX_PROBLEMS_PER_ROW]).toBe('(and 3 more)');
  });

  it('keeps the errors when it has to leave something out', () => {
    const warnings = Array.from({ length: 12 }, (_, i) =>
      issue({ severity: 'warning', message: `w${i}` })
    );
    const text = errorsCell([...warnings, issue({ message: 'the error' })], {
      columns: COLUMNS
    });
    expect(text.startsWith('status: the error | warning:')).toBe(true);
  });
});

describe('errorsCell: problems over the cap on stored problems (§ 8.4)', () => {
  it('says that more problems are not listed', () => {
    expect(errorsCell([], { columns: COLUMNS, unlisted: true })).toBe(
      MORE_NOT_LISTED
    );
  });

  it('puts the line after the problems that are listed', () => {
    expect(errorsCell([issue()], { columns: COLUMNS, unlisted: true })).toBe(
      `status: It is wrong. | ${MORE_NOT_LISTED}`
    );
  });

  it('does not say it when the row is not past the cap', () => {
    expect(errorsCell([issue()], { columns: COLUMNS, unlisted: false })).toBe(
      'status: It is wrong.'
    );
  });
});

describe('errorsCell: a spreadsheet cannot read the text as a formula', () => {
  const FORMULA = /^[=+\-@\t\r]/;

  it.each([
    ['=1+1'],
    ['+1'],
    ['-1'],
    ['@SUM(A1)'],
    ['\t=1'],
    ['\r=1'],
    ['=HYPERLINK("http://x.test","click")'],
    ['  =spaced']
  ])('quotes the column name %j when it starts like a formula', (column) => {
    const text = errorsCell([issue({ column })], { columns: [column] });
    expect(text).not.toMatch(FORMULA);
    expect(text).not.toMatch(/[\r\n\t]/);
  });

  it('shows the name that starts like a formula in quotes', () => {
    expect(
      errorsCell([issue({ column: '=1+1', message: 'Bad.' })], {
        columns: ['=1+1']
      })
    ).toBe('"=1+1": Bad.');
  });

  it('leaves a message that starts like a formula where it is: it never starts the text', () => {
    expect(
      errorsCell([issue({ message: '=cmd|calc' })], { columns: COLUMNS })
    ).toBe('status: =cmd|calc');
  });

  it('holds for any column name and message (random input)', () => {
    let seed = 4242;
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const alphabet = ['=', '+', '-', '@', '\t', '\r', '\n', ' ', 'a', '|', '"'];
    const text = () =>
      Array.from(
        { length: next(6) },
        () => alphabet[next(alphabet.length)]
      ).join('');
    for (let round = 0; round < 500; round += 1) {
      const issues = Array.from({ length: 1 + next(4) }, () =>
        issue({
          column: next(3) === 0 ? null : text() || 'c',
          severity: next(2) === 0 ? 'error' : 'warning',
          message: text()
        })
      );
      const cell = errorsCell(issues, { columns: [] });
      expect(cell).not.toMatch(FORMULA);
      expect(cell).not.toMatch(/[\r\n\t]/);
    }
  });

  it('turns line breaks and control characters of a message into spaces', () => {
    const text = errorsCell(
      [
        issue({
          message: `Line one.\r\nLine two.\u0007${String.fromCharCode(
            0x2028
          )}End.`
        })
      ],
      { columns: COLUMNS }
    );
    expect(text).toBe('status: Line one. Line two. End.');
  });
});
