import { describe, expect, it } from '@jest/globals';
import {
  ISSUES_PAGE_SIZE,
  codesBySize,
  noIssueFilters,
  pageCount,
  toQuery,
  withFilter
} from '../../../ui/issueFilters.js';

describe('the filters of the table of problems', () => {
  it('asks for the first page, with no filter, at first', () => {
    expect(toQuery(noIssueFilters)).toEqual({
      severity: undefined,
      code: undefined,
      column: undefined,
      page: 1,
      limit: ISSUES_PAGE_SIZE
    });
  });

  it('sends the filters that are set, trimmed', () => {
    expect(
      toQuery({
        severity: 'error',
        code: ' INVALID_VALUE ',
        column: ' price ',
        page: 3
      })
    ).toEqual({
      severity: 'error',
      code: 'INVALID_VALUE',
      column: 'price',
      page: 3,
      limit: ISSUES_PAGE_SIZE
    });
  });

  it('takes a column of spaces as no column', () => {
    expect(
      toQuery({ ...noIssueFilters, column: '   ' }).column
    ).toBeUndefined();
  });

  it('goes back to the first page when a filter changes', () => {
    const third = { ...noIssueFilters, page: 3 };
    expect(withFilter(third, { code: 'INVALID_VALUE' })).toEqual({
      severity: '',
      code: 'INVALID_VALUE',
      column: '',
      page: 1
    });
  });

  it('counts at least one page', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(ISSUES_PAGE_SIZE)).toBe(1);
    expect(pageCount(ISSUES_PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(1000, 100)).toBe(10);
  });

  it('lists the types by size, then by name, without the ones with no problem', () => {
    expect(codesBySize({ B: 3, A: 3, C: 10, D: 0 })).toEqual([
      { code: 'C', count: 10 },
      { code: 'A', count: 3 },
      { code: 'B', count: 3 }
    ]);
    expect(codesBySize({})).toEqual([]);
  });
});
