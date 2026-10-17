import { describe, it, expect } from '@jest/globals';
import {
  IMPORT_ISSUE_CODES,
  createIssue,
  defaultSeverity
} from '../../services/issues.js';

describe('issue codes', () => {
  it('are unique, in capitals and underscores', () => {
    expect(new Set(IMPORT_ISSUE_CODES).size).toBe(IMPORT_ISSUE_CODES.length);
    for (const code of IMPORT_ISSUE_CODES) {
      expect(code).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    }
  });

  it('are the codes of the specification (7.2), plus the two file-level ones of the reader', () => {
    expect([...IMPORT_ISSUE_CODES].sort()).toEqual(
      [
        'FILE_ENCODING',
        'FILE_EMPTY',
        'FILE_TOO_LARGE',
        'WRONG_DELIMITER',
        'DUPLICATE_COLUMN',
        'ROW_WIDTH',
        'MISSING_COLUMN',
        'UNKNOWN_COLUMN',
        'MISSING_REQUIRED',
        'INVALID_VALUE',
        'INVALID_JSON',
        'DUPLICATE_KEY_IN_FILE',
        'REFERENCE_NOT_FOUND',
        'REFERENCE_AMBIGUOUS',
        'ALREADY_EXISTS',
        'NOT_FOUND',
        'OPTION_NOT_FOUND',
        'PARENT_CYCLE',
        'VARIANT_INCONSISTENT',
        'VARIANT_CONFLICT',
        'VARIANT_NOT_ADJACENT',
        'ATTRIBUTE_NOT_IN_GROUP',
        'VARIANT_DUPLICATE_COMBINATION',
        'VALUES_WILL_BE_REMOVED',
        'CONFLICT',
        'URL_KEY_RESERVED',
        'IGNORED_VALUE',
        'DUPLICATE_VALUE',
        'TEMPLATE_EXAMPLE_ROW',
        'IMAGE_UNREADABLE',
        'ADDRESS_INVALID',
        'METAFIELD_INVALID',
        'DEPENDENCY_FAILED',
        'WRITE_FAILED',
        'UNCLOSED_QUOTE',
        'ROW_TOO_LARGE'
      ].sort()
    );
  });

  it('are errors, except the five that are only warnings', () => {
    const warnings = IMPORT_ISSUE_CODES.filter(
      (code) => defaultSeverity(code) === 'warning'
    );
    expect(warnings.sort()).toEqual([
      'DUPLICATE_VALUE',
      'IGNORED_VALUE',
      'TEMPLATE_EXAMPLE_ROW',
      'UNKNOWN_COLUMN',
      'VALUES_WILL_BE_REMOVED'
    ]);
  });
});

describe('createIssue', () => {
  it('gives the code its severity, unless one is given', () => {
    expect(createIssue({ code: 'IGNORED_VALUE', message: 'm' }).severity).toBe(
      'warning'
    );
    expect(createIssue({ code: 'CONFLICT', message: 'm' }).severity).toBe(
      'error'
    );
    expect(
      createIssue({ code: 'CONFLICT', message: 'm', severity: 'warning' })
        .severity
    ).toBe('warning');
  });

  it('leaves out what is not given, so that the issue is plain JSON', () => {
    const issue = createIssue({ code: 'FILE_EMPTY', message: 'm' });
    expect(issue).toEqual({
      code: 'FILE_EMPTY',
      severity: 'error',
      params: {},
      message: 'm'
    });
    expect(Object.keys(issue)).not.toContain('rowNumber');
    expect(Object.keys(issue)).not.toContain('value');
  });

  it('keeps row 0 and an empty value, which are values', () => {
    const issue = createIssue({
      code: 'INVALID_VALUE',
      message: 'm',
      rowNumber: 0,
      column: 'name',
      value: ''
    });
    expect(issue.rowNumber).toBe(0);
    expect(issue.value).toBe('');
  });

  it('never keeps the value of a password column', () => {
    for (const column of ['password', 'password_hash']) {
      const issue = createIssue({
        code: 'INVALID_VALUE',
        message: 'm',
        column,
        value: 'hunter2'
      });
      expect(issue.column).toBe(column);
      expect(issue.value).toBeUndefined();
    }
    expect(
      createIssue({
        code: 'INVALID_VALUE',
        message: 'm',
        column: 'passwords',
        value: 'x'
      }).value
    ).toBe('x');
  });

  it('replaces U+0000 everywhere, because PostgreSQL text cannot hold it', () => {
    const issue = createIssue({
      code: 'INVALID_VALUE',
      message: 'bad\u0000message',
      column: 'na\u0000me',
      value: 'a\u0000b'
    });
    expect(JSON.stringify(issue)).not.toContain('\\u0000');
    expect(issue.message).toBe('bad�message');
    expect(issue.column).toBe('na�me');
    expect(issue.value).toBe('a�b');
  });

  it('cuts a long value to 100 characters and a long column name to 200', () => {
    const issue = createIssue({
      code: 'INVALID_VALUE',
      message: 'm',
      column: 'c'.repeat(300),
      value: 'v'.repeat(101)
    });
    expect(issue.value).toBe(`${'v'.repeat(100)}…`);
    expect(issue.column).toBe(`${'c'.repeat(200)}…`);
    expect(
      createIssue({ code: 'CONFLICT', message: 'm', value: 'v'.repeat(100) })
        .value
    ).toBe('v'.repeat(100));
  });

  it('does not cut an emoji in two', () => {
    const issue = createIssue({
      code: 'INVALID_VALUE',
      message: 'm',
      value: '👕'.repeat(150)
    });
    expect(issue.value).toBe(`${'👕'.repeat(100)}…`);
  });

  it('cuts a very long value without reading all of it', () => {
    const issue = createIssue({
      code: 'INVALID_VALUE',
      message: 'm',
      value: 'x'.repeat(5_000_000)
    });
    expect(issue.value).toBe(`${'x'.repeat(100)}…`);
  });
});
