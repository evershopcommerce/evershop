import { pool } from '../../../lib/postgres/connection.js';

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
 */
export const getFilterableAttributes = async (categoryId) => {
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
      product_attribute_value_index.option_id,
      product_attribute_value_index.option_text
    ORDER BY attribute.attribute_id, product_attribute_value_index.option_id`,
    [categoryIds]
  );

  const attributesById = new Map();
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
};
