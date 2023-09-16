const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const uniqid = require('uniqid');
const { select, value, node } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

class ProductCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
  }

  async init(args, { filters = [] }, { user }) {
    if (!user) {
      this.baseQuery.andWhere('product.status', '=', 1);
      if (getConfig('catalog.showOutOfStockProduct', false) === false) {
        this.baseQuery
          .andWhere('product_inventory.manage_stock', '=', false)
          .addNode(
            node('OR')
              .addLeaf('AND', 'product_inventory.qty', '>', 0)
              .addLeaf('AND', 'product_inventory.stock_availability', '=', true)
          );
      }
    }
    const currentFilters = [];
    // Keyword filter
    const keywordFilter = filters.find((f) => f.key === 'keyword');
    if (keywordFilter) {
      const where = this.baseQuery.getWhere();
      const bindingKey = `keyword_${uniqid()}`;
      where.addRaw(
        'AND',
        `to_tsvector('simple', product_description.name || ' ' || product_description.description) @@ websearch_to_tsquery('simple', :${bindingKey})`,
        {
          [bindingKey]: keywordFilter.value
        }
      );
      currentFilters.push({
        key: 'keyword',
        operation: '=',
        value: keywordFilter.value
      });
    }

    // Price filter
    const minPrice = filters.find((f) => f.key === 'minPrice');
    const maxPrice = filters.find((f) => f.key === 'maxPrice');
    if (minPrice && Number.isNaN(parseFloat(minPrice.value)) === false) {
      this.baseQuery.andWhere('product.price', '>=', minPrice.value);
      currentFilters.push({
        key: 'minPrice',
        operation: '=',
        value: minPrice.value
      });
    }
    if (maxPrice && Number.isNaN(parseFloat(maxPrice.value)) === false) {
      this.baseQuery.andWhere('product.price', '<=', maxPrice.value);
      currentFilters.push({
        key: 'maxPrice',
        operation: '=',
        value: maxPrice.value
      });
    }

    // Name filter
    const nameFilter = filters.find((f) => f.key === 'name');
    if (nameFilter) {
      this.baseQuery.andWhere(
        'product_description.name',
        'ILIKE',
        `%${nameFilter.value}%`
      );
      currentFilters.push({
        key: 'name',
        operation: '=',
        value: nameFilter.value
      });
    }

    // Qty filter
    const qtyFilter = filters.find((f) => f.key === 'qty');
    if (qtyFilter) {
      const [min, max] = qtyFilter.value.split('-').map((v) => parseFloat(v));
      let currentQtyFilter;
      if (Number.isNaN(min) === false) {
        this.baseQuery.andWhere('product_inventory.qty', '>=', min);
        currentQtyFilter = { key: 'qty', operation: '=', value: `${min}` };
      }

      if (Number.isNaN(max) === false) {
        this.baseQuery.andWhere('product_inventory.qty', '<=', max);
        currentQtyFilter = {
          key: 'qty',
          operation: '=',
          value: `${currentQtyFilter.value}-${max}`
        };
      }
      if (currentQtyFilter) {
        currentFilters.push(currentQtyFilter);
      }
    }

    // Sku filter
    const skuFilter = filters.find((f) => f.key === 'sku');
    if (skuFilter) {
      // Support like, equal and IN
      if (['LIKE', 'like'].includes(skuFilter.operation)) {
        this.baseQuery.andWhere('product.sku', 'ILIKE', `%${skuFilter.value}%`);
        currentFilters.push({
          key: 'sku',
          operation: 'like',
          value: skuFilter.value
        });
      } else if (['IN', 'in'].includes(skuFilter.operation)) {
        const values = skuFilter.value
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        if (values.length > 0) {
          this.baseQuery.andWhere('product.sku', 'IN', values);
          currentFilters.push({
            key: 'sku',
            operation: 'in',
            value: values.join(',')
          });
        }
      } else {
        this.baseQuery.andWhere('product.sku', '=', skuFilter.value);
        currentFilters.push({
          key: 'sku',
          operation: '=',
          value: skuFilter.value
        });
      }
    }

    // Status filter
    const statusFilter = filters.find((f) => f.key === 'status');
    if (statusFilter) {
      this.baseQuery.andWhere('product.status', '=', statusFilter.value);
      currentFilters.push({
        key: 'status',
        operation: '=',
        value: statusFilter.value
      });
    }

    // Apply category filters
    const categoryFilter = filters.find((f) => f.key === 'cat');
    if (categoryFilter) {
      const values = categoryFilter.value
        .split(',')
        .map((v) => parseInt(v, 10))
        .filter((v) => Number.isNaN(v) === false);
      this.baseQuery.andWhere('product.category_id', 'IN', values);

      currentFilters.push({
        key: 'cat',
        operation: '=',
        value: values.join(',')
      });
    }

    // Attribute filter
    const filterableAttributes = await select()
      .from('attribute')
      .where('type', '=', 'select')
      .and('is_filterable', '=', 1)
      .execute(pool);
    // Attribute filters
    filters.forEach((filter) => {
      const attribute = filterableAttributes.find(
        (a) => a.attribute_code === filter.key
      );
      if (!attribute) {
        return;
      }

      const values = filter.value
        .split(',')
        .map((v) => parseInt(v, 10))
        .filter((v) => Number.isNaN(v) === false);
      if (values.length > 0) {
        const alias = `attribute_${uniqid()}`;
        this.baseQuery
          .innerJoin('product_attribute_value_index', alias)
          .on(`${alias}.product_id`, '=', 'product.product_id')
          .and(`${alias}.attribute_id`, '=', value(attribute.attribute_id))
          .and(`${alias}.option_id`, 'IN', value(values));
      }
      currentFilters.push({
        key: filter.key,
        operation: filter.operation,
        value: values.join(',')
      });
    });

    const sortBy = filters.find((f) => f.key === 'sortBy');
    const sortOrder = filters.find(
      (f) =>
        f.key === 'sortOrder' &&
        ['ASC', 'DESC', 'asc', 'desc'].includes(f.value)
    ) || { value: 'DESC' };
    if (sortBy && sortBy.value === 'price') {
      this.baseQuery.orderBy('product.price', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else if (sortBy && sortBy.value === 'name') {
      this.baseQuery.orderBy('product_description.name`', sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
    } else {
      this.baseQuery.orderBy('product.product_id', sortOrder.value);
    }
    if (sortOrder.key) {
      currentFilters.push({
        key: 'sortOrder',
        operation: '=',
        value: sortOrder.value
      });
    }

    if (!user) {
      // Visibility. For variant group
      const copy = this.baseQuery.clone();
      // Get all group that have at lease 1 item visibile
      const visibleGroups = (
        await select('variant_group_id')
          .from('variant_group')
          .where('visibility', '=', 't')
          .execute(pool)
      ).map((v) => v.variant_group_id);

      if (visibleGroups) {
        // Get all invisible variants from current query
        copy
          .select('bool_or(product.visibility)', 'sumv')
          .select('max(product.product_id)', 'product_id')
          .andWhere('product.variant_group_id', 'IN', visibleGroups);
        copy.groupBy('product.variant_group_id');
        copy.orderBy('product.variant_group_id', 'ASC');
        copy.having('bool_or(product.visibility)', '=', 'f');
        const invisibleIds = (await copy.execute(pool)).map(
          (v) => v.product_id
        );
        if (invisibleIds.length > 0) {
          const n = node('AND');
          n.addLeaf('AND', 'product.product_id', 'IN', invisibleIds).addNode(
            node('OR').addLeaf('OR', 'product.visibility', '=', 't')
          );
          this.baseQuery.getWhere().addNode(n);
        } else {
          this.baseQuery.andWhere('product.visibility', '=', 't');
        }
      } else {
        this.baseQuery.andWhere('product.visibility', '=', 't');
      }
    }

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(product.product_id)', 'total');
    totalQuery.removeOrderBy();
    // Paging
    const page = filters.find((f) => f.key === 'page') || { value: 1 };
    const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from the config
    currentFilters.push({
      key: 'page',
      operation: '=',
      value: page.value
    });
    currentFilters.push({
      key: 'limit',
      operation: '=',
      value: limit.value
    });
    this.baseQuery.limit(
      (page.value - 1) * parseInt(limit.value, 10),
      parseInt(limit.value, 10)
    );
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

module.exports.ProductCollection = ProductCollection;
