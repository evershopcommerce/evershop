const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

const { select, node, sql } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getValue } = require('@evershop/evershop/src/lib/util/registry');

class ProductCollection {
  constructor(baseQuery) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('product.product_id', 'DESC');
  }

  /**
   *
   * @param {{key: String, operation: String, value: String}[]} filters
   * @param {boolean} isAdmin
   */
  async init(filters = [], isAdmin = false) {
    // If the user is not admin, we need to filter out the out of stock products and the disabled products
    if (!isAdmin) {
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
    // Attribute filter
    const filterableAttributes = await select()
      .from('attribute')
      .where('type', '=', 'select')
      .and('is_filterable', '=', 1)
      .execute(pool);
    // Apply the filters
    const productCollectionFilters = await getValue(
      'productCollectionFilters',
      [],
      {
        isAdmin,
        filterableAttributes
      }
    );

    productCollectionFilters.forEach((filter) => {
      const check = filters.find(
        (f) => f.key === filter.key && filter.operation.includes(f.operation)
      );
      if (filter.key === '*' || check) {
        filter.callback(
          this.baseQuery,
          check?.operation,
          check?.value,
          currentFilters
        );
      }
    });

    if (!isAdmin) {
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
    } else {
      const onePerVariantGroupQuery = this.baseQuery.clone();
      onePerVariantGroupQuery.removeLimit();
      onePerVariantGroupQuery.select(
        sql(
          'DISTINCT ON (COALESCE(product.variant_group_id, random())) product.product_id',
          'product_id'
        )
      );
      onePerVariantGroupQuery.removeOrderBy();
      const onePerGroup = await onePerVariantGroupQuery.execute(pool);
      this.baseQuery.andWhere(
        'product.product_id',
        'IN',
        onePerGroup.map((v) => v.product_id)
      );
    }

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(product.product_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

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
