const uniqid = require('uniqid');
const { value } = require('@evershop/postgres-query-builder');
const {
  OPERATION_MAP
} = require('@evershop/evershop/src/lib/util/filterOperationMapp');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');

module.exports = async function registerDefaultProductCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const where = query.getWhere();
        const bindingKey = `keyword_${uniqid()}`;
        where.addRaw(
          'AND',
          `to_tsvector('simple', product_description.name || ' ' || product_description.description) @@ websearch_to_tsquery('simple', :${bindingKey})`,
          {
            [bindingKey]: value
          }
        );
        currentFilters.push({
          key: 'keyword',
          operation,
          value
        });
      }
    },
    {
      key: 'min_price',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        // Check if the value is a positive number
        if (!Number.isNaN(parseFloat(value)) && parseFloat(value) > 0) {
          query.andWhere('product.price', '>=', parseFloat(value));
          currentFilters.push({
            key: 'min_price',
            operation,
            value
          });
        }
      }
    },
    {
      key: 'max_price',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        if (!Number.isNaN(parseFloat(value)) && parseFloat(value) > 0) {
          query.andWhere('product.price', '<=', parseFloat(value));
          currentFilters.push({
            key: 'max_price',
            operation,
            value
          });
        }
      }
    },
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'product_description.name',
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
      key: 'qty',
      operation: ['eq', 'gteq', 'lteq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'product_inventory.qty',
          OPERATION_MAP[operation],
          parseFloat(value) || 0
        );
        currentFilters.push({
          key: 'qty',
          operation,
          value
        });
      }
    },
    {
      key: 'sku',
      operation: ['like', 'in'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'product.sku',
          OPERATION_MAP[operation],
          value.split(',')
        );
        currentFilters.push({
          key: 'sku',
          operation,
          value
        });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('product.status', OPERATION_MAP[operation], value);
        currentFilters.push({
          key: 'status',
          operation,
          value
        });
      }
    },
    {
      key: 'type',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        if (['simple', 'configurable'].includes(value)) {
          switch (value) {
            case 'simple':
              query.andWhere('product.variant_group_id', 'IS NULL', null);
              break;
            case 'configurable':
              query.andWhere('product.variant_group_id', 'IS NOT NULL', null);
              break;
            default:
              break;
          }
          currentFilters.push({
            key: 'type',
            operation,
            value
          });
        }
      }
    },
    {
      key: 'cat',
      operation: ['eq', 'in', 'nin'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'product.category_id',
          OPERATION_MAP[operation],
          ['in', 'nin'].includes(operation) ? value.split(',') : value
        );
        currentFilters.push({
          key: 'cat',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const productSortBy = getValueSync(
          'productCollectionSortBy',
          {
            price: (query) => query.orderBy('product.price'),
            name: (query) => query.orderBy('product_description.name'),
            qty: (query) => query.orderBy('product_inventory.qty'),
            status: (query) => query.orderBy('product.status')
          },
          {
            isAdmin
          }
        );

        if (productSortBy[value]) {
          productSortBy[value](query, operation);
          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        } else {
          query.orderBy('product.product_id', 'DESC');
        }
      }
    }
  ];

  const { filterableAttributes } = this;
  const { isAdmin } = this;
  // Attribute filters
  filterableAttributes.forEach((attribute) => {
    defaultFilters.push({
      key: attribute.attribute_code,
      operation: ['in'],
      callback: (query, operation, val, currentFilters) => {
        const alias = `attribute_${uniqid()}`;
        // Split the value by comma and only get the positive integer
        const values = val
          .split(',')
          .map((v) => parseInt(v, 10))
          .filter((v) => v > 0);
        query
          .innerJoin('product_attribute_value_index', alias)
          .on(`${alias}.product_id`, '=', 'product.product_id')
          .and(`${alias}.attribute_id`, '=', value(attribute.attribute_id))
          .and(`${alias}.option_id`, 'IN', value(values));
        currentFilters.push({
          key: attribute.attribute_code,
          operation,
          value: val
        });
      }
    });
  });

  return defaultFilters;
};
