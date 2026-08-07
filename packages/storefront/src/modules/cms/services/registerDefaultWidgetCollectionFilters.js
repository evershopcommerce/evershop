import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export async function registerDefaultWidgetCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'eq') {
          query.andWhere('widget.name', '=', value);
        } else {
          query.andWhere('widget.name', 'ilike', `%${value}%`);
        }
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
        query.andWhere('widget.status', OPERATION_MAP[operation], value);
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
        const widgetCollectionSortBy = getValueSync('widgetCollectionSortBy', {
          name: (query) => query.orderBy('widget.name'),
          type: (query) => query.orderBy('widget.type'),
          area: (query) => query.orderBy('widget.area'),
          route: (query) => query.orderBy('widget.route'),
          status: (query) => query.orderBy('widget.status')
        });

        if (widgetCollectionSortBy[value]) {
          widgetCollectionSortBy[value](query, operation);
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
}
