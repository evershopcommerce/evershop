import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

interface Filter {
  key: string;
  operation: string;
  value: unknown;
}

/**
 * Paginated collection for blog posts (mirrors ProductCollection/CMSPageCollection).
 * Non-admin callers only see published posts (status = 1).
 */
export class BlogPostCollection {
  private baseQuery: any;

  private totalQuery: any;

  public currentFilters: Filter[] = [];

  public currentPage = 1;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('blog_post.published_at', 'DESC');
  }

  async init(filters: Filter[] = [], isAdmin = false): Promise<void> {
    if (!isAdmin) {
      this.baseQuery.andWhere('blog_post.status', '=', 1);
    }

    const currentFilters: Filter[] = [];
    const blogPostCollectionFilters = await getValue(
      'blogPostCollectionFilters',
      []
    );

    blogPostCollectionFilters.forEach((filter: any) => {
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

    // Clone for total before paging.
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(blog_post.blog_post_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilters = currentFilters;
    const pageFilter = currentFilters.find((f) => f.key === 'page');
    this.currentPage = pageFilter
      ? parseInt(String(pageFilter.value), 10) || 1
      : 1;
    this.totalQuery = totalQuery;
  }

  async items(): Promise<Array<Record<string, unknown>>> {
    const items = await this.baseQuery.execute(pool);
    return items.map((row: Record<string, unknown>) => camelCase(row));
  }

  async total(): Promise<number> {
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }
}
