const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

class CollectionCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(args, { filters = [] }) {
    const currentFilters = [];
    // Name filter
    const nameFilter = filters.find((f) => f.key === 'name');
    if (nameFilter) {
      this.baseQuery.andWhere(
        'collection.name',
        'ILIKE',
        `%${nameFilter.value}%`
      );
      currentFilters.push({
        key: 'name',
        operation: '=',
        value: nameFilter.value
      });
    }

    // Code filter
    const codeFilter = filters.find((f) => f.key === 'code');
    if (codeFilter) {
      this.baseQuery.andWhere(
        'collection.code',
        'ILIKE',
        `%${codeFilter.value}%`
      );
      currentFilters.push({
        key: 'code',
        operation: '=',
        value: codeFilter.value
      });
    }

    const sortBy = filters.find((f) => f.key === 'sortBy');
    const sortOrder = filters.find(
      (f) =>
        f.key === 'sortOrder' &&
        ['ASC', 'DESC', 'asc', 'desc'].includes(f.value)
    ) || { value: 'DESC' };
    if (sortBy && sortBy.value === 'name') {
      this.baseQuery.orderBy('collection.name', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else {
      this.baseQuery.orderBy('collection.collection_id', 'DESC');
    }
    if (sortOrder.key) {
      currentFilters.push({
        key: 'sortOrder',
        operation: '=',
        value: sortOrder.value
      });
    }
    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.removeOrderBy();
    totalQuery.select('COUNT(collection.collection_id)', 'total');
    // Paging
    const page = filters.find((f) => f.key === 'page') || { value: 1 };
    const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from config
    currentFilters.push({
      key: 'page',
      operation: '=',
      value: page.value
    });
    currentFilters.push({
      key: 'limit',
      operation: '=',
      value: limit.value
    });

    this.baseQuery.limit(
      (page.value - 1) * parseInt(limit.value, 10),
      parseInt(limit.value, 10)
    );
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

module.exports.CollectionCollection = CollectionCollection;
