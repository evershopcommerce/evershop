import { ProductListingInfo } from '@components/frontStore/catalog/ProductListingInfo.js';
import React from 'react';

/**
 * All-products page block: the heading. A page component rather than markup
 * inside the `ProductListingPage` shell so a theme can move it from
 * `layouts.json`; it reads `ProductListingProvider`, so it must stay inside the
 * shell's Areas.
 */
export default function ProductListingInfoBlock(): React.ReactElement {
  return <ProductListingInfo />;
}

export const layout = {
  areaId: 'productListingPageTop',
  sortOrder: 10
};
