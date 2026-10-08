import { useProductListing } from '@components/frontStore/catalog/ProductListingContext.js';
import { ProductSorting } from '@components/frontStore/catalog/ProductSorting.js';
import React from 'react';

/**
 * All-products page block: the sort control with the product count. Uses the
 * same `ProductSorting` as the category page — it takes the count as a prop and
 * reads nothing from a category. It reads `ProductListingProvider`, so it must
 * stay inside the shell's Areas.
 */
export default function ProductListingSortingBlock(): React.ReactElement {
  const { products } = useProductListing();
  return (
    <ProductSorting className="flex justify-start" count={products.total} />
  );
}

export const layout = {
  areaId: 'productListingRightColumn',
  sortOrder: 10
};
