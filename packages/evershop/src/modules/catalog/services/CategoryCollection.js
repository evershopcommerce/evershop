import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

export class CategoryCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('category.category_id', 'DESC');
  }

  async init(filters = [], isAdmin = false) {
    if (!isAdmin) {
      this.baseQuery.andWhere('category.status', '=', 1);
    }
    const currentFilters = [];

    // Apply the filters
    const categoryCollectionFilters = await getValue(
      'categoryCollectionFilters',
      [],
      {
        isAdmin
      }
    );

    categoryCollectionFilters.forEach((filter) => {
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

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(category.category_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items() {
    const items = await this.baseQuery.execute(pool);
    return items.map((row) => camelCase(row));
  }

  async total() {
    // Call items to get the total
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }

  currentFilters() {
    return this.currentFilters;
  }
}
