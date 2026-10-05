import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The category, search and all-products pages used to pass `showAddToCart={true}` and the collection
 * stack `showAddToCart={false}`. The decision belongs to ProductList (theme-lab FINDINGS #49), so one
 * override of that component changes it everywhere. This keeps them from taking the decision back.
 */
const seen: Array<Record<string, unknown>> = [];
jest.unstable_mockModule('@components/frontStore/catalog/ProductList.js', () => ({
  ProductList: (props: Record<string, unknown>) => {
    seen.push(props);
    return null;
  }
}));
jest.unstable_mockModule('@components/frontStore/catalog/CategoryContext.js', () => ({
  useCategory: () => ({ showProducts: true, products: { items: [], total: 0 } })
}));
jest.unstable_mockModule('@components/frontStore/catalog/SearchContext.js', () => ({
  useSearch: () => ({ products: { items: [] } })
}));
jest.unstable_mockModule('@components/frontStore/catalog/ProductListingContext.js', () => ({
  useProductListing: () => ({ products: { items: [], total: 0 } })
}));
jest.unstable_mockModule('@components/common/Area.js', () => ({ default: () => null }));
jest.unstable_mockModule('@components/common/index.js', () => ({ Area: () => null }));
jest.unstable_mockModule('@components/common/page-builder/index.js', () => ({
  Editable: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  isPageBuilderActive: () => false
}));

const { CategoryProducts } = await import('../../CategoryProducts.js');
const { SearchProducts } = await import('../../SearchProducts.js');
const { ProductListingProducts } = await import('../../ProductListingProducts.js');
const { default: CollectionStack } = await import('../../../../../modules/catalog/components/CollectionStack.js');

const stackRow = { id: 'row-1', title: 'New arrivals', source: 'new', products: [] };
const Stack = () => (
  <CollectionStack collectionStackWidget={{ rows: [stackRow], productCount: 4, countPerRow: 4, divider: false }} />
);

describe('who decides "Add to Cart"', () => {
  it.each([
    ['the category page', CategoryProducts],
    ['the search page', SearchProducts],
    ['the all-products page', ProductListingProducts],
    ['the collection stack widget', Stack]
  ] as Array<[string, React.ComponentType]>)('%s leaves it to ProductList', (_name, Page) => {
    seen.length = 0;
    renderToStaticMarkup(<Page />);
    expect(seen).toHaveLength(1);
    expect('showAddToCart' in seen[0]).toBe(false);
  });
});
