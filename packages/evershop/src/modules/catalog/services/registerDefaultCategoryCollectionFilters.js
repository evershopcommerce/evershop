import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export default async function registerDefaultCategoryCollectionFilters() {
  const { isAdmin } = this;
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'category_description.name',
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
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('category.status', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'status',
          operation,
          value
        });
      }
    },
    {
      key: 'parent',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        if (value === null) {
          query.andWhere('category.parent_id', 'IS NULL');
        } else {
          query.andWhere('category.parent_id', OPERATION_MAP[operation], value);
        }
        currentFilters.push({
          key: 'parent',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const categorySortBy = getValueSync(
          'categoryCollectionSortBy',
          {
            name: (query) => query.orderBy('category_description.name'),
            status: (query) => query.orderBy('category.status')
          },
          {
            isAdmin
          }
        );

        if (categorySortBy[value]) {
          categorySortBy[value](query, operation);
          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        } else {
          query.orderBy('category.category_id', 'DESC');
        }
      }
    }
  ];

  return defaultFilters;
}
