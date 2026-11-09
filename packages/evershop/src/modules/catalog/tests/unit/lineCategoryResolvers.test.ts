import { describe, it, expect, beforeEach } from '@jest/globals';
import resolvers from '../../graphql/types/LineCategory/LineCategory.resolvers.js';

/**
 * CartItem.category and OrderItem.category: the product's category on a
 * cart or order line, for GA4's item_category on every ecommerce event. A
 * cart line already has the product's category id; an order line looks the
 * product up. Null when there is none, over a stand-in pool.
 */
const products: Record<string, { category_id: number | null }> = {
  12: { category_id: 7 },
  13: { category_id: null },
  14: { category_id: 8 } // a category that was deleted
};
const categories: Record<string, Record<string, unknown>> = {
  7: { category_id: 7, uuid: 'c-7', status: 1, name: 'Shirts', url_key: 'shirts' }
};
const queries: string[] = [];
const pool = {
  async query(q: { text: string; values?: unknown[] }) {
    queries.push(q.text);
    const [id] = q.values ?? [];
    if (/FROM "product"/.test(q.text)) {
      return { rows: products[String(id)] ? [products[String(id)]] : [] };
    }
    if (/FROM "category"/.test(q.text)) {
      return { rows: categories[String(id)] ? [categories[String(id)]] : [] };
    }
    throw new Error(`unexpected query ${q.text}`);
  },
  release() {}
} as never;
const context = { pool };
const shirts = { categoryId: 7, uuid: 'c-7', status: 1, name: 'Shirts', urlKey: 'shirts' };

describe("a cart or order line's category", () => {
  beforeEach(() => {
    queries.length = 0;
  });

  it("a cart line: from the category id it has, one query", async () => {
    expect(await resolvers.CartItem.category({ categoryId: 7, productId: 12 }, {}, context)).toEqual(shirts);
    expect(queries).toHaveLength(1);
  });

  it('a cart line without a category, or one that was deleted: null', async () => {
    expect(await resolvers.CartItem.category({ categoryId: null, productId: 13 }, {}, context)).toBeNull();
    expect(queries).toHaveLength(0);
    expect(await resolvers.CartItem.category({ categoryId: 8, productId: 14 }, {}, context)).toBeNull();
  });

  it('a cart line without the field (an older cart object): through its product', async () => {
    expect(await resolvers.CartItem.category({ productId: 12 }, {}, context)).toEqual(shirts);
  });

  it("an order line: the product's category now", async () => {
    expect(await resolvers.OrderItem.category({ productId: 12 }, {}, context)).toEqual(shirts);
    expect(queries[0]).toMatch(/FROM "product"/);
  });

  it('an order line whose product was deleted, or has no category: null', async () => {
    expect(await resolvers.OrderItem.category({ productId: 99 }, {}, context)).toBeNull();
    expect(await resolvers.OrderItem.category({ productId: 13 }, {}, context)).toBeNull();
    expect(await resolvers.OrderItem.category({ productId: 14 }, {}, context)).toBeNull();
  });
});
