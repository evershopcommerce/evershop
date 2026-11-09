import { jest, describe, it, expect } from '@jest/globals';

/**
 * The page queries of the commerce event components ask only for fields
 * the storefront schema has (`.admin.graphql` files are not part of it).
 * A wrong field would empty the page's data at runtime, not fail a build.
 * The order query also needs `Order.placedAt`.
 */
jest.unstable_mockModule('../../../../bin/extension/index.js', () => ({
  getEnabledExtensions: () => []
}));

const { buildASTSchema, parse, validate } = await import('graphql');
const { buildTypeDefs } = await import('../../../graphql/services/buildTypes.js');
const productViewed = await import(
  '../../../catalog/pages/frontStore/productView/ProductViewedEvent.js'
);
const productView = await import(
  '../../../catalog/pages/frontStore/productView/ProductView.js'
);
const checkoutCompleted = await import(
  '../../pages/frontStore/checkoutSuccess/CheckoutCompletedEvent.js'
);
const base = await import('../../../base/pages/frontStore/all/Base.js');

const schema = buildASTSchema(buildTypeDefs(false));

/** The page query as the server runs it: context values become literals */
const errorsOf = (query: string) =>
  validate(
    schema,
    parse(query.replace(/getContextValue\([^)]*\)/g, '"a-uuid"'))
  ).map((e) => e.message);

describe('commerce event page queries', () => {
  it('a known-good page query validates (the check works)', () => {
    expect(errorsOf(productView.query)).toEqual([]);
    expect(errorsOf('query { currentProduct { noSuchField } }')).not.toEqual([]);
  });

  it('product_viewed asks for storefront fields only', () => {
    expect(errorsOf(productViewed.query)).toEqual([]);
  });

  it('checkout_completed asks for storefront fields only, placedAt included', () => {
    expect(errorsOf(checkoutCompleted.query)).toEqual([]);
    expect(checkoutCompleted.query).toContain('placedAt');
  });

  it("the cart and order lines' category (GA4 item_category on every event) is in both schemas", () => {
    const lines = 'query { myCart { items { category { name } } } order(uuid: "a-uuid") { items { category { name } } } }';
    expect(errorsOf(lines)).toEqual([]);
    expect(validate(buildASTSchema(buildTypeDefs(true)), parse(lines))).toEqual([]);
    // Only the lines have a category field: the query validates, so it asks the lines
    expect(checkoutCompleted.query).toMatch(/category \{\s*name\s*\}/);
  });

  it("the page's cart query (Base.tsx, which the cart also refetches with) asks for the lines' category", () => {
    // Only errors about the category: the query asks for two fields the
    // schema no longer has (Customer.groupId, ShoppingCart.shippingMethod),
    // which a page query does not validate
    const aboutCategory = (query: string) => errorsOf(query).filter((e) => /category/i.test(e));
    expect(aboutCategory('query { myCart { category { name } } }')).not.toEqual([]);
    expect(aboutCategory(`${base.query}\n${base.fragments}`)).toEqual([]);
    expect(base.query).toMatch(/category \{\s*name\s*\}/);
  });
});
