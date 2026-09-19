import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../../../../components/common/context/app.js';
import {
  ProductListingData,
  ProductListingProvider
} from '../../../../components/frontStore/catalog/ProductListingContext.js';
import ProductListingFilter, {
  layout as filterLayout
} from '../../pages/frontStore/productListing/ProductListingFilter.js';
import ProductListingPage from '../../pages/frontStore/productListing/ProductListingPage.js';
import ProductListingInfo, {
  layout as infoLayout
} from '../../pages/frontStore/productListing/ProductListingInfo.js';
import ProductListingPagination, {
  layout as paginationLayout
} from '../../pages/frontStore/productListing/ProductListingPagination.js';
import ProductListingProducts, {
  layout as productsLayout
} from '../../pages/frontStore/productListing/ProductListingProducts.js';
import ProductListingSorting, {
  layout as sortingLayout
} from '../../pages/frontStore/productListing/ProductListingSorting.js';

// The all-products shell (ProductListingPage.tsx) owns the query, the provider
// and the Areas; these blocks register into those slots so `themes/<id>/
// layouts.json` can move them without a fork of the shell.
const listing = {
  products: { items: [], total: 3, currentFilters: [] },
  availableAttributes: [],
  priceRange: { min: 0, max: 100, minText: '$0.00', maxText: '$100.00' },
  categories: []
} as unknown as ProductListingData;

// `propsMap` and `graphqlResponse` are always set by the page response
// middleware in production; Area reads `propsMap[componentId]` unguarded, and
// the filter sidebar renders its sections through Area's `coreComponents`.
const appState = {
  config: { pageMeta: { route: { id: 'productListing' } } },
  graphqlResponse: {},
  propsMap: {},
  widgets: []
} as unknown as React.ComponentProps<typeof AppProvider>['value'];

const inShell = (el: React.ReactElement) =>
  renderToStaticMarkup(
    <AppProvider value={appState}>
      <ProductListingProvider listing={listing}>{el}</ProductListingProvider>
    </AppProvider>
  );
const outsideShell = (el: React.ReactElement) =>
  renderToStaticMarkup(<AppProvider value={appState}>{el}</AppProvider>);

describe('all-products page blocks', () => {
  it('keep the slots the shell documents, mirroring the category page ordering', () => {
    expect(infoLayout).toEqual({
      areaId: 'productListingPageTop',
      sortOrder: 10
    });
    expect(filterLayout).toEqual({
      areaId: 'productListingLeftColumn',
      sortOrder: 10
    });
    expect(sortingLayout).toEqual({
      areaId: 'productListingRightColumn',
      sortOrder: 10
    });
    expect(productsLayout).toEqual({
      areaId: 'productListingRightColumn',
      sortOrder: 20
    });
    expect(paginationLayout).toEqual({
      areaId: 'productListingRightColumn',
      sortOrder: 30
    });
  });

  it('render from the listing context, without props', () => {
    const info = inShell(<ProductListingInfo />);
    expect(info).toContain('product__listing__general');
    expect(info).toContain('All products');

    const products = inShell(<ProductListingProducts />);
    expect(products).toContain('product__listing__products__before');

    expect(inShell(<ProductListingSorting />).length).toBeGreaterThan(0);
    expect(() => inShell(<ProductListingFilter />)).not.toThrow();
    expect(() => inShell(<ProductListingPagination />)).not.toThrow();
  });

  it('throw outside the shell, so a wrong layouts.json placement fails loudly for the developer', () => {
    for (const el of [
      <ProductListingInfo />,
      <ProductListingFilter />,
      <ProductListingSorting />,
      <ProductListingProducts />,
      <ProductListingPagination />
    ]) {
      expect(() => outsideShell(el)).toThrow(
        'within a ProductListingProvider'
      );
    }
  });

  it('opens every slot to the page builder', () => {
    // `editableInPageBuilder` is off by default so layout-only Areas cannot be
    // edited by accident. All four of this shell's slots are places a merchant
    // would reasonably drop a widget, so all four opt in — and none may use
    // `noOuter`, because the marker lands on the wrapper element.
    const html = renderToStaticMarkup(
      <AppProvider value={appState}>
        <ProductListingPage listing={listing} />
      </AppProvider>
    );
    const editable = [
      ...html.matchAll(/data-evershop-area-id="([^"]+)"/g)
    ].map((m) => m[1]);
    expect(editable.sort()).toEqual([
      'productListingLeftColumn',
      'productListingPageBottom',
      'productListingPageTop',
      'productListingRightColumn'
    ]);
    expect(
      html.match(/data-evershop-editable-area="true"/g)
    ).toHaveLength(4);
  });
});
