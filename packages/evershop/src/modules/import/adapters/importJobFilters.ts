import { LISTED_STATUSES } from '../services/job/types.js';
import type { JobStatus } from '../services/job/types.js';
import { IMPORT_ENTITIES } from '../services/types.js';

// What the list can be ordered by: the key in the URL and the column.
const SORT_COLUMNS: Record<string, string> = {
  created_at: 'import_job.created_at',
  entity: 'import_job.entity',
  status: 'import_job.status',
  file_name: 'import_job.file_name',
  file_size: 'import_job.file_size'
};

/** The keys of `ob` that the list accepts: the grid's sortable headers are named from these. */
export const SORT_KEYS: readonly string[] = Object.keys(SORT_COLUMNS);

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * The filters of the list of imports (§ 8.1): the registry key
 * `importJobCollectionFilters` takes these and the standard pagination. A value
 * that is not one of the known ones is left out: it is an address typed by hand.
 */
export function registerDefaultImportJobFilters() {
  return [
    {
      key: 'status',
      operation: ['eq'],
      callback: (
        query: any,
        operation: string,
        value: unknown,
        currentFilters: unknown[]
      ) => {
        if (LISTED_STATUSES.includes(value as JobStatus)) {
          query.andWhere('import_job.status', '=', value);
          currentFilters.push({ key: 'status', operation, value });
        }
      }
    },
    {
      key: 'entity',
      operation: ['eq'],
      callback: (
        query: any,
        operation: string,
        value: unknown,
        currentFilters: unknown[]
      ) => {
        if (Object.keys(IMPORT_ENTITIES).includes(String(value))) {
          query.andWhere('import_job.entity', '=', value);
          currentFilters.push({ key: 'entity', operation, value });
        }
      }
    },
    {
      key: 'file',
      operation: ['like'],
      callback: (
        query: any,
        operation: string,
        value: unknown,
        currentFilters: unknown[]
      ) => {
        const text = String(value ?? '').trim();
        if (text !== '') {
          query.andWhere(
            'import_job.file_name',
            'ILIKE',
            `%${escapeLike(text)}%`
          );
          currentFilters.push({ key: 'file', operation, value: text });
        }
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (
        query: any,
        operation: string,
        value: unknown,
        currentFilters: unknown[]
      ) => {
        const column = SORT_COLUMNS[String(value)];
        if (column) {
          // The builder keeps one order: the default (newest first) gives way.
          query.orderBy(column);
          currentFilters.push({ key: 'ob', operation, value });
        }
      }
    }
  ];
}
