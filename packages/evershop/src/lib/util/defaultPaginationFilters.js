const { CONSTANTS } = require('../helpers');

const defaultPaginationFilters = [
  {
    key: 'od',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      if (['ASC', 'DESC', 'asc', 'desc'].includes(value)) {
        query.orderDirection(value.toUpperCase());
        currentFilters.push({
          key: 'od',
          operation,
          value
        });
      }
    }
  },
  {
    key: 'page',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      if (parseInt(value, 10) > 0) {
        query.limit(
          (parseInt(value, 10) - 1) * CONSTANTS.ADMIN_COLLECTION_SIZE,
          CONSTANTS.ADMIN_COLLECTION_SIZE
        );
        currentFilters.push({
          key: 'page',
          operation,
          value
        });
      } else {
        query.limit(0, CONSTANTS.ADMIN_COLLECTION_SIZE);
        currentFilters.push({
          key: 'page',
          operation,
          value: 1
        });
      }
    }
  },
  {
    key: 'limit',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      if (parseInt(value, 10) > 0) {
        // Get the current page from the current filters
        const page = currentFilters.find((f) => f.key === 'page');
        if (page) {
          query.limit(
            (parseInt(page.value, 10) - 1) * parseInt(value, 10),
            parseInt(value, 10)
          );
        } else {
          query.limit(0, parseInt(value, 10));
          currentFilters.push({
            key: 'limit',
            operation: 'eq',
            value
          });
        }
        currentFilters.push({
          key: 'limit',
          operation,
          value
        });
      } else {
        currentFilters.push({
          key: 'limit',
          operation,
          value: CONSTANTS.ADMIN_COLLECTION_SIZE
        });
      }
    }
  },
  {
    key: '*',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      const page = currentFilters.find((f) => f.key === 'page') || { value: 1 };
      currentFilters.push({
        key: 'page',
        operation: 'eq',
        value: page.value
      });
      let limit = { value: Number.MAX_SAFE_INTEGER };

      // eslint-disable-next-line no-underscore-dangle
      const isCategory = query?._table === 'category';
      const hasParent = currentFilters.some(item => item.key === 'parent');
      const doNotSetLimit = isCategory && hasParent;
      
      if(!doNotSetLimit) {
        limit = currentFilters.find((f) => f.key === 'limit') || {
          value: CONSTANTS.ADMIN_COLLECTION_SIZE
        };
        currentFilters.push({
          key: 'limit',
          operation: 'eq',
          value: limit.value
        });
      }
     
      query.limit(
        (parseInt(page.value, 10) - 1) * parseInt(limit.value, 10),
        parseInt(limit.value, 10)
      );
    }
  }
];

module.exports = {
  defaultPaginationFilters
};
