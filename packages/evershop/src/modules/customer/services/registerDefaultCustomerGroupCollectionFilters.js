const {
  OPERATION_MAP
} = require('@evershop/evershop/src/lib/util/filterOperationMapp');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');

module.exports =
  async function registerDefaultCustomerGroupCollectionFilters() {
    // List of default supported filters
    const defaultFilters = [
      {
        key: 'name',
        operation: ['like'],
        callback: (query, operation, value, currentFilters) => {
          query.andWhere(
            'customer_group.group_name',
            OPERATION_MAP[operation],
            `%${value}%`
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
          const customerGroupCollectionSortBy = getValueSync(
            'customerGroupCollectionSortBy',
            {
              name: (query) => query.orderBy('customer_group.group_name')
            }
          );

          if (customerGroupCollectionSortBy[value]) {
            customerGroupCollectionSortBy[value](query, operation);
            currentFilters.push({
              key: 'ob',
              operation,
              value
            });
          }
        }
      }
    ];

    return defaultFilters;
  };
