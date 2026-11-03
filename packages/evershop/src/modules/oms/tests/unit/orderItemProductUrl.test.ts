import resolvers from '../../graphql/types/Order/Order.resolvers.js';

const PRODUCT_UUID = '0c343ddf-617f-439d-ac3a-75a6b6f59e63';

/**
 * Answers the resolver's two queries: the product row, then its url_rewrite.
 * The real query builder and getProductUrls run against it.
 */
function makePool(product: any, rewrites: any[]) {
  const calls: any[] = [];
  return {
    calls,
    async query(q: any) {
      calls.push(q);
      const text = typeof q === 'string' ? q : q.text;
      return { rows: /url_rewrite/.test(text) ? rewrites : product ? [product] : [] };
    },
    release() {
      // nothing to release
    }
  };
}

const productUrl = (pool: any) =>
  (resolvers as any).OrderItem.productUrl({ productId: 16 }, {}, { pool });

describe('OrderItem.productUrl', () => {
  it("is the product's page in the store, never the admin edit page", async () => {
    const pool = makePool({ product_id: 16, uuid: PRODUCT_UUID }, [
      { entity_uuid: PRODUCT_UUID, request_path: '/accessories/linen-tote' }
    ]);
    const url = await productUrl(pool);
    expect(url).toBe('/accessories/linen-tote');
    expect(url).not.toContain('/admin/');
    expect(pool.calls[1].values[1]).toEqual([PRODUCT_UUID]);
  });

  it('is null when the product was deleted', async () => {
    const pool = makePool(null, []);
    expect(await productUrl(pool)).toBeNull();
    expect(pool.calls).toHaveLength(1);
  });
});
