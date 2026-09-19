import { describe, it, expect } from '@jest/globals';
import { select } from '@evershop/postgres-query-builder';

/**
 * `SelectQuery.pruneUnreferencedLeftJoins()`, used by `ProductCollection` on its
 * COUNT clone.
 *
 * The planner cannot do this itself for every join: it removes the
 * `product_description` LEFT JOIN because a unique index proves no fan-out, but
 * it keeps `product_image`, where no unique index covers the join key and
 * `AND is_main` is not something it can use to prove uniqueness. Measured on a
 * 300k-product catalog: 50.7ms with that join, 26.5ms without, same answer.
 */

/** The shape `getProductsBaseQuery()` builds. */
function productBaseQuery() {
  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );
  query
    .innerJoin('product_inventory')
    .on(
      'product_inventory.product_inventory_product_id',
      '=',
      'product.product_id'
    );
  query
    .leftJoin('product_image')
    .on('product_image.product_image_product_id', '=', 'product.product_id')
    .and('product_image.is_main', '=', true);
  return query;
}

const flat = (sql: string) => sql.replace(/\s+/g, ' ');

describe('pruneUnreferencedLeftJoins', () => {
  it('drops LEFT JOINs nothing references', async () => {
    const query = productBaseQuery();
    query.select('COUNT(product.product_id)', 'total');
    query.pruneUnreferencedLeftJoins();
    const sql = flat(await query.sql());
    expect(sql).not.toContain('product_image');
    expect(sql).not.toContain('product_description');
  });

  it('never drops an INNER JOIN, which filters rows', async () => {
    const query = productBaseQuery();
    query.select('COUNT(product.product_id)', 'total');
    query.pruneUnreferencedLeftJoins();
    expect(flat(await query.sql())).toContain('product_inventory');
  });

  it('keeps a LEFT JOIN referenced from the WHERE', async () => {
    // getProductsByCollectionBaseQuery does exactly this: LEFT JOIN
    // product_collection, then pin collection_id in the WHERE.
    const query = select().from('product');
    query
      .leftJoin('product_collection')
      .on('product_collection.product_id', '=', 'product.product_id');
    query.andWhere('product_collection.collection_id', '=', 7);
    query.pruneUnreferencedLeftJoins();
    expect(flat(await query.sql())).toContain('product_collection');
  });

  it('keeps a LEFT JOIN referenced from another join’s ON clause', async () => {
    const query = select().from('product');
    query
      .leftJoin('product_description')
      .on(
        'product_description.product_description_product_id',
        '=',
        'product.product_id'
      );
    query
      .leftJoin('product_translation')
      .on(
        'product_translation.description_id',
        '=',
        'product_description.product_description_id'
      );
    query.pruneUnreferencedLeftJoins();
    expect(flat(await query.sql())).toContain('product_description');
  });

  it('keeps a LEFT JOIN referenced from an ORDER BY', async () => {
    const query = productBaseQuery();
    query.orderBy('product_description.name', 'ASC');
    query.pruneUnreferencedLeftJoins();
    expect(flat(await query.sql())).toContain('product_description');
  });

  it('keeps a LEFT JOIN referenced from unquoted raw SQL', async () => {
    // addRaw fragments are written by hand, so the reference may be unquoted.
    const query = productBaseQuery();
    query
      .getWhere()
      .addRaw('AND', 'product_image.origin_image IS NOT NULL', {});
    query.pruneUnreferencedLeftJoins();
    expect(flat(await query.sql())).toContain('product_image');
  });

  it('leaves bindings aligned with the placeholders that survive', async () => {
    // execute() pushes one value per binding key whether or not its placeholder
    // is still in the SQL, so a binding leaked from a dropped join would shift
    // every parameter after it. `product_image`'s ON carries `is_main = true`.
    const query = productBaseQuery();
    query.select('COUNT(product.product_id)', 'total');
    query.andWhere('product.status', '=', 1);
    query.pruneUnreferencedLeftJoins();
    const sql = await query.sql();
    const placeholders = sql.match(/:[a-z0-9]+/gi) || [];
    expect(Object.keys(query.getBinding())).toHaveLength(placeholders.length);
    expect(placeholders).toHaveLength(1);
  });

  it('is a no-op on a query with no joins', async () => {
    const query = select().from('product');
    query.andWhere('product.status', '=', 1);
    const before = await query.sql();
    query.pruneUnreferencedLeftJoins();
    expect(await query.sql()).toEqual(before);
  });
});
