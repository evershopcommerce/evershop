import { ProductListingProducts } from '@components/frontStore/catalog/ProductListingProducts.js';
import React from 'react';

/**
 * All-products page block: the product grid (with its before/after Areas). A
 * page component rather than markup inside the `ProductListingPage` shell so a
 * theme can move it from `layouts.json`; it reads `ProductListingProvider`, so
 * it must stay inside the shell's Areas.
 */
export default function ProductListingProductsBlock(): React.ReactElement {
  return <ProductListingProducts />;
}

export const layout = {
  areaId: 'productListingRightColumn',
  sortOrder: 20
};
