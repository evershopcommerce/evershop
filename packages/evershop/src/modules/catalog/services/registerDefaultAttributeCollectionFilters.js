import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export default async function registerDefaultAttributeCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'name',
      operation: ['like', 'nlike'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'attribute.attribute_name',
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
      key: 'code',
      operation: ['eq', 'like', 'nlike', 'in'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'in') {
          query.andWhere(
            'attribute.attribute_code',
            OPERATION_MAP[operation],
            value.split(',')
          );
        } else if (operation === 'eq') {
          query.andWhere(
            'attribute.attribute_code',
            OPERATION_MAP[operation],
            value
          );
        } else {
          query.andWhere(
            'attribute.attribute_code',
            OPERATION_MAP[operation],
            `%${value}%`
          );
        }
        currentFilters.push({
          key: 'code',
          operation,
          value
        });
      }
    },
    {
      key: 'group',
      operation: ['in', 'eq'],
      callback: (query, operation, value, currentFilters) => {
        query
          .innerJoin('attribute_group_link')
          .on(
            'attribute.attribute_id',
            '=',
            'attribute_group_link.attribute_id'
          );
        query.andWhere(
          'attribute_group_link.group_id',
          OPERATION_MAP[operation],
          value
        );
        currentFilters.push({
          key: 'group',
          operation,
          value
        });
      }
    },
    {
      key: 'type',
      operation: ['eq', 'neq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('attribute.type', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'type',
          operation,
          value
        });
      }
    },
    {
      key: 'is_required',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'attribute.is_required',
          OPERATION_MAP[operation],
          value
        );
        currentFilters.push({
          key: 'is_required',
          operation,
          value
        });
      }
    },
    {
      key: 'is_filterable',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'attribute.is_filterable',
          OPERATION_MAP[operation],
          value
        );
        currentFilters.push({
          key: 'is_filterable',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const attributeCollectionSortBy = getValueSync(
          'attributeCollectionSortBy',
          {
            name: (query) => query.orderBy('attribute.name'),
            type: (query) => query.orderBy('attribute.type'),
            is_required: (query) => query.orderBy('attribute.is_required'),
            is_filterable: (query) => query.orderBy('attribute.is_filterable')
          }
        );

        if (attributeCollectionSortBy[value]) {
          attributeCollectionSortBy[value](query, operation);
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
