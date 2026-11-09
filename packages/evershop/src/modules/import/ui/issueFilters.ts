import type { IssuesQuery } from './importApi.js';

/** How many problems a page of the table shows. */
export const ISSUES_PAGE_SIZE = 50;

export interface IssueFilters {
  severity: 'error' | 'warning' | '';
  code: string;
  column: string;
  page: number;
}

export const noIssueFilters: IssueFilters = {
  severity: '',
  code: '',
  column: '',
  page: 1
};

/** A filter changed: the table goes back to its first page. */
export function withFilter(
  filters: IssueFilters,
  change: Partial<Omit<IssueFilters, 'page'>>
): IssueFilters {
  return { ...filters, ...change, page: 1 };
}

export function toQuery(filters: IssueFilters): IssuesQuery {
  return {
    severity: filters.severity === '' ? undefined : filters.severity,
    code: filters.code.trim() === '' ? undefined : filters.code.trim(),
    column: filters.column.trim() === '' ? undefined : filters.column.trim(),
    page: filters.page,
    limit: ISSUES_PAGE_SIZE
  };
}

export const pageCount = (total: number, limit = ISSUES_PAGE_SIZE): number =>
  Math.max(1, Math.ceil(total / limit));

/** The codes with their totals, largest first, for the line "Problems by type". */
export function codesBySize(
  byCode: Record<string, number>
): Array<{ code: string; count: number }> {
  return Object.entries(byCode)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}
