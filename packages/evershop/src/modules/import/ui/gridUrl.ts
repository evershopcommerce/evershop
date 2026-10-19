import { LISTED_STATUSES } from '../services/job/types.js';

/** The filters of the list of imports that the page offers (spec 8.1). */
export interface GridFilters {
  status: string;
  entity: string;
  file: string;
}

/** The statuses that can be filtered by: all but `uploading`, which the list never shows. */
export const STATUS_FILTERS = LISTED_STATUSES;

interface AppliedFilter {
  key: string;
  operation?: string;
  value: string;
}

/** What the list says it applied, as the state of the three controls. */
export function readFilters(applied: readonly AppliedFilter[]): GridFilters {
  const value = (key: string) =>
    applied.find((f) => f.key === key)?.value ?? '';
  return {
    status: value('status'),
    entity: value('entity'),
    file: value('file')
  };
}

/**
 * The address of the list with a filter changed: the others stay, the order
 * stays, and the list goes back to its first page. An empty value removes the
 * filter. The file name is a "like" filter, as the list reads it.
 */
export function filteredUrl(
  href: string,
  change: Partial<GridFilters>
): string {
  const url = new URL(href);
  const { searchParams } = url;
  searchParams.delete('page');
  if (change.status !== undefined) {
    if (change.status === '') searchParams.delete('status');
    else searchParams.set('status', change.status);
  }
  if (change.entity !== undefined) {
    if (change.entity === '') searchParams.delete('entity');
    else searchParams.set('entity', change.entity);
  }
  if (change.file !== undefined) {
    const text = change.file.trim();
    if (text === '') {
      searchParams.delete('file[operation]');
      searchParams.delete('file[value]');
    } else {
      searchParams.set('file[operation]', 'like');
      searchParams.set('file[value]', text);
    }
  }
  return url.href;
}

/** The address of the list with no filter, no order and no page. */
export function clearedUrl(href: string): string {
  const url = new URL(href);
  url.search = '';
  return url.href;
}

/** A number of the counts of a job, or null when the job has not counted it yet. */
export function countOf(
  counts: Record<string, unknown> | null | undefined,
  key: 'total' | 'created' | 'updated' | 'failed'
): number | null {
  const value = counts?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
