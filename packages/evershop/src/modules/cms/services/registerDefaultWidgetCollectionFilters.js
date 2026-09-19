import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

/**
 * Default collection filters for the widget admin grid.
 *
 * Renamed in cms migration 1.3.0: `widget` → `widget_instance`.
 * `route` and `area` are no longer columns on `widget_instance` — they live on
 * `widget_placement`. Sort-by-area / sort-by-route is removed for now; if a
 * future admin grid needs to surface placements, it can join the placement
 * table explicitly.
 */
export async function registerDefaultWidgetCollectionFilters() {
  const defaultFilters = [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'eq') {
          query.andWhere('widget_instance.name', '=', value);
        } else {
          query.andWhere('widget_instance.name', 'ilike', `%${value}%`);
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
        query.andWhere(
          'widget_instance.status',
          OPERATION_MAP[operation],
          value
        );
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
          name: (q) => q.orderBy('widget_instance.name'),
          type: (q) => q.orderBy('widget_instance.type'),
          status: (q) => q.orderBy('widget_instance.status')
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
