const {
  OPERATION_MAP
} = require('@evershop/evershop/src/lib/util/filterOperationMapp');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');

module.exports = async function registerDefaultCustomerCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query
          .andWhere('customer.full_name', 'ILIKE', `%${value}%`)
          .or('customer.email', 'ILIKE', `%${value}%`);
        currentFilters.push({
          key: 'keyword',
          operation,
          value
        });
      }
    },
    {
      key: 'full_name',
      operation: ['like', 'nlike'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'customer.full_name',
          OPERATION_MAP[operation],
          `%${value}%`
        );
        currentFilters.push({
          key: 'full_name',
          operation,
          value
        });
      }
    },
    {
      key: 'email',
      operation: ['eq', 'like', 'nlike'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('customer.email', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'email',
          operation,
          value
        });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('customer.status', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'status',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const customerCollectionSortBy = getValueSync(
          'customerCollectionSortBy',
          {
            email: (query) => query.orderBy('customer.email'),
            name: (query) => query.orderBy('customer.full_name'),
            status: (query) => query.orderBy('customer.status'),
            created_at: (query) => query.orderBy('customer.created_at')
          }
        );

        if (customerCollectionSortBy[value]) {
          customerCollectionSortBy[value](query, operation);
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
