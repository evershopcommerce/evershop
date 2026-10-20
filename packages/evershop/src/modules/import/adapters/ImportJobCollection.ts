import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

interface Filter {
  key: string;
  operation: string;
  value: unknown;
}

/**
 * The imports, newest first, with the standard filter and pagination machinery
 * of the admin grids (registry key `importJobCollectionFilters`): GraphQL calls
 * `items()` and `total()`. An upload that has not arrived yet is not a past
 * import and is left out. The name of the admin who uploaded is one more query
 * for the page, not a join, so that no column of another table is mixed in.
 */
export class ImportJobCollection {
  private baseQuery: any;

  private totalQuery: any;

  public currentFilters: Filter[] = [];

  public currentPage = 1;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.where('import_job.status', '<>', 'uploading');
    this.baseQuery.orderBy('import_job.import_job_id', 'DESC');
  }

  async init(filters: Filter[] = []): Promise<void> {
    const currentFilters: Filter[] = [];
    const registered = await getValue<any[]>('importJobCollectionFilters', []);
    registered.forEach((filter: any) => {
      const check = filters.find(
        (f) => f.key === filter.key && filter.operation.includes(f.operation)
      );
      if (filter.key === '*' || check) {
        filter.callback(
          this.baseQuery,
          check?.operation,
          check?.value,
          currentFilters
        );
      }
    });
    this.breakTies();
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(import_job.import_job_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();
    this.currentFilters = currentFilters;
    const pageFilter = currentFilters.find((f) => f.key === 'page');
    this.currentPage = pageFilter
      ? parseInt(String(pageFilter.value), 10) || 1
      : 1;
    this.totalQuery = totalQuery;
  }

  /**
   * The builder keeps one order key. A list sorted by a column that many jobs
   * share (the status) would give no fixed order inside a tie, so a job could be
   * on two pages, or on none. The id goes after the key, in the same direction.
   */
  private breakTies(): void {
    const order = this.baseQuery._orderBy;
    const render: () => string = order.render.bind(order);
    order.render = () => {
      const text = render();
      return text === '' || String(order._field).includes('import_job_id')
        ? text
        : `${text}, "import_job"."import_job_id" ${order._direction}`;
    };
  }

  async items(): Promise<Array<Record<string, unknown>>> {
    const rows = (await this.baseQuery.execute(pool)).map(
      (row: Record<string, unknown>) => camelCase(row)
    );
    const ids = [
      ...new Set(
        rows
          .map((row: Record<string, unknown>) => row.createdBy)
          .filter((id: unknown): id is number => typeof id === 'number')
      )
    ];
    const names = new Map<number, string>();
    if (ids.length > 0) {
      const found = await pool.query(
        'SELECT admin_user_id, full_name FROM admin_user WHERE admin_user_id = ANY($1::int[])',
        [ids]
      );
      for (const row of found.rows) {
        names.set(row.admin_user_id, row.full_name);
      }
    }
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      createdByName:
        typeof row.createdBy === 'number'
          ? names.get(row.createdBy) ?? null
          : null
    }));
  }

  async total(): Promise<number> {
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }
}
