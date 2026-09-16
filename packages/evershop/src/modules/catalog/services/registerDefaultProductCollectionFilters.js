import { value } from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { resolveCategorySubtree } from './resolveCategorySubtree.js';

export default async function registerDefaultProductCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const where = query.getWhere();
        const bindingKey = `keyword_${uniqid()}`;
        // Evaluate the full-text match in a MATERIALIZED CTE so the planner
        // always answers it with the PRODUCT_SEARCH_INDEX GIN index. With the
        // predicate inlined, the outer ORDER BY + LIMIT made the planner walk
        // an index computing to_tsvector() row by row — fast for common
        // terms, a full-table scan (seconds on large catalogs) for rare or
        // unmatched ones. The old `%…%` wrapping is dropped: `%` is a LIKE
        // wildcard, websearch_to_tsquery treats it as punctuation.
        where.addRaw(
          'AND',
          `product.product_id IN (
            WITH keyword_matches AS MATERIALIZED (
              SELECT product_description_product_id FROM product_description
              WHERE to_tsvector('simple', name || ' ' || description) @@ websearch_to_tsquery('simple', :${bindingKey})
            )
            SELECT product_description_product_id FROM keyword_matches
          )`,
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
      callback: async function catFilter(
        query,
        operation,
        value,
        currentFilters
      ) {
        // Match the whole SUBTREE, not just the selected row. A product carries
        // exactly one category (`product_category` was dropped in migration
        // Version-1.0.2) and normally sits on a leaf, so an exact match against
        // a branch category returns nothing. That also made the category page
        // contradict itself: its listing is subtree-aware
        // (getProductsByCategoryBaseQuery(id, true)) while this facet was not,
        // so ticking a child category made its grandchildren's products vanish
        // from a list that had just shown them.
        const ids = String(value)
          .split(',')
          .map((v) => parseInt(v, 10))
          .filter((v) => Number.isInteger(v) && v > 0);
        if (ids.length === 0) {
          return;
        }
        // Resolved in Node, then passed as ONE array parameter. Inlining the
        // recursive CTE as a subquery here costs the index: the planner cannot
        // estimate a recursive CTE, drops PRODUCT_CATEGORY_ID_INDEX and
        // seq-scans `product` — measured 32x slower on a narrow category at
        // 300k products. See resolveCategorySubtree for the full note.
        const subtree = await resolveCategorySubtree(ids, this?.pool);
        if (subtree.length === 0) {
          return;
        }
        const bindingKey = `cat_${uniqid()}`;
        // `<> ALL` rather than `NOT IN` for the negative case: same
        // three-valued logic (a NULL category_id is excluded either way,
        // matching the previous NOT IN behavior), but it takes the array
        // parameter instead of one binding per id.
        const predicate =
          operation === 'nin'
            ? `product.category_id <> ALL(:${bindingKey}::int[])`
            : `product.category_id = ANY(:${bindingKey}::int[])`;
        query.getWhere().addRaw('AND', predicate, { [bindingKey]: subtree });
        // Push the ORIGINAL ids, never the expansion. DefaultCategoryFilterRender
        // reads this value for isCategorySelected() and getSelectedCount(), so
        // an expanded list would tick every descendant's checkbox and inflate
        // the "N selected" badge.
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
      operation: ['in', 'eq'],
      callback: (query, operation, val, currentFilters) => {
        const alias = `attribute_${uniqid()}`;
        // Split the value by comma and only get the positive integer
        if (operation === 'in') {
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
        } else if (operation === 'eq') {
          const valueInt = parseInt(val, 10);
          if (valueInt > 0) {
            query
              .innerJoin('product_attribute_value_index', alias)
              .on(`${alias}.product_id`, '=', 'product.product_id')
              .and(`${alias}.attribute_id`, '=', value(attribute.attribute_id))
              .and(`${alias}.option_id`, '=', value(valueInt));
            currentFilters.push({
              key: attribute.attribute_code,
              operation,
              value: val
            });
          }
        }
      }
    });
  });

  return defaultFilters;
}
