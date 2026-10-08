import { node, select, sql } from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';
import { getShowOutOfStockProducts } from './catalogSettings.js';

export class ProductCollection {
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
      if (getShowOutOfStockProducts() === false) {
        // Wrap the disjunction in its own node — see Variant.resolvers.js:
        // the chained .andWhere(...).addNode(node('OR')...) form leaks every
        // later condition (visibility, url filters) into the OR's right
        // operand, letting manage_stock=false products bypass them.
        const stockFilter = node('AND');
        stockFilter.addLeaf(
          'AND',
          'product_inventory.manage_stock',
          '=',
          false
        );
        stockFilter.addNode(
          node('OR')
            .addLeaf('AND', 'product_inventory.qty', '>', 0)
            .addLeaf('AND', 'product_inventory.stock_availability', '=', true)
        );
        this.baseQuery.getWhere().addNode(stockFilter);
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
    // Sequential and awaited. Most filter callbacks are synchronous and
    // awaiting a non-promise is a no-op, but `cat` has to resolve a category
    // subtree before it can build its predicate — inlining that lookup as a
    // recursive-CTE subquery instead costs PRODUCT_CATEGORY_ID_INDEX and
    // seq-scans the product table (measured 32x on a narrow category at 300k
    // products). Sequential rather than parallel because every callback mutates
    // the same query object.
    for (const filter of productCollectionFilters) {
      const check =
        filters &&
        filters.find(
          (f) => f.key === filter.key && filter.operation.includes(f.operation)
        );
      if (filter.key === '*' || check) {
        // `pool` rides on the context so a filter needing a lookup stays
        // injectable for tests rather than reaching for the module-level pool.
        await filter.callback.apply({ isAdmin, pool }, [
          this.baseQuery,
          check?.operation,
          check?.value,
          currentFilters
        ]);
      }
    }

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
      // Admin listing shows ONE row per variant group. Keep the dedup entirely
      // in SQL as a semi-join subquery: the previous implementation pulled
      // every collapsed product_id into Node and fed them back as an IN list,
      // which built an O(n²) parameter clause (minutes of blocked event loop
      // on large catalogs) and then died on the wire protocol's 65,535
      // parameter limit anyway.
      const onePerVariantGroupQuery = this.baseQuery.clone();
      onePerVariantGroupQuery.removeLimit();
      onePerVariantGroupQuery.removeOrderBy();
      onePerVariantGroupQuery.select(
        sql(
          'DISTINCT ON (COALESCE(product.variant_group_id, -product.product_id)) product.product_id',
          'product_id'
        )
      );
      // Render the (already filtered) clone and re-key its bindings —
      // clone() preserves binding keys, so embedding the rendered SQL without
      // re-keying would duplicate keys with the outer query and break the
      // named-to-positional conversion at execute time.
      let dedupSql = await onePerVariantGroupQuery.sql();
      const dedupBinding = {};
      Object.entries(onePerVariantGroupQuery.getBinding()).forEach(
        ([key, bindValue], index) => {
          const newKey = `dedup${index}x${uniqid()}`;
          dedupSql = dedupSql.replace(
            new RegExp(`:${key}\\b`, 'g'),
            `:${newKey}`
          );
          dedupBinding[newKey] = bindValue;
        }
      );
      // Deterministic representative (highest product_id per group) — the old
      // random() picked a different representative on every request, which
      // made pagination unstable. DISTINCT ON takes the first row per group
      // in this order.
      dedupSql += ` ORDER BY COALESCE(product.variant_group_id, -product.product_id), product.product_id DESC`;
      this.baseQuery
        .getWhere()
        .addRaw('AND', `product.product_id IN (${dedupSql})`, dedupBinding);
    }

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(product.product_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();
    // A COUNT does not need joins nothing references, and the planner cannot
    // always drop them itself: it removes the `product_description` LEFT JOIN
    // (a unique index proves no fan-out) but keeps `product_image`, where no
    // unique index covers the join key and `AND is_main` is not something it
    // can use to prove uniqueness. Measured on a 300k catalog: 50.7ms with that
    // join, 26.5ms without, identical answer. Joins that ARE referenced stay —
    // the collection base query puts `product_collection.collection_id` in its
    // WHERE — and INNER JOINs are never touched, since they filter rows.
    //
    // Side benefit: `product_image` is the one joined table that can genuinely
    // fan out (nothing stops two rows with is_main = true), so today's count is
    // inflated when that invariant breaks. Dropping the join makes the count
    // correct; the items query still duplicates, which is a separate fix.
    totalQuery.pruneUnreferencedLeftJoins();

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
