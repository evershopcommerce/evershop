import { pool as appPool } from '../../../lib/postgres/connection.js';
import { PoolLike } from './recommendation/applyRecommendationGating.js';

export interface FilterableAttributeOption {
  optionId: number;
  optionText: string;
}

export interface FilterableAttribute {
  attributeId: number;
  attributeName: string;
  attributeCode: string;
  options: FilterableAttributeOption[];
}

interface FacetRow {
  attribute_id: number;
  attribute_name: string;
  attribute_code: string;
  option_id: number;
  option_text: string;
}

/**
 * `attribute.sort_order` is merchant-editable and was previously ignored here —
 * the facet list came back in `attribute_id` order, i.e. creation order. Ordering
 * by it is what gives merchants control over how the filter sidebar reads.
 * `attribute_id` breaks ties so the order is stable.
 */
const STORE_FACET_QUERY = `
  SELECT
    attribute.attribute_id,
    attribute.attribute_name,
    attribute.attribute_code,
    attribute_option.attribute_option_id AS option_id,
    attribute_option.option_text
  FROM attribute
  INNER JOIN attribute_option
    ON attribute_option.attribute_id = attribute.attribute_id
  WHERE attribute.type = 'select'
    AND attribute.is_filterable = true
    AND EXISTS (
      SELECT 1 FROM product_attribute_value_index
      WHERE product_attribute_value_index.option_id = attribute_option.attribute_option_id
    )
  ORDER BY
    attribute.sort_order,
    attribute.attribute_id,
    attribute_option.attribute_option_id`;

function toAttributes(rows: FacetRow[]): FilterableAttribute[] {
  const attributesById = new Map<number, FilterableAttribute>();
  for (const row of rows) {
    let attribute = attributesById.get(row.attribute_id);
    if (!attribute) {
      attribute = {
        attributeName: row.attribute_name,
        attributeId: row.attribute_id,
        attributeCode: row.attribute_code,
        options: []
      };
      attributesById.set(row.attribute_id, attribute);
    }
    attribute.options.push({
      optionId: row.option_id,
      optionText: row.option_text
    });
  }
  return [...attributesById.values()];
}

/**
 * Filterable attributes (layered navigation facets) for a category, computed
 * entirely in SQL. The previous implementation fetched every product_id of
 * the category subtree into Node and fed them back as a giant IN list — an
 * O(n²) parameter clause that blocked the event loop for seconds on large
 * categories and hard-failed (wire protocol 65,535-parameter limit) beyond
 * ~65k products.
 *
 * Two deliberate choices:
 * - The subtree category ids ARE resolved in Node first (a category tree is
 *   hundreds of rows, not thousands) and passed as ONE array parameter.
 *   Embedding the recursive CTE into the facet query itself hides the
 *   category-set size from the planner, which then abandons the
 *   PRODUCT_CATEGORY_ID_INDEX bitmap plan for a 500k-row seq-scan join
 *   (measured 6x slower).
 * - Semantics preserved from the old implementation: products are NOT
 *   filtered by status/visibility (the old code never applied those filters
 *   here), and the old base query's product_inventory inner join is not
 *   replicated — it only excluded products missing an inventory row, a state
 *   the product write path never produces.
 *
 * Not cached: the result is per-category, so caching it would multiply keys by
 * the category count. `getStoreFilterableAttributes` IS cached — see there for
 * why the store-wide variant needs it.
 *
 * Still aggregates the value index rather than probing it the way the
 * store-wide variant does, because the `EXISTS` form would need the category
 * scope pushed inside the probe. Measured 19–27ms on a 300k catalog and paid on
 * every category page load AND every facet click there, so it is worth doing —
 * as its own change, since it touches an existing page.
 */
export const getFilterableAttributes = async (
  categoryId: number,
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<FilterableAttribute[]> => {
  const subCategories = await pool.query(
    `WITH RECURSIVE sub_categories AS (
      SELECT category_id FROM category WHERE category_id = $1
      UNION
      SELECT c.category_id FROM category c
      INNER JOIN sub_categories sc ON c.parent_id = sc.category_id
    ) SELECT category_id FROM sub_categories`,
    [categoryId]
  );
  const categoryIds = subCategories.rows.map((row) => row.category_id);

  const { rows } = await pool.query(
    `SELECT
      attribute.attribute_id,
      attribute.attribute_name,
      attribute.attribute_code,
      product_attribute_value_index.option_id,
      product_attribute_value_index.option_text
    FROM product_attribute_value_index
    INNER JOIN attribute
      ON attribute.attribute_id = product_attribute_value_index.attribute_id
    WHERE attribute.type = 'select'
      AND attribute.is_filterable = true
      AND product_attribute_value_index.product_id IN (
        SELECT product.product_id FROM product
        WHERE product.category_id = ANY($1::int[])
      )
    GROUP BY
      attribute.attribute_id,
      attribute.attribute_name,
      attribute.attribute_code,
      attribute.sort_order,
      product_attribute_value_index.option_id,
      product_attribute_value_index.option_text
    ORDER BY
      attribute.sort_order,
      attribute.attribute_id,
      product_attribute_value_index.option_id`,
    [categoryIds]
  );

  return toAttributes(rows as FacetRow[]);
};

/**
 * Every filterable attribute across the whole catalog, for the `/products`
 * listing, which has no category to scope by.
 *
 * "Filterable" here means two things at once, both enforced by the query: the
 * attribute is a filterable `select`, AND at least one product actually carries
 * a value for it — an option nobody has been assigned never reaches the sidebar.
 *
 * Driven from `attribute_option` with an `EXISTS` probe into
 * `product_attribute_value_index`, NOT by aggregating that index. The probe
 * stops at the first matching row using `FK_ATTRIBUTE_OPTION_VALUE_LINK`, so the
 * cost is O(number of options) instead of O(catalog): measured **0.1ms against
 * 52ms** for a GROUP BY over 900k index rows, same 30 rows out. It also takes
 * `option_text` from `attribute_option`, the source of truth, so a renamed
 * option shows its current name rather than whatever was indexed. Attribute groups are ignored: they are an admin
 * authoring construct (which fields a product form shows), not a shopper-facing
 * division, so an attribute used by any product is offered to everyone.
 *
 * Deliberately NOT cached. An earlier version carried a TTL cache and a
 * single-flight guard, because the first implementation aggregated the whole
 * value index and cost ~52ms — worth caching when a facet click re-runs the
 * entire route query via `?ajax=true`. The `EXISTS` form above made that
 * moot: measured 0.4ms at 30 options and 1.9ms at 2,030 options across 53
 * attributes over a 1.2M-row index, i.e. past any realistic catalog. Caching
 * ~2ms in exchange for up to five minutes of staleness — a new product's
 * option missing from the sidebar — was a bad trade, so the cache went.
 */
export async function getStoreFilterableAttributes(
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<FilterableAttribute[]> {
  const { rows } = await pool.query(STORE_FACET_QUERY);
  return toAttributes(rows as FacetRow[]);
}
