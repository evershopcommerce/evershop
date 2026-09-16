import { ProductListingFilter } from '@components/frontStore/catalog/ProductListingFilter.js';
import React from 'react';

/**
 * All-products page block: the filter sidebar. A page component rather than
 * markup inside the `ProductListingPage` shell so a theme can move it from
 * `layouts.json`; it reads `ProductListingProvider`, so it must stay inside the
 * shell's Areas.
 */
export default function ProductListingFilterBlock(): React.ReactElement {
  return <ProductListingFilter />;
}

export const layout = {
  areaId: 'productListingLeftColumn',
  sortOrder: 10
};
