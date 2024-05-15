const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getValue,
  getValueSync
} = require('@evershop/evershop/src/lib/util/registry');
const {
  OPERATION_MAP
} = require('@evershop/evershop/src/lib/util/filterOperationMapp');

class AttributeGroupCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(filters = []) {
    const currentFilters = [];
    const defaultFilters = [
      {
        key: 'name',
        operation: ['eq', 'like', 'nlike'],
        callback: (query, operation, value, currentFilters) => {
          query.andWhere(
            'attribute_group.group_name',
            OPERATION_MAP[operation],
            value
          );
          currentFilters.push({
            key: 'name',
            operation,
            value
          });
        }
      },
      {
        key: 'ob',
        operation: ['eq'],
        callback: (query, operation, value, currentFilters) => {
          const attributeGroupsSortBy = getValueSync('attributeGroupsSortBy', {
            name: (query) => query.orderBy('attribute_group.group_name')
          });

          if (attributeGroupsSortBy[value]) {
            attributeGroupsSortBy[value](query, operation);
            currentFilters.push({
              key: 'ob',
              operation,
              value
            });
          }
        }
      }
    ];
    // Apply the filters
    const attributeGroupCollectionFilters = await getValue(
      'attributeGroupCollectionFilters',
      defaultFilters
    );

    attributeGroupCollectionFilters.forEach((filter) => {
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
    totalQuery.select('COUNT(attribute_group.attribute_group_id)', 'total');
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

module.exports.AttributeGroupCollection = AttributeGroupCollection;
