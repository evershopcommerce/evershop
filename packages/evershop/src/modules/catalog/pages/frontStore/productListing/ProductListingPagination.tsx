import { ProductListingPagination } from '@components/frontStore/catalog/ProductListingPagination.js';
import React from 'react';

/**
 * All-products page block: the pagination. A page component rather than markup
 * inside the `ProductListingPage` shell so a theme can move it from
 * `layouts.json`; it reads `ProductListingProvider`, so it must stay inside the
 * shell's Areas.
 */
export default function ProductListingPaginationBlock(): React.ReactElement {
  return <ProductListingPagination />;
}

export const layout = {
  areaId: 'productListingRightColumn',
  sortOrder: 30
};
